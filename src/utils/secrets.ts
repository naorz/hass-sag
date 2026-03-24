import { fs } from 'zx'
import { join as pathJoin } from 'node:path'
import { cli } from './cli'

const ENV_FILE = pathJoin(process.cwd(), '.env')
const GITIGNORE_FILE = pathJoin(process.cwd(), '.gitignore')

let cachedToken: string | undefined
let cachedZoneId: string | undefined
let cachedAccountId: string | undefined

// Parse a .env file and return key→value map (ignores comments and blank lines)
function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed
      .slice(eqIdx + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
    if (key) result[key] = value
  }
  return result
}

// Read a specific key from the .env file in CWD
function readFromEnvFile(key: string): string | undefined {
  try {
    if (!fs.existsSync(ENV_FILE)) return undefined
    const content = fs.readFileSync(ENV_FILE, 'utf-8')
    return parseEnvFile(content)[key]
  } catch {
    return undefined
  }
}

// Ensure .gitignore contains .env entry
async function ensureGitignoreHasEnv(): Promise<void> {
  try {
    let content = ''
    if (fs.existsSync(GITIGNORE_FILE)) {
      content = await fs.readFile(GITIGNORE_FILE, 'utf-8')
      if (content.split('\n').some((l) => l.trim() === '.env')) return
    }
    await fs.writeFile(GITIGNORE_FILE, content + (content.endsWith('\n') ? '' : '\n') + '.env\n')
    cli.printInfo('[Security] Added .env to .gitignore to prevent accidental commit.')
  } catch {
    cli.printWarning(
      '[Security] Could not update .gitignore. Make sure .env is in your .gitignore.',
    )
  }
}

// Write or update a single key in the .env file
async function writeToEnvFile(key: string, value: string): Promise<void> {
  await ensureGitignoreHasEnv()

  let content = ''
  if (fs.existsSync(ENV_FILE)) {
    content = await fs.readFile(ENV_FILE, 'utf-8')
  }

  const lines = content.split('\n')
  const keyPrefix = `${key}=`
  const existingIdx = lines.findIndex((l) => l.startsWith(keyPrefix))

  if (existingIdx !== -1) {
    lines[existingIdx] = `${key}=${value}`
  } else {
    if (content && !content.endsWith('\n')) content += '\n'
    lines.push(`${key}=${value}`)
  }

  await fs.writeFile(ENV_FILE, lines.join('\n').trimEnd() + '\n')
  cli.printSuccess(`[Security] Token saved to .env (gitignored).`)
}

// Core resolution: env var → .env file → prompt
async function resolveSecret(opts: {
  envKey: string
  label: string
  why: string
  howToGenerate: string
  prompt: boolean
  cached: string | undefined
  isSecret: boolean
}): Promise<string | undefined> {
  if (opts.cached) return opts.cached

  // 1. Check process env
  const envValue = process.env[opts.envKey]
  if (envValue) {
    cli.printInfo(`[CF] Token detected under ${opts.envKey} ✓`)
    return envValue
  }

  // 2. Check .env file
  const fileValue = readFromEnvFile(opts.envKey)
  if (fileValue) {
    cli.printInfo(`[CF] Token detected under ${opts.envKey} (from .env) ✓`)
    return fileValue
  }

  if (!opts.prompt) return undefined

  // 3. Interactive prompt with context
  cli.printInfo(`\n[CF] ${opts.label} not found.`)
  cli.printInfo(`Why needed: ${opts.why}`)
  cli.printInfo(`How to generate: ${opts.howToGenerate}`)
  cli.printInfo(`Note: this value is only used locally — it is never sent anywhere by this tool.\n`)

  const value = opts.isSecret
    ? await cli.password(`Enter ${opts.label} (leave empty to skip)`)
    : await cli.ask(`Enter ${opts.label} (leave empty to skip)`)

  if (!value.trim()) {
    cli.printInfo(`[CF] ${opts.label} not provided — skipping.`)
    return undefined
  }
  // Strip newlines to prevent injection of extra keys into the .env file
  // (terminal paste events can embed newline characters in the pasted text)
  const trimmed = value.trim().replace(/[\r\n]/g, '')

  // 4. Offer to persist
  const save = await cli.confirm(
    `Save to .env for future runs?\n  (Stored locally in .env only — never uploaded, auto-added to .gitignore)`,
    false,
  )
  if (save) {
    await writeToEnvFile(opts.envKey, trimmed)
  } else {
    cli.printInfo('[CF] Kept in memory for this session only — will not persist after exit.')
  }

  return trimmed
}

export const secrets = {
  async getApiToken(prompt = true): Promise<string | undefined> {
    if (cachedToken) return cachedToken

    cachedToken = await resolveSecret({
      envKey: 'SAG_CF_API_TOKEN',
      label: 'Cloudflare API Token',
      why: 'Automates certificate upload, WAF rule management, and zone settings via CF API',
      howToGenerate:
        'Cloudflare Dashboard → My Profile → API Tokens → Create Token\n  Required scopes: Zone:Edit, SSL and Certificates:Edit, Firewall Services:Edit',
      prompt,
      cached: undefined,
      isSecret: true,
    })

    return cachedToken
  },

  async getZoneId(prompt = true): Promise<string | undefined> {
    if (cachedZoneId) return cachedZoneId

    const raw = await resolveSecret({
      envKey: 'SAG_CF_ZONE_ID',
      label: 'Cloudflare Zone ID',
      why: 'Identifies which Cloudflare zone (domain) to manage',
      howToGenerate:
        'Cloudflare Dashboard → select your domain → Overview → Zone ID (right sidebar)\n  Zone ID is a 32-character hex string (e.g. 023e105f4ecef8ad9ca31a8372d0c353)',
      prompt,
      cached: undefined,
      isSecret: false,
    })

    if (raw && !/^[0-9a-f]{32}$/i.test(raw)) {
      cli.printError(
        `Invalid Zone ID: "${raw}"\n  Zone ID must be a 32-character hex string (e.g. 023e105f4ecef8ad9ca31a8372d0c353).\n  Find it: Cloudflare Dashboard → select your domain → Overview → right sidebar.`,
      )
      return undefined
    }

    cachedZoneId = raw
    return cachedZoneId
  },

  async getAccountId(prompt = true): Promise<string | undefined> {
    if (cachedAccountId) return cachedAccountId

    cachedAccountId = await resolveSecret({
      envKey: 'SAG_CF_ACCOUNT_ID',
      label: 'Cloudflare Account ID',
      why: 'Required for CF Access and zero-trust features (certificate distribution)',
      howToGenerate:
        'Cloudflare Dashboard → select your domain → Overview → Account ID (right sidebar)',
      prompt,
      cached: undefined,
      isSecret: false,
    })

    return cachedAccountId
  },

  hasApiToken(): boolean {
    return !!(cachedToken || process.env['SAG_CF_API_TOKEN'] || readFromEnvFile('SAG_CF_API_TOKEN'))
  },

  clearCache() {
    cachedToken = undefined
    cachedZoneId = undefined
    cachedAccountId = undefined
  },
}
