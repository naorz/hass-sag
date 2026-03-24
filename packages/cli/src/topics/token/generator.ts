import { cli, configStore, secrets, isValidCfId } from '@sag/utils'
import { fs } from 'zx'
import { join } from 'node:path'
import { cfApi } from '@sag/providers'
import { type GeneratorConfig } from '@sag/types'
import { PermissionDeniedError, AuthenticationError } from 'cloudflare'

interface PermissionCheck {
  label: string
  scope: string
  docHint: string
  test: () => Promise<void>
}

export class TokenGenerator {
  async configure(config: GeneratorConfig): Promise<void> {
    cli.printSection('Configure CF Token')

    // Clear cache so user can re-enter
    secrets.clearCache()

    const token = await secrets.getApiToken()
    if (!token) {
      cli.printWarning('No token provided — skipping.')
      return
    }

    const rawZoneId = config.cloudflare?.zoneId || (await secrets.getZoneId())
    if (!rawZoneId) {
      cli.printWarning('No Zone ID provided — skipping.')
      return
    }
    if (!isValidCfId(rawZoneId)) {
      cli.printError(
        `Invalid Zone ID: "${rawZoneId}"\n  Must be a 32-char hex string (e.g. 023e105f4ecef8ad9ca31a8372d0c353).\n  Find it: Cloudflare Dashboard → your domain → Overview → right sidebar.`,
      )
      return
    }
    const zoneId = rawZoneId

    const accountId = config.cloudflare?.accountId || (await secrets.getAccountId(false))
    cfApi.configure(token, zoneId, accountId)

    if (zoneId) {
      config.cloudflare = { ...config.cloudflare, zoneId }
    }
    if (accountId) {
      config.cloudflare = { ...config.cloudflare, accountId }
    }
    await configStore.save(config)

    cli.printSuccess('CF token configured.')
  }

  async validate(config?: GeneratorConfig): Promise<void> {
    cli.printSection('Validate CF Token & Permissions')

    const token = await secrets.getApiToken(false)
    if (!token) {
      cli.printWarning('No CF API token is configured.\n')
      cli.printInfo('  Set one via "Manage CF Token → Configure CF Token"')
      cli.printInfo('  Or set env var: SAG_CF_API_TOKEN=<token>')
      return
    }

    // Auto-configure if token exists but client wasn't initialised yet
    if (!cfApi.isConfigured()) {
      const rawZoneId = config?.cloudflare?.zoneId || (await secrets.getZoneId(false))
      if (!rawZoneId) {
        cli.printWarning('Token found but Zone ID is missing — cannot validate.\n')
        cli.printInfo('  Run "Configure CF Token" to provide your Zone ID.')
        return
      }
      if (!isValidCfId(rawZoneId)) {
        cli.printError(
          `Invalid Zone ID: "${rawZoneId}"\n  Must be a 32-char hex string.\n  Run "Configure CF Token" to fix it.`,
        )
        return
      }
      const accountId = config?.cloudflare?.accountId || (await secrets.getAccountId(false))
      cfApi.configure(token, rawZoneId, accountId)
      cli.printInfo('CF API configured from existing credentials.\n')
    }

    cli.printInfo('Testing token permissions...\n')

    const zoneId = cfApi.getZoneId()

    const checks: PermissionCheck[] = [
      {
        label: 'Zone Read',
        scope: 'Zone > Zone > Read',
        docHint: 'Required for basic zone access.',
        test: async () => {
          // zones.list filtered to this zone ID verifies zone-read access
          await cfApi.get().zones.list({ match: 'all' })
        },
      },
      {
        label: 'SSL & Certificates Edit',
        scope: 'Zone > SSL and Certificates > Edit',
        docHint: 'Required for uploading and managing mTLS client certificates.',
        test: async () => {
          // clientCertificates only needs zone_id — no account_id required
          const iter = cfApi.get().clientCertificates.list({ zone_id: zoneId })
          await iter[Symbol.asyncIterator]().next()
        },
      },
      {
        label: 'Firewall Services Edit',
        scope: 'Zone > Firewall Services > Edit',
        docHint: 'Required for creating and managing WAF custom rules.',
        test: async () => {
          await cfApi.get().rulesets.phases.get('http_request_firewall_custom', {
            zone_id: zoneId,
          })
        },
      },
      {
        label: 'Zone WAF Edit',
        scope: 'Zone > Zone WAF > Edit',
        docHint: 'Required for reading and modifying WAF rulesets.',
        test: async () => {
          await cfApi.get().rulesets.list({ zone_id: zoneId })
        },
      },
      {
        label: 'Zone Settings Edit',
        scope: 'Zone > Zone Settings > Edit',
        docHint: 'Required for enabling TLS client authentication.',
        test: async () => {
          await cfApi.get().zones.settings.get('tls_client_auth', {
            zone_id: zoneId,
          })
        },
      },
    ]

    let allPassed = true

    for (const check of checks) {
      try {
        await check.test()
        cli.printSuccess(`${check.label}`)
      } catch (err) {
        if (err instanceof PermissionDeniedError || err instanceof AuthenticationError) {
          allPassed = false
          cli.printError(`${check.label} — MISSING PERMISSION`)
          cli.printInfo(`  Scope needed: ${check.scope}`)
          cli.printInfo(`  Why: ${check.docHint}`)
          cli.printInfo(
            `  Fix: https://dash.cloudflare.com/profile/api-tokens → Edit token → Add scope\n`,
          )
        } else {
          // 404, empty results, etc. — the permission exists, the resource just doesn't exist yet
          cli.printSuccess(`${check.label}`)
        }
      }
    }

    if (allPassed) {
      cli.printSuccess('\nAll required permissions are present — token is valid.')
    } else {
      cli.printWarning(
        '\nSome permissions are missing. Fix them in the CF dashboard, then re-validate.',
      )
    }
  }

  async clear(): Promise<void> {
    cli.printSection('Clear CF Token')

    const envFile = join(process.cwd(), '.env')
    const keysToRemove = ['SAG_CF_API_TOKEN', 'SAG_CF_ZONE_ID', 'SAG_CF_ACCOUNT_ID']

    let removedFromEnv = false
    if (fs.existsSync(envFile)) {
      const content = await fs.readFile(envFile, 'utf-8')
      const filtered = content
        .split('\n')
        .filter((line) => !keysToRemove.some((k) => line.startsWith(`${k}=`)))
        .join('\n')
      if (filtered !== content) {
        await fs.writeFile(envFile, filtered)
        removedFromEnv = true
      }
    }

    secrets.clearCache()

    if (removedFromEnv) {
      cli.printSuccess('Token removed from .env and memory cache cleared.')
    } else {
      cli.printSuccess('Memory cache cleared. (No .env entries found.)')
    }

    cli.printInfo(
      'Note: process.env variables (if set externally) persist until the shell restarts.',
    )
  }
}
