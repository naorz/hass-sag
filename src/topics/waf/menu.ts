import { type Menu } from '@sag/menu'
import { type IWafRuleManager } from '@sag/core'
import { type GeneratorConfig, type Requirement } from '@sag/types'
import { createWafTopic } from './topic'

export const registerWafMenu = (
  menu: Menu,
  config: GeneratorConfig,
  wafManager: IWafRuleManager,
  requirements: Requirement[] = [],
) => {
  const topic = createWafTopic(wafManager)

  menu.addOption(
    'WAF: View Current Rules',
    'waf-view',
    topic.viewRules,
    config,
    requirements,
    'Show all custom rules and free tier usage',
  )
  menu.addOption(
    'WAF: Create mTLS Skip Rule',
    'waf-mtls-skip',
    topic.createMtlsSkipRule,
    config,
    requirements,
    'Skip WAF for verified mTLS clients',
  )
  menu.addOption(
    'WAF: Create Block Rule',
    'waf-block',
    topic.createBlockRule,
    config,
    requirements,
    'Block traffic without valid client certificate',
  )
  menu.addOption(
    'WAF: Create Geo-Block Rule',
    'waf-geo-block',
    topic.createGeoBlockRule,
    config,
    requirements,
    'Block non-cert visitors from outside a specific country (optional)',
  )
  menu.addOption(
    'WAF: Enable/Disable Rule',
    'waf-toggle',
    topic.toggleRule,
    config,
    requirements,
    'Toggle a WAF rule on or off without deleting it',
  )
  menu.addOption(
    'WAF: Reorder Rules',
    'waf-reorder',
    topic.reorderRules,
    config,
    requirements,
    'Change rule evaluation order — skip rules must come before block rules',
  )
  menu.addOption(
    'WAF: Optimize Rules',
    'waf-optimize',
    topic.optimizeRules,
    config,
    requirements,
    'Suggest combining rules to save free tier slots',
  )
  menu.addOption(
    'WAF: Delete Rule',
    'waf-delete',
    topic.deleteRule,
    config,
    requirements,
    'Permanently remove a WAF custom rule from your zone',
  )
}
