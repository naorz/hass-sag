import { cli, network, configStore, secrets, isValidCfId } from '@sag/utils'
import { Menu } from '@sag/menu'
import {
  registerGithubSshMenu,
  registerMtlsMenu,
  registerPortalMenu,
  registerCertInstallMenu,
  registerWafMenu,
  registerHassVerifyMenu,
  registerStatusMenu,
  registerCertRotateMenu,
  registerTokenMenu,
  createWizardTopic,
} from '@sag/topics'
import {
  cfApi,
  CfCertificateManager,
  CfWafRuleManager,
  CfZoneSettingsManager,
} from '@sag/providers'
import { GeneratorConfigSchema } from '@sag/shared/schemas'
import { type GeneratorConfig, type Requirement } from '@sag/types'

async function main() {
  cli.printHeader('Secure Infrastructure Tool')

  const defaults = GeneratorConfigSchema.parse({})
  const config: GeneratorConfig = { ...defaults }

  // Load persistent config
  const persistent = await configStore.load()
  Object.assign(config, persistent)

  // Auto-configure CF API if credentials already exist (env vars / .env / saved config)
  // Validate stored zone ID — reject non-hex values silently and fall through to .env
  if (config.cloudflare?.zoneId && !isValidCfId(config.cloudflare.zoneId)) {
    cli.printWarning(
      `Stored Zone ID "${config.cloudflare.zoneId}" is invalid (must be 32-char hex). Ignoring it.`,
    )
    delete config.cloudflare.zoneId
    await configStore.save(config)
  }

  const existingToken = await secrets.getApiToken(false)
  if (existingToken) {
    const zoneId = config.cloudflare?.zoneId || (await secrets.getZoneId(false))
    if (zoneId) {
      const accountId = config.cloudflare?.accountId || (await secrets.getAccountId(false))
      cfApi.configure(existingToken, zoneId, accountId)
    }
  }

  const menu = new Menu('Select Operation')

  // Common config requirements
  const setupCommonRequirement: Requirement = {
    id: 'common-config',
    check: (conf: GeneratorConfig) => !!(conf.workDir && conf.domain),
    action: async (conf: GeneratorConfig) => {
      conf.workDir = await cli.ask('Working directory', conf.workDir || 'dist')

      while (true) {
        const input = await cli.ask('Domain (e.g. example.com)', conf.domain || '')
        const cleaned = network.cleanDomain(input)

        if (network.validateDomain(cleaned)) {
          conf.domain = cleaned
          break
        }
        cli.printError('Invalid domain. Please enter a valid domain (e.g., example.com)')
      }

      cli.printInfo(
        `If Subdomain is left empty, a wildcard certificate (*.${conf.domain}) will be used.`,
      )
      conf.haSubdomain = await cli.ask('Subdomain (e.g. ha)', conf.haSubdomain || '')

      await configStore.save(conf)
    },
  }

  const commonRequirements = [setupCommonRequirement]

  // CF API requirement — prompts for token if not set
  const cfApiRequirement: Requirement = {
    id: 'cf-api',
    check: () => cfApi.isConfigured(),
    action: async (conf: GeneratorConfig) => {
      const token = await secrets.getApiToken()
      if (!token) {
        cli.printWarning('Cloudflare API token is required for this operation.\n')
        cli.printInfo(
          '  Why:  Automates certificate upload, WAF rule management, and zone settings.\n',
        )
        cli.printInfo('  How to get it:')
        cli.printInfo('    1. Go to https://dash.cloudflare.com/profile/api-tokens')
        cli.printInfo('    2. Click "Create Token"')
        cli.printInfo(
          '    3. Required scopes: Zone:Edit, SSL and Certificates:Edit, Firewall Services:Edit\n',
        )
        cli.printInfo('  How to provide it (pick one):')
        cli.printInfo('    • Set env var:  SAG_CF_API_TOKEN=<token> bun run sag')
        cli.printInfo('    • Save to .env: echo "SAG_CF_API_TOKEN=<token>" >> .env')
        cli.printInfo('    • Re-run and enter it when prompted\n')
        return
      }

      const rawZoneId = conf.cloudflare?.zoneId || (await secrets.getZoneId())
      if (!rawZoneId) {
        cli.printWarning('Cloudflare Zone ID is required for this operation.\n')
        cli.printInfo('  Why:  Identifies which Cloudflare zone (domain) to manage.\n')
        cli.printInfo('  How to find it:')
        cli.printInfo('    1. Go to https://dash.cloudflare.com')
        cli.printInfo('    2. Select your domain → Overview page')
        cli.printInfo('    3. Zone ID is in the right sidebar (32-char hex string)\n')
        cli.printInfo('  How to provide it (pick one):')
        cli.printInfo('    • Set env var:  SAG_CF_ZONE_ID=<id> bun run sag')
        cli.printInfo('    • Save to .env: echo "SAG_CF_ZONE_ID=<id>" >> .env')
        cli.printInfo('    • Re-run and enter it when prompted\n')
        return
      }
      if (!isValidCfId(rawZoneId)) {
        cli.printError(
          `Invalid Zone ID: "${rawZoneId}" — must be a 32-char hex string.\n  Run "Manage CF Token → Configure CF Token" to fix it.`,
        )
        return
      }

      const accountId = conf.cloudflare?.accountId || (await secrets.getAccountId(false))
      cfApi.configure(token, rawZoneId, accountId)
    },
  }

  const cfRequirements = [...commonRequirements, cfApiRequirement]

  // === CF Managers ===
  const wafManager = new CfWafRuleManager()
  const settingsManager = new CfZoneSettingsManager()
  const certManager = new CfCertificateManager()

  // === Wizard ===
  const wizardTopic = createWizardTopic(certManager, wafManager, settingsManager)

  // === Menu Registration ===

  // Token management — badge shows token status
  const tokenBadge = () => (cfApi.isConfigured() ? ' [✓ token]' : ' [no token]')
  registerTokenMenu(menu, config, tokenBadge)

  // Config edit — always accessible
  menu.addOption(
    'Configure SAG',
    'configure',
    async (conf) => {
      conf.workDir = await cli.ask('Working directory', conf.workDir || 'sag-output')

      while (true) {
        const input = await cli.ask('Domain (e.g. example.com)', conf.domain || '')
        const cleaned = network.cleanDomain(input)
        if (network.validateDomain(cleaned)) {
          conf.domain = cleaned
          break
        }
        cli.printError('Invalid domain. Please enter a valid domain (e.g., example.com)')
      }

      conf.haSubdomain = await cli.ask(
        'HA subdomain (e.g. ha, leave empty for wildcard)',
        conf.haSubdomain || '',
      )
      conf.portalSubdomain = await cli.ask('Portal subdomain', conf.portalSubdomain || 'setup')

      await configStore.save(conf)
      cli.printSuccess('Configuration saved.')
    },
    config,
    [],
    'Edit domain, subdomain, working directory',
  )

  menu.addSeparator()

  // Wizard — fully automated setup
  menu.addOption(
    'Full Setup Wizard',
    'wizard',
    (conf) => wizardTopic.run(conf),
    config,
    [],
    'Step-by-step guided setup: cert → WAF → portal → verify',
  )

  menu.addSeparator()

  // mTLS & Certificates sub-menu
  const mtlsMenu = menu.createSubMenu(
    'mTLS & Certificates',
    'cat-mtls',
    config,
    'Generate keys, profiles, install and verify certificates',
  )
  registerMtlsMenu(mtlsMenu, config, commonRequirements)
  registerCertInstallMenu(mtlsMenu, config, commonRequirements)
  mtlsMenu.addBackOption()

  // Cloudflare / WAF sub-menu — disabled until CF token is configured, badge shows status
  const cfMenu = menu.createSubMenu(
    'Cloudflare / WAF',
    'cat-cf',
    config,
    'Manage WAF rules, verify HASS config, rotate certificates',
    () => (!cfApi.isConfigured() ? '⚠ Configure CF token first (Manage CF Token)' : false),
    () => (cfApi.isConfigured() ? ' [✓ token]' : ''),
  )
  registerWafMenu(cfMenu, config, wafManager, cfRequirements)
  registerHassVerifyMenu(cfMenu, config, settingsManager, certManager, wafManager, cfRequirements)
  registerCertRotateMenu(cfMenu, config, certManager, cfRequirements)
  cfMenu.addBackOption()

  // Status sub-menu
  const statusMenu = menu.createSubMenu(
    'Status & Diagnostics',
    'cat-status',
    config,
    'Check local certs, CF remote state, and mTLS connection',
  )
  registerStatusMenu(statusMenu, config, certManager, wafManager, commonRequirements)
  statusMenu.addBackOption()

  // Portal & Distribution sub-menu — certManager passed so family management can provision CF certs
  const portalMenu = menu.createSubMenu(
    'Portal & Distribution',
    'cat-portal',
    config,
    'Manage family cert distribution, QR codes, and GitHub SSH',
  )
  registerPortalMenu(portalMenu, config, commonRequirements, certManager)
  registerGithubSshMenu(portalMenu, config)
  portalMenu.addBackOption()

  menu.addSeparator()

  menu.addOption('Exit', 'exit', async () => {}, config)

  await menu.show(config)
}

main().catch((err) => {
  if (err instanceof Error && err.message === 'User force closed the prompt with 0 null') {
    process.exit(0)
  }
  cli.printError(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
