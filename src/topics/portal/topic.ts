import { PortalGenerator } from './generator';
import { type GeneratorConfig } from '@sag/types';

export const portalTopic = {
  id: 'portal',
  name: 'Portal Configuration',
  run: async (config: GeneratorConfig) => {
    const generator = new PortalGenerator();
    await generator.run(config);
  },
};
