import { cli } from '@sag/utils'
import { $ } from 'zx'
import { type GeneratorConfig } from '@sag/types'
import { type PlatformInstaller, type CertPaths, type InstallResult } from './types'

export const macosInstaller: PlatformInstaller = {
  platform: 'macos',
  displayName: 'macOS',

  isSupported(): boolean {
    return process.platform === 'darwin'
  },

  async install(certPaths: CertPaths, config: GeneratorConfig): Promise<InstallResult> {
    const hostname = `${config.haSubdomain ? `${config.haSubdomain}.` : '*.'}` + config.domain

    try {
      // Import P12 to login keychain with access for all applications
      cli.printInfo('Importing certificate to macOS Keychain...')
      await $`security import ${certPaths.p12Path} -k ~/Library/Keychains/login.keychain-db -P "" -A`
      cli.printSuccess('Certificate imported to Keychain.')

      // Set identity preference for the domain URL
      // This tells macOS to automatically use this cert for the specified URL
      cli.printInfo(`Setting identity preference for https://${hostname}...`)
      await $`security set-identity-preference -s https://${hostname} ${certPaths.pemPath}`
      cli.printSuccess('Identity preference set — no more browser popups.')

      return {
        success: true,
        message: `Certificate installed and auto-select configured for https://${hostname}`,
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const isMacError = msg.includes('MAC verification failed')
      return {
        success: false,
        message: `Failed to install certificate: ${msg}`,
        manualSteps: [
          ...(isMacError
            ? [
                'The .p12 file was likely created with OpenSSL 3.x using new algorithms incompatible with macOS.',
                'Regenerate it: mTLS & Certificates → Generate PKCS#12 (.p12) — this now uses the -legacy flag.',
              ]
            : []),
          `Or import manually: open Keychain Access → File → Import Items → select ${certPaths.p12Path}`,
          'Double-click the imported certificate and set Trust to "Always Trust"',
        ],
      }
    }
  },

  async verify(config: GeneratorConfig): Promise<boolean> {
    try {
      const result = await $`security find-identity -p ssl-client -v`
      const output = result.toString()
      const hostname = config.haSubdomain ? `${config.haSubdomain}.${config.domain}` : config.domain
      return output.toLowerCase().includes(hostname.toLowerCase())
    } catch {
      return false
    }
  },

  async uninstall(config: GeneratorConfig): Promise<void> {
    const hostname = `${config.haSubdomain ? `${config.haSubdomain}.` : '*.'}` + config.domain

    try {
      await $`security set-identity-preference -s https://${hostname} -n`
      cli.printSuccess(`Identity preference removed for https://${hostname}`)
    } catch {
      cli.printWarning(
        'Could not remove identity preference. You may need to do this manually via Keychain Access.',
      )
    }
  },
}
