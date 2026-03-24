import { cli } from '@sag/utils'
import { fs } from 'zx'
import { type GeneratorConfig } from '@sag/types'
import { type PlatformInstaller, type CertPaths, type InstallResult } from './types'

export const androidInstaller: PlatformInstaller = {
  platform: 'android',
  displayName: 'Android',

  isSupported(): boolean {
    return true // Always available — generates guidance
  },

  async install(certPaths: CertPaths, _config: GeneratorConfig): Promise<InstallResult> {
    if (!fs.existsSync(certPaths.p12Path)) {
      return {
        success: false,
        message: 'P12 certificate file not found. Generate it first via mTLS menu.',
      }
    }

    return {
      success: true,
      message: `Certificate file ready at: ${certPaths.p12Path}`,
      manualSteps: [
        'Transfer the .p12 file to your Android device (USB, cloud drive, or portal)',
        'On Android: Settings → Security → Advanced → Encryption & credentials',
        'Tap "Install a certificate" → "VPN and app user certificate"',
        'Select the .p12 file — leave password empty',
        'Give it a recognizable name (e.g., "Home Assistant mTLS")',
        'The certificate will be available for apps and browsers',
      ],
    }
  },

  async verify(_config: GeneratorConfig): Promise<boolean> {
    cli.printInfo('Android verification must be done on the device itself.')
    cli.printInfo('Visit your domain in Chrome to confirm the certificate works.')
    return true
  },

  async uninstall(_config: GeneratorConfig): Promise<void> {
    cli.printInfo('To remove the certificate on Android:')
    cli.printInfo('1. Settings → Security → Advanced → Encryption & credentials')
    cli.printInfo('2. Tap "User credentials"')
    cli.printInfo('3. Find and remove the mTLS certificate')
  },
}
