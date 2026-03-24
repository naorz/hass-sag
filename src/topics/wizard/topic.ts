import { WizardGenerator } from './generator'
import {
  type ICertificateManager,
  type IWafRuleManager,
  type IZoneSettingsManager,
} from '@sag/core'
import { type GeneratorConfig } from '@sag/types'

export function createWizardTopic(
  certManager: ICertificateManager,
  wafManager: IWafRuleManager,
  settingsManager: IZoneSettingsManager,
) {
  const gen = new WizardGenerator(certManager, wafManager, settingsManager)
  return {
    run: (config: GeneratorConfig) => gen.run(config),
  }
}
