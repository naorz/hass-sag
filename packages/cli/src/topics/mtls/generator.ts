import { cli, clipboard, ssl, fileSystem, validateHttpsUrl } from '@sag/utils'
import { fs, $ } from 'zx'
import { join as pathJoin } from 'node:path'
import { randomUUID } from 'node:crypto'
import { appleProfileTemplate } from './templates'
import { type GeneratorConfig } from '@sag/types'

export class MtlsGenerator {
  async generateIdentity(config: GeneratorConfig): Promise<void> {
    cli.printSection('mTLS Identity')
    const certDir = pathJoin(config.workDir, 'certs')
    await fileSystem.ensureDir(certDir)

    const keyPath = pathJoin(certDir, 'client.key')
    const csrPath = pathJoin(certDir, 'client.csr')

    if (fs.existsSync(keyPath)) {
      cli.printWarning(`File exists: ${keyPath}`)
      const override = await cli.confirm('Override existing key?')
      if (override) await ssl.generateKey(keyPath)
    } else {
      await ssl.generateKey(keyPath)
    }

    await ssl.generateCsr(
      keyPath,
      csrPath,
      `${config.haSubdomain ? `${config.haSubdomain}.` : ''}${config.domain}`,
    )

    const csrContent = await fs.readFile(csrPath, 'utf-8')
    await clipboard.copy(csrContent)

    const hostName = `${config.haSubdomain ? `${config.haSubdomain}.` : ''}${config.domain}`
    const pemPath = pathJoin(certDir, 'client.pem')

    cli.printSuccess('CSR generated and copied to clipboard.')
    cli.printInfo('\nNext steps in Cloudflare Dashboard:')
    cli.printInfo('  1. Go to SSL/TLS → Client Certificates → Create Certificate')
    cli.printInfo('  2. Paste the CSR and click "Create"')
    cli.printInfo(`  3. Save the signed certificate as: ${pemPath}`)
    cli.printInfo(`  4. In the "Hosts" list, add: ${hostName}`)
    cli.printWarning(
      `  Without the Hosts entry, Cloudflare won't request the certificate from clients.`,
    )

    while (true) {
      await cli.ask('\nPress Enter once client.pem is saved and Hosts are updated')

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
          'Make sure you copied the full certificate text including the -----BEGIN/END CERTIFICATE----- lines.',
        )
        continue
      }

      cli.printSuccess('client.pem verified — valid PEM certificate found.')
      break
    }
  }

  async generateP12(config: GeneratorConfig): Promise<void> {
    cli.printSection('Generate PKCS#12 (.p12)')
    const certDir = pathJoin(config.workDir, 'certs')
    const p12Path = pathJoin(certDir, 'device-cert.p12')
    const keyPath = pathJoin(certDir, 'client.key')
    const pemPath = pathJoin(certDir, 'client.pem')

    if (!fs.existsSync(pemPath) || !fs.existsSync(keyPath)) {
      cli.printError(`client.pem or client.key not found in ${certDir}.`)
      return
    }

    if (fs.existsSync(p12Path)) {
      cli.printWarning(`File exists: ${p12Path}`)
      const override = await cli.confirm('Override existing file?')
      if (!override) return
    }

    await ssl.generateP12(p12Path, keyPath, pemPath)
    cli.printSuccess(`Generated ${p12Path}`)
  }

  async generateAppleProfile(config: GeneratorConfig): Promise<void> {
    cli.printSection('Apple Profile')
    const certDir = pathJoin(config.workDir, 'certs')
    const p12Path = pathJoin(certDir, 'device-cert.p12')
    const profilePath = pathJoin(certDir, 'apple-secure.mobileconfig')

    if (!fs.existsSync(p12Path)) {
      cli.printInfo('PKCS#12 file not found. Generating...')
      await this.generateP12(config)
      // Check if p12 was actually created (user might have failed requirements in generateP12)
      if (!fs.existsSync(p12Path)) return
    } else {
      cli.printInfo(`Using existing ${p12Path}`)
    }

    const b64Data = (await $`cat ${p12Path} | base64`).toString().trim()
    const identifier = `${config.domain.split('.').reverse().join('.')}.mtls`

    const certificateDomainName = `${config.haSubdomain ? config.haSubdomain : '*'}.${config.domain}`
    const profileXml = appleProfileTemplate({
      certificateDomainName,
      b64Data,
      identifier,
      uuid1: randomUUID(),
      uuid2: randomUUID(),
      uuid3: randomUUID(),
      url: `https://${certificateDomainName}`,
    })

    await fileSystem.safeWrite(profilePath, profileXml)
    cli.printSuccess(`Apple profile generated at ${profilePath}`)

    if (process.platform !== 'darwin') {
      cli.printWarning('mTLS Apple Profile generation is only supported on macOS')
      return
    }

    const sign = await cli.confirm('Sign the profile now?')
    if (sign) {
      await this.signAppleProfile(config)
    } else {
      cli.printInfo('You can sign the profile later from the main menu.')
    }
  }

  async signAppleProfile(config: GeneratorConfig): Promise<void> {
    cli.printSection('Sign Apple Profile')
    const certDir = pathJoin(config.workDir, 'certs')
    const profilePath = pathJoin(certDir, 'apple-secure.mobileconfig')

    if (!fs.existsSync(profilePath)) {
      cli.printError(`Profile not found at ${profilePath}`)
      return
    }

    if (process.platform !== 'darwin') {
      cli.printError('Profile signing is only supported on macOS')
      return
    }

    // Try valid identities first
    let identities = await ssl.getIdentities(true)
    let validOnly = true

    // If no valid ones, check if any exist at all (untrusted)
    if (identities.length === 0) {
      identities = await ssl.getIdentities(false)
      if (identities.length > 0) {
        validOnly = false
        cli.printWarning('No trusted code-signing identities found. Listing untrusted ones...')
      }
    }

    if (identities.length === 0) {
      cli.printWarning('No code-signing identities found in macOS Keychain.')
      const create = await cli.confirm('Create a self-signed signing identity?', true)
      if (create) {
        const newIdentityName = await this.createSigningIdentity(config)
        if (newIdentityName) {
          // Attempt to use the new identity directly
          cli.printInfo(`Attempting to sign with new identity: "${newIdentityName}"...`)
          try {
            const signedPath = profilePath.replace('.mobileconfig', '.signed.mobileconfig')
            await ssl.signMobileConfig(profilePath, signedPath, newIdentityName)
            cli.printSuccess(`Signed profile created at ${signedPath}`)
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            cli.printError(`Could not sign with new identity "${newIdentityName}": ${msg}`)
            cli.printInfo(
              'This is likely because the certificate is not yet trusted. Please Open Keychain Access, find the certificate, double-click it, expand "Trust", and set "Code Signing" to "Always Trust". Then try signing again.',
            )
          }
        }
        return
      }
      return
    }

    const identityChoices = identities.map((id) => ({
      name: `${id.name} (${id.hash.substring(0, 8)}...)`,
      value: id.name,
    }))

    const selectedId = await cli.askChoice(
      `Select identity${validOnly ? '' : ' (including untrusted)'}`,
      identityChoices,
    )

    const signedPath = profilePath.replace('.mobileconfig', '.signed.mobileconfig')
    try {
      await ssl.signMobileConfig(profilePath, signedPath, selectedId)
      cli.printSuccess(`Signed profile created at ${signedPath}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      cli.printError(`Failed to sign profile: ${msg}`)
      if (!validOnly) {
        cli.printInfo(
          'Note: You selected an identity that might be untrusted. Please check Keychain Access settings.',
        )
      }
    }
  }

  async createSigningIdentity(config: GeneratorConfig): Promise<string | undefined> {
    cli.printSection('Create Signing Identity')
    const name = await cli.ask(
      'Enter a name for the identity (e.g., SAG Code Signing)',
      'SAG Code Signing',
    )
    const tmpDir = pathJoin(config.workDir, 'tmp_cert')
    await fileSystem.ensureDir(tmpDir)

    try {
      await ssl.createCodeSigningCert(name, tmpDir)
      cli.printSuccess(`Identity "${name}" created and imported to Keychain.`)
      cli.printInfo(
        'Note: You might need to manually trust the certificate in Keychain Access if the system asks.',
      )
      return name
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      cli.printError(`Failed to create identity: ${msg}`)
      return undefined
    } finally {
      // Clean up tmp dir
      await fs.remove(tmpDir)
    }
  }

  async deleteSigningIdentity(_config: GeneratorConfig): Promise<void> {
    cli.printSection('Delete Signing Identity')

    if (process.platform !== 'darwin') {
      cli.printError('Identity management is only supported on macOS')
      return
    }

    while (true) {
      // Get all identities, including invalid/untrusted ones
      const identities = await ssl.getIdentities(false)

      if (identities.length === 0) {
        cli.printWarning('No code-signing identities found.')
        return
      }

      const identityChoices = [
        ...identities.map((id) => ({
          name: `${id.name} (${id.hash})`,
          value: id.hash,
        })),
        { name: 'Back to main menu', value: 'back' },
      ]

      const choice = await cli.askChoice('Select identity to delete', identityChoices)
      if (choice === 'back') return

      const selectedId = identities.find((id) => id.hash === choice)
      if (!selectedId) continue

      const confirmed = await cli.confirm(
        `PERMANENTLY delete "${selectedId.name}" (${selectedId.hash})?`,
      )
      if (confirmed) {
        try {
          await ssl.deleteIdentity(selectedId.hash)
          cli.printSuccess(`Identity deleted.`)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          cli.printError(`Failed to delete identity: ${msg}`)
        }
      }
    }
  }
  async verifyMtlsConnection(config: GeneratorConfig): Promise<void> {
    cli.printSection('Verify mTLS Connection')

    const certDir = pathJoin(config.workDir, 'certs')
    const keyPath = pathJoin(certDir, 'client.key')
    const pemPath = pathJoin(certDir, 'client.pem')

    if (!fs.existsSync(keyPath) || !fs.existsSync(pemPath)) {
      cli.printError('Client key or certificate not found in certs directory.')
      cli.printInfo('Please run "Generate mTLS Identity" first.')
      return
    }

    const defaultUrl = `https://${config.haSubdomain ? `${config.haSubdomain}.` : ''}${config.domain}`
    const targetUrl = await cli.ask('Enter URL to test', defaultUrl)

    try {
      validateHttpsUrl(targetUrl)
    } catch (err) {
      cli.printError(`Invalid URL: ${err instanceof Error ? err.message : String(err)}`)
      return
    }

    cli.printInfo(`Running curl against ${targetUrl}...`)
    console.log('') // Spacer

    try {
      // using -v for verbose output as requested, and -k (insecure) optionally if CA is not trusted system-wide yet?
      // User asked for: curl -v --cert ./client.pem --key ./client.key https://ha.my-domain.com
      // We will use the absolute paths.
      // Note: We are NOT adding -k by default because the goal is to verify the whole chain,
      // but if they are using a self-signed root CA for the server itself (not just client auth),
      // they might need it. For Cloudflare, the server cert is usually public/valid.

      await $`curl -v --cert ${pemPath} --key ${keyPath} ${targetUrl}`

      console.log('') // Spacer
      cli.printSuccess('Verification command executed.')
      cli.printInfo('Check the output above for HTTP 200 OK or similar success codes.')
      cli.printInfo(
        'If you see "403 Forbidden" or "400 Bad Request", Cloudflare might be blocking it.',
      )
    } catch (err) {
      console.log('') // Spacer
      cli.printWarning('Curl command failed or returned non-zero exit code.')
      cli.printInfo(
        'This might be expected if curl returns error on 403/404 depending on flags, or connectivity failed.',
      )
      const msg = err instanceof Error ? err.message : String(err)
      console.error(msg)
    }

    await cli.ask('Press Enter to continue')
  }
}
