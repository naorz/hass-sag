import { cli, fileSystem, configStore, ssl } from '@sag/utils'
import { fs } from 'zx'
import { join as pathJoin } from 'node:path'
import qrcode from 'qrcode-terminal'
import { dockerComposeTemplate, settingsJsonTemplate } from './templates'
import { buildDownloadPage } from './templates/download-page'
import { type GeneratorConfig } from '@sag/types'
import { type ICertificateManager } from '@sag/shared/core'

export class PortalGenerator {
  async run(config: GeneratorConfig): Promise<void> {
    cli.printSection('Portal Configuration (FileBrowser)')
    const fbDir = pathJoin(config.workDir, 'portal', 'conf')
    const srvDir = pathJoin(config.workDir, 'portal', 'srv')

    await fileSystem.ensureDir(fbDir)
    await fileSystem.ensureDir(srvDir)

    const composePath = pathJoin(fbDir, 'docker-compose.yml')
    const settingsPath = pathJoin(fbDir, 'settings.json')

    const certDir = pathJoin(config.workDir, 'certs')

    const dockerCompose = dockerComposeTemplate(srvDir, certDir)
    const settingsJson = settingsJsonTemplate()

    await fileSystem.safeWrite(composePath, dockerCompose)
    await fileSystem.safeWrite(settingsPath, settingsJson)

    // Copy cert files to srv for distribution
    await this.copyCertsToSrv(config, srvDir)

    cli.printSuccess('Portal configuration files generated in portal/conf/')
    cli.printInfo(`Certificate files available in ${srvDir}`)
  }

  async generateDownloadPage(config: GeneratorConfig): Promise<void> {
    cli.printSection('Generate Download Page')

    const srvDir = pathJoin(config.workDir, 'portal', 'srv')
    await fileSystem.ensureDir(srvDir)

    const hostname = config.haSubdomain ? `${config.haSubdomain}.${config.domain}` : config.domain

    const certDir = pathJoin(config.workDir, 'certs')
    const hasMobileconfig = fs.existsSync(pathJoin(certDir, 'apple-secure.mobileconfig'))
    const hasP12 = fs.existsSync(pathJoin(certDir, 'device-cert.p12'))

    const html = buildDownloadPage({
      domain: config.domain,
      hostname,
      hasMobileconfig,
      hasP12,
    })

    const pagePath = pathJoin(srvDir, 'index.html')
    await fileSystem.safeWrite(pagePath, html)

    // Copy certs alongside the download page
    await this.copyCertsToSrv(config, srvDir)

    cli.printSuccess(`Download page generated at ${pagePath}`)
    cli.printInfo('Deploy this folder to your portal or static hosting.')
    cli.printInfo(`Family members can access https://${config.portalSubdomain}.${config.domain}`)
  }

  async manageFamilyMembers(
    config: GeneratorConfig,
    certManager?: ICertificateManager,
  ): Promise<void> {
    cli.printSection('Family Member Management')

    const cfEnabled = !!certManager
    const family = config.family || []

    if (family.length > 0) {
      cli.printInfo('Current family members:')
      family.forEach((m, i) => {
        const certStatus = m.cfCertId ? `cert: ${m.cfCertId.slice(0, 8)}...` : 'no CF cert'
        console.log(`  ${i + 1}. ${m.name} (${m.email}) [${certStatus}]`)
      })
      console.log()
    } else {
      cli.printInfo('No family members yet.\n')
    }

    if (!cfEnabled) {
      cli.printInfo(
        '[i] CF token not configured — changes will be saved locally only.\n' +
          '    Configure via "Manage CF Token" to also provision/revoke CF certificates.',
      )
      console.log()
    }

    const action = await cli.askChoice('What would you like to do?', [
      { name: 'Add member', value: 'add' },
      { name: 'Remove member', value: 'remove' },
      { name: 'Back', value: 'back' },
    ])

    if (action === 'back') return

    if (action === 'add') {
      const name = await cli.ask('Member name')
      const email = await cli.ask('Member email')

      let cfCertId: string | undefined

      if (cfEnabled) {
        const provision = await cli.confirm(
          'Provision a Cloudflare mTLS certificate for this member now?',
          true,
        )

        if (provision) {
          const hostname = config.haSubdomain
            ? `${config.haSubdomain}.${config.domain}`
            : config.domain

          const memberDir = pathJoin(
            config.workDir,
            'family',
            name.toLowerCase().replace(/\s+/g, '-'),
          )
          await fileSystem.ensureDir(memberDir)

          const keyPath = pathJoin(memberDir, 'client.key')
          const csrPath = pathJoin(memberDir, 'client.csr')
          const pemPath = pathJoin(memberDir, 'client.pem')
          const p12Path = pathJoin(memberDir, 'device-cert.p12')

          cli.printInfo(`Generating key and CSR for ${name}...`)
          await ssl.generateKey(keyPath)
          await ssl.generateCsr(keyPath, csrPath, hostname)

          cli.printInfo('Uploading CSR to Cloudflare...')
          const csrContent = await fs.readFile(csrPath, 'utf-8')
          const cert = await certManager!.uploadCsr(csrContent)
          await fs.writeFile(pemPath, cert.certificate)
          cfCertId = cert.id

          cli.printInfo('Generating P12 bundle...')
          await ssl.generateP12(p12Path, keyPath, pemPath)

          cli.printSuccess(`Certificate provisioned — ID: ${cert.id}`)
          cli.printInfo(`Files saved to: ${memberDir}`)
          cli.printInfo(`Share ${p12Path} with ${name} for device installation.`)
        }
      }

      config.family = [...family, { name, email, platforms: [], cfCertId }]
      await configStore.save(config)
      cli.printSuccess(`Added ${name} (${email})`)
    }

    if (action === 'remove') {
      if (family.length === 0) {
        cli.printInfo('No members to remove.')
        return
      }

      const choices = family.map((m) => ({
        name: `${m.name} (${m.email})`,
        value: m.email,
      }))
      const email = await cli.askChoice('Select member to remove', choices)
      const member = family.find((m) => m.email === email)

      if (member?.cfCertId && cfEnabled) {
        const revoke = await cli.confirm(
          `Revoke CF certificate for ${member.name} (ID: ${member.cfCertId.slice(0, 8)}...)?`,
          true,
        )
        if (revoke) {
          try {
            await certManager!.revokeCertificate(member.cfCertId)
            cli.printSuccess(`CF certificate revoked for ${member.name}.`)
          } catch (err) {
            cli.printWarning(
              `Failed to revoke CF cert: ${err instanceof Error ? err.message : String(err)}`,
            )
            cli.printInfo('Member removed locally. Revoke manually in CF dashboard if needed.')
          }
        }
      } else if (member?.cfCertId && !cfEnabled) {
        cli.printWarning(
          `${member.name} has a CF cert (${member.cfCertId.slice(0, 8)}...) that was NOT revoked.\n` +
            '  Configure CF token and run again, or revoke manually in the CF dashboard.',
        )
      }

      config.family = family.filter((m) => m.email !== email)
      await configStore.save(config)
      cli.printSuccess('Member removed.')
    }
  }

  async generateQrCode(config: GeneratorConfig): Promise<void> {
    cli.printSection('Portal QR Code')

    const url = `https://${config.portalSubdomain}.${config.domain}`
    cli.printInfo(`Generating QR code for: ${url}`)
    console.log()

    await new Promise<void>((resolve) => {
      qrcode.generate(url, { small: true }, (code: string) => {
        console.log(code)
        resolve()
      })
    })

    cli.printInfo('Share this QR code with family members to access the portal.')
    cli.printInfo(`URL: ${url}`)
  }

  async refreshPortalCerts(config: GeneratorConfig): Promise<void> {
    cli.printSection('Refresh Portal Certificates')

    const srvDir = pathJoin(config.workDir, 'portal', 'srv')
    await fileSystem.ensureDir(srvDir)

    // Step 1: Copy latest cert files to portal/srv
    await this.copyCertsToSrv(config, srvDir)
    cli.printSuccess('Certificate files copied to portal/srv/')

    // Step 2: Try to refresh via FileBrowser REST API
    const fbUrl = process.env['FILEBROWSER_URL'] ?? undefined
    const fbUser = process.env['FILEBROWSER_USER'] ?? undefined
    const fbPass = process.env['FILEBROWSER_PASS'] ?? undefined

    if (!fbUrl || !fbUser || !fbPass) {
      cli.printInfo(
        'FileBrowser API credentials not found (FILEBROWSER_URL, FILEBROWSER_USER, FILEBROWSER_PASS).',
      )
      cli.printInfo(
        'Files copied. Restart FileBrowser or it will serve the new files automatically.',
      )
      return
    }

    try {
      cli.printInfo(`Authenticating with FileBrowser at ${fbUrl}...`)

      // Login to get JWT
      const loginRes = await fetch(`${fbUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: fbUser, password: fbPass }),
      })

      if (!loginRes.ok) {
        cli.printWarning(
          `FileBrowser login failed (HTTP ${loginRes.status}). Files were copied locally.`,
        )
        return
      }

      const token = await loginRes.text()

      // Upload device-cert.p12 via API
      const certPath = pathJoin(srvDir, 'device-cert.p12')
      if (fs.existsSync(certPath)) {
        const certData = await fs.readFile(certPath)
        const uploadRes = await fetch(`${fbUrl}/api/resources/device-cert.p12?override=true`, {
          method: 'POST',
          headers: {
            'X-Auth': token,
            'Content-Type': 'application/octet-stream',
          },
          body: certData,
        })

        if (uploadRes.ok) {
          cli.printSuccess('device-cert.p12 uploaded to FileBrowser via API.')
        } else {
          cli.printWarning(
            `FileBrowser upload failed (HTTP ${uploadRes.status}). File was copied locally.`,
          )
        }
      }

      // Upload mobileconfig if it exists
      const mobileconfigPath = pathJoin(srvDir, 'apple-secure.mobileconfig')
      if (fs.existsSync(mobileconfigPath)) {
        const mcData = await fs.readFile(mobileconfigPath)
        const uploadRes = await fetch(
          `${fbUrl}/api/resources/apple-secure.mobileconfig?override=true`,
          {
            method: 'POST',
            headers: {
              'X-Auth': token,
              'Content-Type': 'application/octet-stream',
            },
            body: mcData,
          },
        )

        if (uploadRes.ok) {
          cli.printSuccess('apple-secure.mobileconfig uploaded to FileBrowser via API.')
        } else {
          cli.printWarning(
            `FileBrowser upload failed for mobileconfig (HTTP ${uploadRes.status}). File was copied locally.`,
          )
        }
      }

      cli.printSuccess('Portal certificates refreshed via FileBrowser API.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      cli.printWarning(`FileBrowser API error: ${msg}`)
      cli.printInfo('Files were copied locally. Restart FileBrowser to serve the new certificates.')
    }
  }

  private async copyCertsToSrv(config: GeneratorConfig, srvDir: string): Promise<void> {
    const certDir = pathJoin(config.workDir, 'certs')
    const filesToCopy = ['device-cert.p12', 'apple-secure.mobileconfig']

    for (const file of filesToCopy) {
      const src = pathJoin(certDir, file)
      const dest = pathJoin(srvDir, file)
      if (fs.existsSync(src)) {
        await fs.copy(src, dest)
        cli.printInfo(`Copied ${file} to portal`)
      }
    }
  }
}
