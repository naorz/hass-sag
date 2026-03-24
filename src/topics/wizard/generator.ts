import { cli, fileSystem, ssl, configStore, network, secrets } from '@sag/utils'
import { fs } from 'zx'
import { join as pathJoin } from 'node:path'
import {
  type ICertificateManager,
  type IWafRuleManager,
  type IZoneSettingsManager,
} from '@sag/core'
import { type GeneratorConfig } from '@sag/types'
import { cfApi } from '@sag/providers'
import { dockerComposeTemplate, settingsJsonTemplate } from '../portal/templates'
import { buildDownloadPage } from '../portal/templates/download-page'

export class WizardGenerator {
  constructor(
    private certManager: ICertificateManager,
    private wafManager: IWafRuleManager,
    private settingsManager: IZoneSettingsManager,
  ) {}

  async run(config: GeneratorConfig): Promise<void> {
    cli.printHeader('Full Setup Wizard')
    cli.printInfo('This wizard guides you through the complete end-to-end setup.\n')

    const steps = [
      { label: 'Configure SAG settings', fn: () => this.stepBasicConfig(config) },
      { label: 'Configure Cloudflare API token', fn: () => this.stepCfToken(config) },
      { label: 'Generate & upload mTLS certificate', fn: () => this.stepMtlsCert(config) },
      { label: 'Create WAF rules', fn: () => this.stepWafRules(config) },
      { label: 'Enable TLS client auth zone setting', fn: () => this.stepZoneSettings() },
      { label: 'Generate P12 + Apple Profile', fn: () => this.stepDeviceFiles(config) },
      { label: 'Generate portal', fn: () => this.stepPortal(config) },
    ]

    const completed: string[] = []
    const skipped: string[] = []

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      console.log()
      cli.printSection(`Step ${i + 1}/${steps.length}: ${step.label}`)

      const proceed = await cli.confirm('Run this step?', true)
      if (!proceed) {
        skipped.push(step.label)
        cli.printInfo('Skipped.')
        continue
      }

      try {
        await step.fn()
        completed.push(step.label)
      } catch (err) {
        cli.printError(`Step failed: ${err instanceof Error ? err.message : String(err)}`)
        const cont = await cli.confirm('Continue to next step?', true)
        if (!cont) break
        skipped.push(step.label)
      }
    }

    console.log()
    cli.printHeader('Setup Summary')

    if (completed.length > 0) {
      cli.printSuccess('Completed:')
      completed.forEach((s) => console.log(`  ✓ ${s}`))
    }
    if (skipped.length > 0) {
      cli.printWarning('Skipped / Failed:')
      skipped.forEach((s) => console.log(`  - ${s}`))
    }

    console.log()
    cli.printInfo('Next steps:')
    cli.printInfo(
      '  1. Install the certificate on your device (mTLS & Certificates → Install Certificate)',
    )
    cli.printInfo('  2. Run HASS Verify (Cloudflare / WAF → HASS: Verify CF Configuration)')
    cli.printInfo(
      '  3. Share portal link with family members (Portal & Distribution → Generate QR Code)',
    )
  }

  private async stepBasicConfig(config: GeneratorConfig): Promise<void> {
    if (config.workDir && config.domain) {
      cli.printInfo(`Current: workDir=${config.workDir}, domain=${config.domain}`)
      const change = await cli.confirm('Change these settings?', false)
      if (!change) return
    }

    config.workDir = await cli.ask('Working directory', config.workDir || 'sag-output')

    while (true) {
      const input = await cli.ask('Domain (e.g. example.com)', config.domain || '')
      const cleaned = network.cleanDomain(input)
      if (network.validateDomain(cleaned)) {
        config.domain = cleaned
        break
      }
      cli.printError('Invalid domain. Please enter a valid domain (e.g., example.com)')
    }

    config.haSubdomain = await cli.ask(
      'HA subdomain (e.g. ha, leave empty for wildcard)',
      config.haSubdomain || '',
    )
    config.portalSubdomain = await cli.ask('Portal subdomain', config.portalSubdomain || 'setup')

    await configStore.save(config)
    cli.printSuccess('SAG settings saved.')
  }

  private async stepCfToken(config: GeneratorConfig): Promise<void> {
    if (cfApi.isConfigured()) {
      cli.printInfo('CF token is already configured.')
      const reconfig = await cli.confirm('Re-configure?', false)
      if (!reconfig) return
      secrets.clearCache()
    }

    const token = await secrets.getApiToken()
    if (!token) {
      cli.printWarning('No token provided — CF steps will be skipped.')
      return
    }

    const zoneId = config.cloudflare?.zoneId || (await secrets.getZoneId())
    if (!zoneId) {
      cli.printWarning('No Zone ID — CF steps will be skipped.')
      return
    }

    const accountId = config.cloudflare?.accountId || (await secrets.getAccountId(false))
    cfApi.configure(token, zoneId, accountId)

    config.cloudflare = { zoneId, accountId: accountId ?? config.cloudflare?.accountId }
    await configStore.save(config)

    cli.printSuccess('CF token configured.')
  }

  private async stepMtlsCert(config: GeneratorConfig): Promise<void> {
    const certDir = pathJoin(config.workDir, 'certs')
    await fileSystem.ensureDir(certDir)

    const keyPath = pathJoin(certDir, 'client.key')
    const csrPath = pathJoin(certDir, 'client.csr')
    const pemPath = pathJoin(certDir, 'client.pem')

    const hostname = config.haSubdomain ? `${config.haSubdomain}.${config.domain}` : config.domain

    if (fs.existsSync(pemPath)) {
      cli.printInfo(`Certificate already exists: ${pemPath}`)
      const regen = await cli.confirm('Regenerate certificate?', false)
      if (!regen) return
    }

    cli.printInfo('Generating private key and CSR...')
    await ssl.generateKey(keyPath)
    await ssl.generateCsr(keyPath, csrPath, hostname)

    if (!cfApi.isConfigured()) {
      cli.printInfo('No CF token — manual CSR upload required.')
      const csrContent = await fs.readFile(csrPath, 'utf-8')
      cli.printInfo('\nPaste this CSR into Cloudflare Dashboard → SSL/TLS → Client Certificates:\n')
      console.log(csrContent)
      cli.printInfo(`Save the signed certificate as: ${pemPath}`)
      cli.printInfo(`Add "${hostname}" to the Hosts list in Client Certificates.`)
      cli.printWarning(`Without the Hosts entry, Cloudflare won't request the cert from clients.`)

      while (true) {
        await cli.ask('\nPress Enter when client.pem is saved and Hosts are updated')

        if (!fs.existsSync(pemPath)) {
          cli.printError(`File not found: ${pemPath}`)
          cli.printInfo(
            'Please save the signed certificate from Cloudflare as this file, then try again.',
          )
          continue
        }

        const content = (await fs.readFile(pemPath, 'utf-8')).trim()
        if (
          !content.includes('-----BEGIN CERTIFICATE-----') ||
          !content.includes('-----END CERTIFICATE-----')
        ) {
          cli.printError(`${pemPath} does not look like a valid PEM certificate.`)
          cli.printInfo(
            'Make sure you copied the full certificate text including the BEGIN/END lines.',
          )
          continue
        }

        cli.printSuccess('client.pem verified — valid PEM certificate found.')
        break
      }
      return
    }

    cli.printInfo('Uploading CSR to Cloudflare...')
    const csrContent = await fs.readFile(csrPath, 'utf-8')
    const cert = await this.certManager.uploadCsr(csrContent)
    await fs.writeFile(pemPath, cert.certificate)
    cli.printSuccess(`Certificate issued — ID: ${cert.id}`)

    // Set hostname association
    cli.printInfo(`Setting hostname association for ${hostname}...`)
    try {
      const existing =
        (await (
          this.certManager as { getHostnameAssociations?(): Promise<string[]> }
        ).getHostnameAssociations?.()) ?? []
      if (!existing.includes(hostname)) {
        await (
          this.certManager as { setHostnameAssociations?(h: string[]): Promise<void> }
        ).setHostnameAssociations?.([...existing, hostname])
        cli.printSuccess(`Hostname "${hostname}" added to mTLS hosts.`)
      } else {
        cli.printInfo(`Hostname "${hostname}" is already in mTLS hosts.`)
      }
    } catch {
      cli.printWarning(
        `Could not set hostname association. Add "${hostname}" manually in CF Dashboard → SSL/TLS → Client Certificates → Hosts.`,
      )
    }
  }

  private async stepWafRules(config: GeneratorConfig): Promise<void> {
    if (!cfApi.isConfigured()) {
      cli.printInfo(
        'This step creates WAF firewall rules that block unauthenticated traffic\n' +
          'and allow cert-verified clients to bypass WAF checks.\n' +
          'It requires a CF API token — skipping because none is configured.\n' +
          'You can do this later via: Cloudflare / WAF → Create mTLS Skip Rule / Create Block Rule',
      )
      return
    }

    const hostname = config.haSubdomain ? `${config.haSubdomain}.${config.domain}` : config.domain

    const rules = await this.wafManager.listRules()
    const hasSkipRule = rules.some(
      (r) => r.expression.includes('cf.tls_client_auth.cert_verified') && r.action === 'skip',
    )
    const hasBlockRule = rules.some(
      (r) => r.expression.includes('not cf.tls_client_auth.cert_verified') && r.action === 'block',
    )

    if (hasSkipRule) {
      cli.printInfo('mTLS skip rule already exists.')
    } else {
      const create = await cli.confirm(
        'Create mTLS skip rule (allow cert holders through WAF)?',
        true,
      )
      if (create) {
        await this.wafManager.createRule({
          description: 'mTLS: Skip WAF for verified clients',
          expression: `(cf.tls_client_auth.cert_verified and http.host eq "${hostname}")`,
          action: 'skip',
          enabled: true,
        })
        cli.printSuccess('mTLS skip rule created.')
      }
    }

    if (hasBlockRule) {
      cli.printInfo('Block rule already exists.')
    } else {
      const create = await cli.confirm(
        'Create block rule (reject requests without valid cert)?',
        true,
      )
      if (create) {
        await this.wafManager.createRule({
          description: 'mTLS: Block unverified clients',
          expression: `(not cf.tls_client_auth.cert_verified and http.host eq "${hostname}")`,
          action: 'block',
          enabled: true,
        })
        cli.printSuccess('Block rule created.')
      }
    }
  }

  private async stepZoneSettings(): Promise<void> {
    if (!cfApi.isConfigured()) {
      cli.printInfo(
        'This step enables "TLS Client Authentication" on your Cloudflare zone,\n' +
          'which tells CF to request a client certificate from every visitor.\n' +
          'It requires a CF API token — skipping because none is configured.\n' +
          'You can do this later via: Cloudflare / WAF → Zone Settings',
      )
      return
    }

    cli.printInfo('Enabling TLS client authentication...')
    await this.settingsManager.updateSetting('tls_client_auth', 'on')
    cli.printSuccess('TLS client auth enabled.')
  }

  private async stepDeviceFiles(config: GeneratorConfig): Promise<void> {
    const certDir = pathJoin(config.workDir, 'certs')
    const keyPath = pathJoin(certDir, 'client.key')
    const pemPath = pathJoin(certDir, 'client.pem')
    const p12Path = pathJoin(certDir, 'device-cert.p12')

    if (!fs.existsSync(keyPath) || !fs.existsSync(pemPath)) {
      cli.printError('client.key and client.pem are required. Complete Step 3 first.')
      return
    }

    cli.printInfo('Generating P12 bundle...')
    await ssl.generateP12(p12Path, keyPath, pemPath)
    cli.printSuccess(`P12 saved: ${p12Path}`)
    cli.printInfo(
      'Apple mobileconfig can be generated via mTLS & Certificates → Generate Apple Profile.',
    )
  }

  private async stepPortal(config: GeneratorConfig): Promise<void> {
    const srvDir = pathJoin(config.workDir, 'portal', 'srv')
    const confDir = pathJoin(config.workDir, 'portal', 'conf')
    await fileSystem.ensureDir(srvDir)
    await fileSystem.ensureDir(confDir)

    const certDir = pathJoin(config.workDir, 'certs')
    const composePath = pathJoin(confDir, 'docker-compose.yml')
    const settingsPath = pathJoin(confDir, 'settings.json')

    const dockerCompose = dockerComposeTemplate(srvDir, certDir)
    const settingsJson = settingsJsonTemplate()

    await fileSystem.safeWrite(composePath, dockerCompose)
    await fileSystem.safeWrite(settingsPath, settingsJson)

    const hostname = config.haSubdomain ? `${config.haSubdomain}.${config.domain}` : config.domain
    const hasMobileconfig = fs.existsSync(pathJoin(certDir, 'apple-secure.mobileconfig'))
    const hasP12 = fs.existsSync(pathJoin(certDir, 'device-cert.p12'))

    const html = buildDownloadPage({ domain: config.domain, hostname, hasMobileconfig, hasP12 })
    await fileSystem.safeWrite(pathJoin(srvDir, 'index.html'), html)

    cli.printSuccess('Portal files generated.')
    cli.printInfo(`Run: cd ${confDir} && docker-compose up -d`)
  }
}
