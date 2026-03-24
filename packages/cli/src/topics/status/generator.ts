import { cli, ssl, validateHttpsUrl } from '@sag/utils'
import { $, fs } from 'zx'
import { join as pathJoin } from 'node:path'
import { type ICertificateManager, type IWafRuleManager } from '@sag/shared/core'
import { type GeneratorConfig } from '@sag/types'
import { NotFoundError } from 'cloudflare'

export class StatusGenerator {
  constructor(
    private certManager?: ICertificateManager,
    private wafManager?: IWafRuleManager,
  ) {}

  async localStatus(config: GeneratorConfig): Promise<void> {
    cli.printSection('Local Device Status')

    const certDir = pathJoin(config.workDir, 'certs')
    const files = [
      { name: 'client.key', path: pathJoin(certDir, 'client.key') },
      { name: 'client.pem', path: pathJoin(certDir, 'client.pem') },
      { name: 'device-cert.p12', path: pathJoin(certDir, 'device-cert.p12') },
      { name: 'apple-secure.mobileconfig', path: pathJoin(certDir, 'apple-secure.mobileconfig') },
    ]

    cli.printInfo('Certificate files:')
    for (const file of files) {
      const exists = fs.existsSync(file.path)
      if (exists) {
        cli.printSuccess(`  ${file.name}`)
      } else {
        cli.printWarning(`  ${file.name} — not found`)
      }
    }

    // Check cert expiry
    const pemPath = pathJoin(certDir, 'client.pem')
    if (fs.existsSync(pemPath)) {
      try {
        const result = await $`openssl x509 -enddate -noout -in ${pemPath}`
        const expiryLine = result.toString().trim()
        const expiryDate = expiryLine.replace('notAfter=', '')
        const expiry = new Date(expiryDate)
        const now = new Date()
        const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        console.log()
        if (daysLeft > 30) {
          cli.printSuccess(`Certificate expires: ${expiryDate} (${daysLeft} days)`)
        } else if (daysLeft > 0) {
          cli.printWarning(`Certificate expires: ${expiryDate} (${daysLeft} days — renew soon!)`)
        } else {
          cli.printError(`Certificate EXPIRED: ${expiryDate}`)
        }
      } catch {
        cli.printWarning('Could not read certificate expiry date.')
      }
    }

    // Check keychain (macOS)
    if (process.platform === 'darwin') {
      console.log()
      cli.printInfo('Keychain status:')
      const identities = await ssl.getIdentities(false)
      if (identities.length > 0) {
        for (const id of identities) {
          cli.printSuccess(`  ${id.name} (${id.hash.substring(0, 8)}...)`)
        }
      } else {
        cli.printWarning('  No signing identities found in Keychain.')
      }
    }
  }

  async remoteStatus(_config: GeneratorConfig): Promise<void> {
    cli.printSection('Cloudflare Remote Status')

    if (!this.certManager) {
      cli.printWarning('CF API not configured. Set SAG_CF_API_TOKEN to view remote status.')
      return
    }

    try {
      // List certificates
      cli.printInfo('Client Certificates:')
      const certs = await this.certManager.listCertificates()
      if (certs.length === 0) {
        cli.printWarning('  No client certificates registered.')
      } else {
        for (const cert of certs) {
          const statusIcon = cert.status === 'active' ? '✓' : '✗'
          console.log(
            `  ${statusIcon} ${cert.common_name} — ${cert.status} (expires: ${cert.expires_on})`,
          )
        }
      }
    } catch (err) {
      if (err instanceof NotFoundError || (err instanceof Error && err.message.includes('404'))) {
        cli.printWarning('No client certificates found for this zone.')
        cli.printInfo("  This is normal if you haven't uploaded any certificates yet.")
      } else {
        const msg = err instanceof Error ? err.message : String(err)
        cli.printError(`Failed to fetch certificates: ${msg}`)
        if (msg.includes('object identifier is invalid')) {
          cli.printError(
            '  Your Zone ID appears to be invalid. Check it in Cloudflare Dashboard → Overview → right sidebar.',
          )
        }
      }
    }

    if (this.wafManager) {
      try {
        console.log()
        cli.printInfo('WAF Custom Rules:')
        const rules = await this.wafManager.listRules()
        if (rules.length === 0) {
          cli.printWarning('  No custom WAF rules.')
        } else {
          for (let i = 0; i < rules.length; i++) {
            const rule = rules[i]
            const status = rule.enabled ? '[ON]' : '[OFF]'
            const isMtls = rule.expression.includes('tls_client_auth') ? ' (mTLS)' : ''
            console.log(`  ${i + 1}. ${status} ${rule.description}${isMtls}`)
          }
          cli.printInfo(`  ${rules.length}/5 free tier slots used.`)
        }
      } catch (err) {
        if (err instanceof NotFoundError || (err instanceof Error && err.message.includes('404'))) {
          cli.printWarning('No custom WAF ruleset found for this zone.')
          cli.printInfo("  This is normal if you haven't created any WAF rules yet.")
        } else {
          const msg = err instanceof Error ? err.message : String(err)
          cli.printError(`Failed to fetch WAF rules: ${msg}`)
        }
      }
    }
  }

  async connectionTest(config: GeneratorConfig): Promise<void> {
    cli.printSection('mTLS Connection Test')

    const certDir = pathJoin(config.workDir, 'certs')
    const keyPath = pathJoin(certDir, 'client.key')
    const pemPath = pathJoin(certDir, 'client.pem')

    if (!fs.existsSync(keyPath) || !fs.existsSync(pemPath)) {
      cli.printError('Client key or certificate not found.\n')
      cli.printInfo(`  Expected files:`)
      cli.printInfo(`    ${keyPath}  ${fs.existsSync(keyPath) ? '✓' : '✗ missing'}`)
      cli.printInfo(`    ${pemPath}  ${fs.existsSync(pemPath) ? '✓' : '✗ missing'}`)
      cli.printInfo(`\n  Generate them first: mTLS & Certificates → Generate Identity (Key + CSR)`)
      return
    }

    const defaultUrl = `https://${config.haSubdomain ? `${config.haSubdomain}.` : ''}${config.domain}`
    const targetUrl = await cli.ask('URL to test', defaultUrl)

    try {
      validateHttpsUrl(targetUrl)
    } catch (err) {
      cli.printError(`Invalid URL: ${err instanceof Error ? err.message : String(err)}`)
      return
    }

    // Test 1: WITH mTLS certificate — should return 200
    cli.printInfo(`\n1. Testing WITH client certificate (should return 200)...`)
    cli.printInfo(`   curl --cert client.pem --key client.key ${targetUrl}\n`)

    let mtlsOk = false
    try {
      const result =
        await $`curl -s -o /dev/null -w "%{http_code}" --cert ${pemPath} --key ${keyPath} ${targetUrl}`
      const statusCode = result.toString().trim()

      if (statusCode.startsWith('2')) {
        cli.printSuccess(`WITH cert: HTTP ${statusCode} — mTLS connection accepted.`)
        mtlsOk = true
      } else if (statusCode === '403') {
        cli.printError(`WITH cert: HTTP 403 — Forbidden.`)
        cli.printInfo('  Possible causes:')
        cli.printInfo(
          '  • Certificate hosts not configured (SSL/TLS → Client Certificates → Edit Hosts)',
        )
        cli.printInfo('  • mTLS skip rule missing or not matching your hostname')
        cli.printInfo('  • Certificate may be revoked or expired')
      } else if (statusCode === '000') {
        cli.printError('WITH cert: connection failed — check domain/network/DNS.')
      } else {
        cli.printWarning(`WITH cert: HTTP ${statusCode} — unexpected response.`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      cli.printError(`WITH cert: test failed — ${msg}`)
    }

    // Test 2: WITHOUT mTLS certificate — should return 403 (blocked by WAF)
    cli.printInfo(`\n2. Testing WITHOUT client certificate (should return 403 if WAF blocks)...`)
    cli.printInfo(`   curl ${targetUrl}\n`)

    try {
      const result = await $`curl -s -o /dev/null -w "%{http_code}" ${targetUrl}`
      const statusCode = result.toString().trim()

      if (statusCode === '403') {
        cli.printSuccess(`WITHOUT cert: HTTP 403 — WAF correctly blocks non-mTLS traffic.`)
      } else if (statusCode.startsWith('2')) {
        cli.printWarning(`WITHOUT cert: HTTP ${statusCode} — NOT blocked!`)
        cli.printInfo('  Your WAF block rule may be missing or disabled.')
        cli.printInfo('  Expected: HTTP 403 for requests without a valid client certificate.')
        cli.printInfo('  Fix: Cloudflare / WAF → Create Block Rule')
      } else if (statusCode === '000') {
        cli.printError('WITHOUT cert: connection failed — check domain/network/DNS.')
      } else {
        cli.printWarning(`WITHOUT cert: HTTP ${statusCode} — unexpected response.`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      cli.printError(`WITHOUT cert: test failed — ${msg}`)
    }

    // Summary
    console.log()
    if (mtlsOk) {
      cli.printInfo('To verify manually:')
      cli.printInfo(`  With cert:    curl --cert ${pemPath} --key ${keyPath} ${targetUrl}`)
      cli.printInfo(`  Without cert: curl ${targetUrl}`)
    }
  }
}
