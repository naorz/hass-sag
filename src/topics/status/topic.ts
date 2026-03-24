import { type ICertificateManager, type IWafRuleManager } from '@sag/core'
import { type GeneratorConfig } from '@sag/types'
import { StatusGenerator } from './generator'

export function createStatusTopic(certManager?: ICertificateManager, wafManager?: IWafRuleManager) {
  const generator = new StatusGenerator(certManager, wafManager)

  return {
    id: 'status',
    name: 'Status & Health',
    localStatus: (config: GeneratorConfig) => generator.localStatus(config),
    remoteStatus: (config: GeneratorConfig) => generator.remoteStatus(config),
    connectionTest: (config: GeneratorConfig) => generator.connectionTest(config),
  }
}
