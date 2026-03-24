import { cli, ssl, fileSystem } from '@sag/utils'
import { $, fs } from 'zx'
import { join as pathJoin } from 'node:path'
import { type ICertificateManager } from '@sag/core'
import { type GeneratorConfig } from '@sag/types'

export class CertRotateGenerator {
  constructor(private certManager: ICertificateManager) {}

  async rotate(config: GeneratorConfig): Promise<void> {
    cli.printSection('Certificate Rotation')

    const certDir = pathJoin(config.workDir, 'certs')
    const timestamp = new Date().toISOString().split('T')[0]

    // Step 1: Archive existing cert
    const existingPem = pathJoin(certDir, 'client.pem')
    const existingKey = pathJoin(certDir, 'client.key')

    if (fs.existsSync(existingPem) && fs.existsSync(existingKey)) {
      const archiveDir = pathJoin(certDir, 'archive')
      await fileSystem.ensureDir(archiveDir)
      await fs.copy(existingPem, pathJoin(archiveDir, `client-${timestamp}.pem`))
      await fs.copy(existingKey, pathJoin(archiveDir, `client-${timestamp}.key`))
      cli.printSuccess(`Archived existing cert to archive/client-${timestamp}.*`)
    }

    // Step 2: Generate new key + CSR
    cli.printInfo('Generating new key pair...')
    const newKeyPath = pathJoin(certDir, 'client.key')
    const newCsrPath = pathJoin(certDir, 'client.csr')

    await ssl.generateKey(newKeyPath)

    const commonName = config.haSubdomain ? `${config.haSubdomain}.${config.domain}` : config.domain

    await ssl.generateCsr(newKeyPath, newCsrPath, commonName)
    cli.printSuccess('New key and CSR generated.')

    // Step 3: Upload CSR to CF
    cli.printInfo('Uploading CSR to Cloudflare...')
    const csrContent = await fs.readFile(newCsrPath, 'utf-8')
    const newCert = await this.certManager.uploadCsr(csrContent)

    // Save the new PEM
    await fs.writeFile(existingPem, newCert.certificate)
    cli.printSuccess(`New certificate received (ID: ${newCert.id})`)

    // Step 4: Generate P12
    const p12Path = pathJoin(certDir, 'device-cert.p12')
    await ssl.generateP12(p12Path, newKeyPath, existingPem)
    cli.printSuccess('New P12 file generated.')

    // Step 5: Verify — test with AND without mTLS cert
    cli.printInfo('\nVerifying new certificate...')
    const testUrl = `https://${commonName}`

    cli.printInfo(`\n  Test 1: WITH new cert (expect 200)...`)
    let mtlsOk = false
    try {
      const result =
        await $`curl -s -o /dev/null -w "%{http_code}" --cert ${existingPem} --key ${newKeyPath} ${testUrl}`
      const statusCode = result.toString().trim()

      if (statusCode.startsWith('2')) {
        cli.printSuccess(`  WITH cert: HTTP ${statusCode} — new cert accepted.`)
        mtlsOk = true
      } else {
        cli.printWarning(
          `  WITH cert: HTTP ${statusCode} — verify manually. Old cert is still active as fallback.`,
        )
      }
    } catch {
      cli.printWarning(
        '  WITH cert: connection test failed — old cert is still active as fallback.',
      )
    }

    cli.printInfo(`  Test 2: WITHOUT cert (expect 403)...`)
    try {
      const result = await $`curl -s -o /dev/null -w "%{http_code}" ${testUrl}`
      const statusCode = result.toString().trim()

      if (statusCode === '403') {
        cli.printSuccess('  WITHOUT cert: HTTP 403 — WAF correctly blocks non-mTLS traffic.')
      } else if (statusCode.startsWith('2')) {
        cli.printWarning(`  WITHOUT cert: HTTP ${statusCode} — NOT blocked! Check WAF rules.`)
      }
    } catch {
      // Silently skip — connection test without cert may fail for various reasons
    }

    // Step 6: Offer to revoke old cert
    console.log()
    cli.printInfo('The old certificate is still active. Both certs work during the transition.')
    const revoke = await cli.confirm('Revoke the old certificate now?')

    if (revoke) {
      try {
        const certs = await this.certManager.listCertificates()
        const oldCerts = certs.filter((c) => c.id !== newCert.id && c.status === 'active')

        if (oldCerts.length === 0) {
          cli.printInfo('No other active certificates to revoke.')
        } else {
          for (const old of oldCerts) {
            const confirmRevoke = await cli.confirm(
              `Revoke "${old.common_name}" (expires: ${old.expires_on})?`,
            )
            if (confirmRevoke) {
              await this.certManager.revokeCertificate(old.id)
              cli.printSuccess(`Revoked: ${old.id}`)
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        cli.printError(`Failed to revoke: ${msg}`)
      }
    } else {
      cli.printInfo(
        'Old certificate left active. You can revoke it later via "Revoke Old Certificate".',
      )
    }

    // Step 7: Summary and next steps
    console.log()
    cli.printSuccess('Certificate rotation complete!')
    cli.printInfo('\nNext steps:')
    cli.printInfo(
      '  1. Reinstall the new cert: mTLS & Certificates → Install Certificate (this device)',
    )
    if (mtlsOk) {
      cli.printInfo('  2. Remove the OLD cert from your device:')
      cli.printInfo('     macOS: Keychain Access → find old cert → delete it')
      cli.printInfo('     iOS:   Settings → General → VPN & Device Management → remove old profile')
      cli.printInfo('     Windows: certmgr.msc → Personal → Certificates → delete old cert')
    }
    cli.printInfo(
      '  3. If you have family members, generate and distribute new certs for them too.',
    )
  }

  async batchRotate(config: GeneratorConfig): Promise<void> {
    cli.printSection('Batch Certificate Rotation')

    const certs = await this.certManager.listCertificates()
    const activeCerts = certs.filter((c) => c.status === 'active')

    if (activeCerts.length === 0) {
      cli.printInfo('No active certificates to rotate.')
      return
    }

    cli.printInfo(`Found ${activeCerts.length} active certificate(s):`)
    for (const cert of activeCerts) {
      console.log(`  - ${cert.common_name} (expires: ${cert.expires_on})`)
    }

    const proceed = await cli.confirm('Rotate all active certificates?')
    if (!proceed) return

    await this.rotate(config)
  }

  async revokeOld(_config: GeneratorConfig): Promise<void> {
    cli.printSection('Revoke Old Certificate')

    const certs = await this.certManager.listCertificates()
    const activeCerts = certs.filter((c) => c.status === 'active')

    if (activeCerts.length === 0) {
      cli.printInfo('No active certificates found.')
      return
    }

    if (activeCerts.length === 1) {
      cli.printInfo('Only one active certificate — nothing to revoke.')
      return
    }

    // Sort by creation date ascending (oldest first)
    const sorted = [...activeCerts].sort(
      (a, b) => new Date(a.expires_on).getTime() - new Date(b.expires_on).getTime(),
    )

    const oldest = sorted[0]
    const newest = sorted[sorted.length - 1]

    cli.printInfo('\nActive Cloudflare Client Certificates:')
    console.log()
    for (const cert of sorted) {
      const isNewest = cert.id === newest.id
      const label = isNewest ? '[NEW]' : '[OLD]'
      const marker = isNewest ? '●' : '○'
      console.log(
        `  ${marker} ${label} Issued: ${cert.issued_on.split('T')[0]}  Expires: ${cert.expires_on.split('T')[0]}  ID: ${cert.id.substring(0, 8)}...`,
      )
    }
    console.log()
    cli.printInfo(`Suggested action: Revoke the OLD certificate (${oldest.id.substring(0, 8)}...)`)
    cli.printWarning(
      'Before revoking, make sure ALL users (including family members) have installed and tested the new certificate.',
    )
    console.log()

    const action = await cli.askChoice('What would you like to do?', [
      {
        name: `Revoke OLD cert (${oldest.common_name} — ${oldest.id.substring(0, 8)}...) [recommended]`,
        value: 'revoke-old',
      },
      { name: 'Choose a specific certificate to revoke', value: 'choose' },
      { name: 'Keep both active for now', value: 'keep' },
    ])

    if (action === 'keep') {
      cli.printInfo('Both certificates remain active. You can revoke the old one later.')
      return
    }

    let certIdToRevoke: string
    if (action === 'revoke-old') {
      certIdToRevoke = oldest.id
    } else {
      const choices = activeCerts.map((c) => ({
        name: `${c.common_name} — expires ${c.expires_on} (${c.id.substring(0, 8)}...)`,
        value: c.id,
      }))
      certIdToRevoke = await cli.askChoice('Select certificate to revoke', choices)
    }

    const confirmed = await cli.confirm('This cannot be undone. Revoke this certificate?')
    if (confirmed) {
      await this.certManager.revokeCertificate(certIdToRevoke)
      cli.printSuccess('Certificate revoked.')

      console.log()
      cli.printInfo('Next: Remove the revoked certificate from all devices:')
      cli.printInfo('  macOS:   Keychain Access → find old cert → delete it')
      cli.printInfo('  iOS:     Settings → General → VPN & Device Management → remove old profile')
      cli.printInfo('  Windows: certmgr.msc → Personal → Certificates → delete old cert')
    }
  }
}
