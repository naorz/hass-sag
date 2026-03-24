import { MtlsGenerator } from './generator'
import { type GeneratorConfig } from '@sag/types'

export const mtlsTopic = {
  id: 'mtls',
  name: 'mTLS & Apple Profile',
  run: async (config: GeneratorConfig) => {
    const generator = new MtlsGenerator()
    await generator.generateIdentity(config)
    await generator.generateAppleProfile(config)
  },
  generateIdentity: async (config: GeneratorConfig) => {
    const generator = new MtlsGenerator()
    await generator.generateIdentity(config)
  },
  generateP12: async (config: GeneratorConfig) => {
    const generator = new MtlsGenerator()
    await generator.generateP12(config)
  },
  generateAppleProfile: async (config: GeneratorConfig) => {
    const generator = new MtlsGenerator()
    await generator.generateAppleProfile(config)
  },
  signAppleProfile: async (config: GeneratorConfig) => {
    const generator = new MtlsGenerator()
    await generator.signAppleProfile(config)
  },
  createSigningIdentity: async (config: GeneratorConfig) => {
    const generator = new MtlsGenerator()
    await generator.createSigningIdentity(config)
  },
  deleteSigningIdentity: async (config: GeneratorConfig) => {
    const generator = new MtlsGenerator()
    await generator.deleteSigningIdentity(config)
  },
  verifyMtlsConnection: async (config: GeneratorConfig) => {
    const generator = new MtlsGenerator()
    await generator.verifyMtlsConnection(config)
  },
}
