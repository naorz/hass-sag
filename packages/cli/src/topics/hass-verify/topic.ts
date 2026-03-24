import { type IZoneSettingsManager, type IWafRuleManager } from '@sag/shared/core'
import { type CfCertificateManager } from '@sag/providers'
import { type GeneratorConfig } from '@sag/types'
import { HassVerifyGenerator } from './generator'

export function createHassVerifyTopic(
  settings: IZoneSettingsManager,
  certificates: CfCertificateManager,
  wafManager: IWafRuleManager,
) {
  const generator = new HassVerifyGenerator(settings, certificates, wafManager)

  return {
    id: 'hass-verify',
    name: 'HASS Config Verification',
    run: (config: GeneratorConfig) => generator.runFullCheck(config),
  }
}
