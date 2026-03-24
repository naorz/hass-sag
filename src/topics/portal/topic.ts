import { PortalGenerator } from './generator'
import { type GeneratorConfig } from '@sag/types'
import { type ICertificateManager } from '@sag/core'

const generator = new PortalGenerator()

export const portalTopic = {
  id: 'portal',
  name: 'Distribution Portal',
  run: async (config: GeneratorConfig) => generator.run(config),
  generateDownloadPage: async (config: GeneratorConfig) => generator.generateDownloadPage(config),
  manageFamilyMembers: async (config: GeneratorConfig, certManager?: ICertificateManager) =>
    generator.manageFamilyMembers(config, certManager),
  generateQrCode: async (config: GeneratorConfig) => generator.generateQrCode(config),
  refreshPortalCerts: async (config: GeneratorConfig) => generator.refreshPortalCerts(config),
}
