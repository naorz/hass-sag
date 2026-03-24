import { cli, fileSystem } from '@sag/utils'
import { $ } from 'zx'
import { join as pathJoin } from 'node:path'
import { type GeneratorConfig } from '@sag/types'
import { type PlatformInstaller, type CertPaths, type InstallResult } from './types'

const INSTALL_SCRIPT_TEMPLATE = (p12Path: string) => `
# SAG Certificate Installer for Windows
# Run this script as Administrator in PowerShell

$certPath = "${p12Path.replace(/\//g, '\\')}"
$cert = Import-PfxCertificate -FilePath $certPath -CertStoreLocation Cert:\\CurrentUser\\My -Password (New-Object System.Security.SecureString)

if ($cert) {
    Write-Host "[OK] Certificate imported: $($cert.Thumbprint)" -ForegroundColor Green
    Write-Host "The certificate will be automatically used by browsers." -ForegroundColor Cyan
} else {
    Write-Host "[ERROR] Failed to import certificate" -ForegroundColor Red
}

Read-Host "Press Enter to close"
`

export const windowsInstaller: PlatformInstaller = {
  platform: 'windows',
  displayName: 'Windows',

  isSupported(): boolean {
    return process.platform === 'win32'
  },

  async install(certPaths: CertPaths, config: GeneratorConfig): Promise<InstallResult> {
    if (process.platform === 'win32') {
      try {
        cli.printInfo('Importing certificate to Windows Certificate Store...')
        await $`certutil -importpfx -user -p "" ${certPaths.p12Path}`
        return {
          success: true,
          message: 'Certificate imported to Windows Certificate Store.',
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        return {
          success: false,
          message: `Failed: ${msg}`,
          manualSteps: [
            `Double-click ${certPaths.p12Path} and follow the import wizard`,
            'Select "Current User" as store location',
            'Leave password empty and click Next',
          ],
        }
      }
    }

    // Generate install script for distribution
    const scriptPath = pathJoin(config.workDir, 'certs', 'install-cert.ps1')
    const script = INSTALL_SCRIPT_TEMPLATE(certPaths.p12Path)
    await fileSystem.safeWrite(scriptPath, script)

    return {
      success: true,
      message: `Windows install script generated at ${scriptPath}`,
      manualSteps: [
        'Transfer the .p12 file and install-cert.ps1 to the Windows machine',
        'Right-click install-cert.ps1 → "Run with PowerShell"',
        'Or: double-click the .p12 file and follow the import wizard',
      ],
    }
  },

  async verify(_config: GeneratorConfig): Promise<boolean> {
    if (process.platform !== 'win32') return false
    try {
      const result = await $`certutil -store -user My`
      return result.toString().includes('mTLS') || result.exitCode === 0
    } catch {
      return false
    }
  },

  async uninstall(_config: GeneratorConfig): Promise<void> {
    cli.printInfo('To remove the certificate on Windows:')
    cli.printInfo('1. Open "Manage User Certificates" (certmgr.msc)')
    cli.printInfo('2. Navigate to Personal → Certificates')
    cli.printInfo('3. Find and delete the mTLS certificate')
  },
}
