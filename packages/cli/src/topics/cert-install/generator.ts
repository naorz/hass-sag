import { cli } from '@sag/utils'
import { fs } from 'zx'
import { join as pathJoin } from 'node:path'
import { type GeneratorConfig } from '@sag/types'
import {
  ALL_INSTALLERS,
  getInstallerForCurrentPlatform,
  type CertPaths,
  type PlatformInstaller,
} from './platforms'

function getCertPaths(config: GeneratorConfig): CertPaths {
  const certDir = pathJoin(config.workDir, 'certs')
  return {
    keyPath: pathJoin(certDir, 'client.key'),
    pemPath: pathJoin(certDir, 'client.pem'),
    p12Path: pathJoin(certDir, 'device-cert.p12'),
    profilePath: pathJoin(certDir, 'apple-secure.mobileconfig'),
  }
}

function validateCertFiles(certPaths: CertPaths): boolean {
  if (!fs.existsSync(certPaths.p12Path)) {
    cli.printError(`Certificate file not found: ${certPaths.p12Path}`)
    cli.printInfo('Run "mTLS: Generate PKCS#12" first.')
    return false
  }
  return true
}

export class CertInstallGenerator {
  async installForCurrentPlatform(config: GeneratorConfig): Promise<void> {
    const certPaths = getCertPaths(config)
    if (!validateCertFiles(certPaths)) return

    const installer = getInstallerForCurrentPlatform()
    if (!installer) {
      cli.printWarning('No installer available for this platform.')
      cli.printInfo('Use "Install for specific platform" to generate install scripts/instructions.')
      return
    }

    await this.runInstaller(installer, certPaths, config)
  }

  async installForPlatform(config: GeneratorConfig): Promise<void> {
    const certPaths = getCertPaths(config)
    if (!validateCertFiles(certPaths)) return

    const choices = ALL_INSTALLERS.map((i) => ({
      name: i.displayName,
      value: i.platform,
    }))

    const platform = await cli.askChoice('Select target platform', choices)
    const installer = ALL_INSTALLERS.find((i) => i.platform === platform)
    if (!installer) return

    await this.runInstaller(installer, certPaths, config)
  }

  async verifyInstallation(config: GeneratorConfig): Promise<void> {
    cli.printSection('Verify Certificate Installation')

    const installer = getInstallerForCurrentPlatform()
    if (!installer) {
      cli.printWarning('Verification only available on the device where the cert is installed.')
      return
    }

    const installed = await installer.verify(config)
    if (installed) {
      cli.printSuccess('Certificate appears to be installed.')
    } else {
      cli.printWarning('Certificate not found in system store.')
    }
  }

  async uninstall(config: GeneratorConfig): Promise<void> {
    cli.printSection('Uninstall Certificate')

    const installer = getInstallerForCurrentPlatform()
    if (!installer) {
      cli.printInfo('Select platform for uninstall instructions:')
      for (const i of ALL_INSTALLERS) {
        await i.uninstall(config)
        console.log()
      }
      return
    }

    const confirmed = await cli.confirm(`Remove certificate from ${installer.displayName}?`)
    if (confirmed) {
      await installer.uninstall(config)
    }
  }

  private async runInstaller(
    installer: PlatformInstaller,
    certPaths: CertPaths,
    config: GeneratorConfig,
  ): Promise<void> {
    cli.printSection(`Install Certificate — ${installer.displayName}`)
    const result = await installer.install(certPaths, config)

    if (result.success) {
      cli.printSuccess(result.message)
    } else {
      cli.printError(result.message)
    }

    if (result.manualSteps?.length) {
      cli.printInfo('\nSteps:')
      result.manualSteps.forEach((step, i) => {
        cli.printInfo(`  ${i + 1}. ${step}`)
      })
    }
  }
}
