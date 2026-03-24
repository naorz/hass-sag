import { cli } from '@sag/utils'
import { fs } from 'zx'
import { type GeneratorConfig } from '@sag/types'
import { type PlatformInstaller, type CertPaths, type InstallResult } from './types'

export const iosInstaller: PlatformInstaller = {
  platform: 'ios',
  displayName: 'iOS / iPadOS',

  isSupported(): boolean {
    return true // Always available — generates files for transfer
  },

  async install(certPaths: CertPaths, _config: GeneratorConfig): Promise<InstallResult> {
    const profilePath = certPaths.profilePath
    if (!profilePath || !fs.existsSync(profilePath)) {
      return {
        success: false,
        message: 'Apple profile (.mobileconfig) not found. Generate it first via mTLS menu.',
        manualSteps: [
          'Run "mTLS: Generate Apple Profile" from the main menu',
          'Then run the certificate installation again',
        ],
      }
    }

    return {
      success: true,
      message: `Apple profile ready at: ${profilePath}`,
      manualSteps: [
        'Transfer the .mobileconfig file to your iOS device (AirDrop, email, or portal)',
        'Open the file on your device — you will be prompted to install the profile',
        'Go to Settings → General → VPN & Device Management → Install the profile',
        'Go to Settings → General → About → Certificate Trust Settings → Enable trust',
        'The certificate will be automatically used — no popups',
      ],
    }
  },

  async verify(_config: GeneratorConfig): Promise<boolean> {
    cli.printInfo('iOS verification must be done on the device itself.')
    cli.printInfo('Visit your domain in Safari to confirm the certificate works.')
    return true
  },

  async uninstall(_config: GeneratorConfig): Promise<void> {
    cli.printInfo('To remove the certificate on iOS:')
    cli.printInfo('1. Go to Settings → General → VPN & Device Management')
    cli.printInfo('2. Find the mTLS profile and tap "Remove Profile"')
  },
}
