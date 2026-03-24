export type { PlatformInstaller, CertPaths, InstallResult } from './types'
export { macosInstaller } from './macos'
export { windowsInstaller } from './windows'
export { linuxInstaller } from './linux'
export { iosInstaller } from './ios'
export { androidInstaller } from './android'

import { macosInstaller } from './macos'
import { windowsInstaller } from './windows'
import { linuxInstaller } from './linux'
import { iosInstaller } from './ios'
import { androidInstaller } from './android'
import { type PlatformInstaller } from './types'

export const ALL_INSTALLERS: PlatformInstaller[] = [
  macosInstaller,
  windowsInstaller,
  linuxInstaller,
  iosInstaller,
  androidInstaller,
]

export function getInstallerForCurrentPlatform(): PlatformInstaller | undefined {
  return ALL_INSTALLERS.find((i) => i.isSupported() && i.platform === getCurrentPlatformId())
}

function getCurrentPlatformId(): string {
  switch (process.platform) {
    case 'darwin':
      return 'macos'
    case 'win32':
      return 'windows'
    case 'linux':
      return 'linux'
    default:
      return 'unknown'
  }
}
