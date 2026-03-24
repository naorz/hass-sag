import { TokenGenerator } from './generator'
import { type GeneratorConfig } from '@sag/types'

const gen = new TokenGenerator()

export const tokenTopic = {
  configure: (config: GeneratorConfig) => gen.configure(config),
  validate: (config: GeneratorConfig) => gen.validate(config),
  clear: () => gen.clear(),
}
