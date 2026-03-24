import { type IWafRuleManager } from '@sag/shared/core'
import { type GeneratorConfig } from '@sag/types'
import { WafGenerator } from './generator'

export function createWafTopic(wafManager: IWafRuleManager) {
  const generator = new WafGenerator(wafManager)

  return {
    id: 'waf',
    name: 'WAF Rule Management',
    viewRules: (config: GeneratorConfig) => generator.viewRules(config),
    createMtlsSkipRule: (config: GeneratorConfig) => generator.createMtlsSkipRule(config),
    createBlockRule: (config: GeneratorConfig) => generator.createBlockRule(config),
    createGeoBlockRule: (config: GeneratorConfig) => generator.createGeoBlockRule(config),
    toggleRule: (config: GeneratorConfig) => generator.toggleRule(config),
    optimizeRules: (config: GeneratorConfig) => generator.optimizeRules(config),
    deleteRule: (config: GeneratorConfig) => generator.deleteRule(config),
    reorderRules: (config: GeneratorConfig) => generator.reorderRules(config),
  }
}
