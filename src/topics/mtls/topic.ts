import { MtlsGenerator } from './generator';
import { type GeneratorConfig } from '@sag/types';

export const mtlsTopic = {
  id: 'mtls',
  name: 'mTLS & Apple Profile',
  run: async (config: GeneratorConfig) => {
    const generator = new MtlsGenerator();
    await generator.generateCertificates(config);
    await generator.generateAppleProfile(config);
  },
};
