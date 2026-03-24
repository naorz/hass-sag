import { fs } from 'zx'
import { cli } from './cli'
import { GeneratorConfigSchema, type GeneratorConfig } from '@sag/schemas'
import { join } from 'node:path'

const CONFIG_FILE = join(process.cwd(), '.sag-config.json')

export const configStore = {
  async load(): Promise<Partial<GeneratorConfig>> {
    if (!fs.existsSync(CONFIG_FILE)) return {}

    try {
      const content = await fs.readFile(CONFIG_FILE, 'utf-8')
      const raw = JSON.parse(content)
      const result = GeneratorConfigSchema.partial().safeParse(raw)

      if (!result.success) {
        cli.printWarning(
          `Config file has invalid entries: ${result.error.issues.map((i) => i.message).join(', ')}`,
        )
        return raw as Partial<GeneratorConfig>
      }

      return result.data
    } catch {
      cli.printWarning('Failed to load config file')
      return {}
    }
  },

  async save(config: Partial<GeneratorConfig>): Promise<void> {
    try {
      const toSave = {
        workDir: config.workDir,
        domain: config.domain,
        haSubdomain: config.haSubdomain,
        portalSubdomain: config.portalSubdomain,
        subdomains: config.subdomains,
        certStrategy: config.certStrategy,
        platforms: config.platforms,
        cloudflare: config.cloudflare,
        distribution: config.distribution,
        family: config.family,
      }

      // Remove undefined keys
      const cleaned = Object.fromEntries(Object.entries(toSave).filter(([, v]) => v !== undefined))

      await fs.writeFile(CONFIG_FILE, JSON.stringify(cleaned, null, 2))
    } catch (e) {
      cli.printError(`Failed to save config file: ${e}`)
    }
  },
}
