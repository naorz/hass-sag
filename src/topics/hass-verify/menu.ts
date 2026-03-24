import { type Menu } from '@sag/menu'
import { type IZoneSettingsManager, type IWafRuleManager } from '@sag/core'
import { type CfCertificateManager } from '@sag/providers'
import { type GeneratorConfig, type Requirement } from '@sag/types'
import { createHassVerifyTopic } from './topic'

export const registerHassVerifyMenu = (
  menu: Menu,
  config: GeneratorConfig,
  settings: IZoneSettingsManager,
  certificates: CfCertificateManager,
  wafManager: IWafRuleManager,
  requirements: Requirement[] = [],
) => {
  const topic = createHassVerifyTopic(settings, certificates, wafManager)

  menu.addOption(
    'HASS: Verify CF Configuration',
    'hass-verify',
    topic.run,
    config,
    requirements,
    'Check WebSocket, SSL, HTTP/2, cert hosts — auto-fix issues',
  )
}
