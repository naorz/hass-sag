import { type ICertificateManager } from '@sag/shared/core'
import { type GeneratorConfig } from '@sag/types'
import { CertRotateGenerator } from './generator'

export function createCertRotateTopic(certManager: ICertificateManager) {
  const generator = new CertRotateGenerator(certManager)

  return {
    id: 'cert-rotate',
    name: 'Certificate Rotation',
    rotate: (config: GeneratorConfig) => generator.rotate(config),
    batchRotate: (config: GeneratorConfig) => generator.batchRotate(config),
    revokeOld: (config: GeneratorConfig) => generator.revokeOld(config),
  }
}
