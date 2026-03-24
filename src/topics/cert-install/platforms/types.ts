import { type GeneratorConfig } from '@sag/types'

export interface CertPaths {
  keyPath: string
  pemPath: string
  p12Path: string
  profilePath?: string
}

export interface InstallResult {
  success: boolean
  message: string
  manualSteps?: string[]
}

export interface PlatformInstaller {
  readonly platform: string
  readonly displayName: string
  isSupported(): boolean
  install(certPaths: CertPaths, config: GeneratorConfig): Promise<InstallResult>
  verify(config: GeneratorConfig): Promise<boolean>
  uninstall(config: GeneratorConfig): Promise<void>
}
