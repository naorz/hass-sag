import { cli, fileSystem } from '@sag/utils'
import { $, fs } from 'zx'
import { join as pathJoin } from 'node:path'
import { type GeneratorConfig } from '@sag/types'
import { type PlatformInstaller, type CertPaths, type InstallResult } from './types'

export const linuxInstaller: PlatformInstaller = {
  platform: 'linux',
  displayName: 'Linux',

  isSupported(): boolean {
    return process.platform === 'linux'
  },

  async install(certPaths: CertPaths, config: GeneratorConfig): Promise<InstallResult> {
    const hostname = `${config.haSubdomain ? `${config.haSubdomain}.` : ''}${config.domain}`
    const results: string[] = []

    // Install to NSS database (used by Chrome/Chromium and Firefox)
    const nssDbPath = pathJoin(process.env['HOME'] || '~', '.pki', 'nssdb')
    try {
      if (fs.existsSync(nssDbPath)) {
        await $`pk12util -d sql:${nssDbPath} -i ${certPaths.p12Path} -W ""`
        results.push('Imported to NSS database (Chrome/Firefox)')
      } else {
        results.push('NSS database not found — skipping browser import')
      }
    } catch {
      results.push('Failed to import to NSS database')
    }

    // Generate Chrome auto-select policy
    try {
      const policyDir = pathJoin(
        process.env['HOME'] || '~',
        '.config',
        'chromium',
        'policies',
        'managed',
      )
      await fileSystem.ensureDir(policyDir)

      const policy = {
        AutoSelectCertificateForUrls: [
          `{"pattern":"https://${hostname}","filter":{"ISSUER":{},"SUBJECT":{}}}`,
        ],
      }

      const policyPath = pathJoin(policyDir, 'sag-mtls.json')
      await fs.writeFile(policyPath, JSON.stringify(policy, null, 2))
      results.push(`Chrome auto-select policy written to ${policyPath}`)
    } catch {
      results.push('Failed to write Chrome policy file')
    }

    return {
      success: true,
      message: results.join('\n'),
      manualSteps: [
        'Restart Chrome/Chromium for the policy to take effect',
        'For Firefox: go to Preferences → Privacy → Certificates → View Certificates → Import',
      ],
    }
  },

  async verify(_config: GeneratorConfig): Promise<boolean> {
    const nssDbPath = pathJoin(process.env['HOME'] || '~', '.pki', 'nssdb')
    try {
      const result = await $`certutil -d sql:${nssDbPath} -L`
      return result.toString().length > 0
    } catch {
      return false
    }
  },

  async uninstall(_config: GeneratorConfig): Promise<void> {
    const nssDbPath = pathJoin(process.env['HOME'] || '~', '.pki', 'nssdb')
    cli.printInfo('To remove the certificate on Linux:')
    cli.printInfo(`1. Run: certutil -d sql:${nssDbPath} -D -n "SAG mTLS"`)
    cli.printInfo('2. Remove Chrome policy: rm ~/.config/chromium/policies/managed/sag-mtls.json')
  },
}
