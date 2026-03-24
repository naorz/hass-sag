import {
  type IWafRuleManager,
  type WafRule,
  type WafRuleInput,
  CloudflareApiError,
} from '@sag/shared/core'
import { cli } from '@sag/utils'
import { cfApi } from './base'
import { NotFoundError } from 'cloudflare'

const CUSTOM_FIREWALL_PHASE = 'http_request_firewall_custom' as const

// Products to skip when action is 'skip' — bypasses WAF, rate limiting, managed rules, SBFM
const SKIP_PRODUCTS = [
  'waf',
  'rateLimit',
  'bic',
  'hot',
  'securityLevel',
  'uaBlock',
  'zoneLockdown',
] as const
const SKIP_PHASES = [
  'http_ratelimit',
  'http_request_firewall_managed',
  'http_request_sbfm',
] as const

export class CfWafRuleManager implements IWafRuleManager {
  private async getCustomRulesetId(): Promise<string | undefined> {
    try {
      const ruleset = await cfApi.get().rulesets.phases.get(CUSTOM_FIREWALL_PHASE, {
        zone_id: cfApi.getZoneId(),
      })
      return ruleset.id
    } catch (err) {
      // 404 means no custom ruleset exists yet — that's fine
      if (err instanceof NotFoundError) return undefined
      // Any other error (auth, network, etc.) should propagate
      throw new CloudflareApiError(
        `Failed to fetch custom ruleset: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  private async getOrCreateRulesetId(): Promise<string> {
    const existingId = await this.getCustomRulesetId()
    if (existingId) return existingId

    try {
      const created = await cfApi.get().rulesets.create({
        zone_id: cfApi.getZoneId(),
        name: 'Custom WAF Rules',
        kind: 'zone',
        phase: CUSTOM_FIREWALL_PHASE,
        rules: [],
      })
      return created.id!
    } catch (err) {
      throw new CloudflareApiError(
        `Failed to create custom ruleset: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  async listRules(): Promise<WafRule[]> {
    cli.printInfo('[CF API] Listing WAF custom rules...')
    cli.printInfo('  Verify: Security → WAF → Custom rules tab.')
    try {
      const rulesetId = await this.getCustomRulesetId()
      if (!rulesetId) return []

      const ruleset = await cfApi.get().rulesets.get(rulesetId, { zone_id: cfApi.getZoneId() })
      return (ruleset.rules ?? []).map((r, i) => this.toWafRule(r, i))
    } catch (err) {
      throw new CloudflareApiError(
        `Failed to list WAF rules: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  async createRule(input: WafRuleInput): Promise<WafRule> {
    try {
      const rulesetId = await this.getOrCreateRulesetId()
      const zoneId = cfApi.getZoneId()

      const actionParams =
        input.action === 'skip'
          ? {
              products: [...SKIP_PRODUCTS],
              phases: [...SKIP_PHASES],
              ruleset: 'current',
            }
          : undefined

      cli.printInfo(
        `[CF API] Creating WAF rule: "${input.description}" (action: ${input.action})...`,
      )
      cli.printInfo('  Verify: Security → WAF → Custom rules — new rule should appear.')
      const result = await cfApi.get().rulesets.rules.create(rulesetId, {
        zone_id: zoneId,
        description: input.description,
        expression: input.expression,
        action: input.action as 'skip' | 'block' | 'log' | 'allow',
        enabled: input.enabled ?? true,
        ...(actionParams ? { action_parameters: actionParams } : {}),
      })

      const rules = result.rules ?? []
      const lastRule = rules[rules.length - 1]
      return this.toWafRule(lastRule, rules.length - 1)
    } catch (err) {
      if (err instanceof CloudflareApiError) throw err
      throw new CloudflareApiError(
        `Failed to create WAF rule: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  async updateRule(id: string, input: Partial<WafRuleInput>): Promise<WafRule> {
    try {
      const rulesetId = await this.getOrCreateRulesetId()
      const result = await cfApi.get().rulesets.rules.edit(rulesetId, id, {
        zone_id: cfApi.getZoneId(),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.expression !== undefined ? { expression: input.expression } : {}),
        ...(input.action !== undefined
          ? { action: input.action as 'skip' | 'block' | 'log' | 'allow' }
          : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      })

      const rules = result.rules ?? []
      const updatedRule = rules.find((r) => r.id === id) ?? rules[0]
      return this.toWafRule(updatedRule, 0)
    } catch (err) {
      if (err instanceof CloudflareApiError) throw err
      throw new CloudflareApiError(
        `Failed to update WAF rule: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  async deleteRule(id: string): Promise<void> {
    cli.printInfo(`[CF API] Deleting WAF rule (${id.substring(0, 8)}...)...`)
    cli.printInfo('  Verify: Security → WAF → Custom rules — rule should be removed.')
    try {
      const rulesetId = await this.getOrCreateRulesetId()
      await cfApi.get().rulesets.rules.delete(rulesetId, id, { zone_id: cfApi.getZoneId() })
    } catch (err) {
      if (err instanceof CloudflareApiError) throw err
      throw new CloudflareApiError(
        `Failed to delete WAF rule: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  async reorderRules(ruleIds: string[]): Promise<void> {
    try {
      const rulesetId = await this.getOrCreateRulesetId()
      const zoneId = cfApi.getZoneId()

      const ruleset = await cfApi.get().rulesets.get(rulesetId, { zone_id: zoneId })
      const currentRules = ruleset.rules ?? []

      const reorderedRules = ruleIds
        .map((id) => currentRules.find((r) => r.id === id))
        .filter((r): r is NonNullable<typeof r> => r !== undefined)

      await cfApi.get().rulesets.update(rulesetId, {
        zone_id: zoneId,
        rules: reorderedRules,
      })
    } catch (err) {
      if (err instanceof CloudflareApiError) throw err
      throw new CloudflareApiError(
        `Failed to reorder WAF rules: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  private toWafRule(
    cf: {
      id?: string
      description?: string
      expression?: string
      action?: string
      enabled?: boolean
    },
    index: number,
  ): WafRule {
    return {
      id: cf.id ?? '',
      description: cf.description ?? '',
      expression: cf.expression ?? '',
      action: cf.action ?? 'block',
      enabled: cf.enabled ?? true,
      position: { index },
    }
  }
}
