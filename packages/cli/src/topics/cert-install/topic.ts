import { CertInstallGenerator } from './generator'
import { type GeneratorConfig } from '@sag/types'

const generator = new CertInstallGenerator()

export const certInstallTopic = {
  id: 'cert-install',
  name: 'Certificate Installation',
  run: async (config: GeneratorConfig) => generator.installForCurrentPlatform(config),
  installForPlatform: async (config: GeneratorConfig) => generator.installForPlatform(config),
  verify: async (config: GeneratorConfig) => generator.verifyInstallation(config),
  uninstall: async (config: GeneratorConfig) => generator.uninstall(config),
}
