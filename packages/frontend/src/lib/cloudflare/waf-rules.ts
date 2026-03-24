import { type IWafRuleManager, type WafRule, type WafRuleInput } from '@sag/shared/core'
import { type CfApiClient, CloudflareApiError } from './client'

const CUSTOM_PHASE = 'http_request_firewall_custom'

const SKIP_PRODUCTS = ['waf', 'rateLimit', 'bic', 'hot', 'securityLevel', 'uaBlock', 'zoneLockdown']
const SKIP_PHASES = ['http_ratelimit', 'http_request_firewall_managed', 'http_request_sbfm']

interface CfRule {
  id?: string
  description?: string
  expression?: string
  action?: string
  enabled?: boolean
  action_parameters?: unknown
}

interface CfRuleset {
  id?: string
  rules?: CfRule[]
}

function toWafRule(cf: CfRule, index: number): WafRule {
  return {
    id: cf.id ?? '',
    description: cf.description ?? '',
    expression: cf.expression ?? '',
    action: cf.action ?? 'block',
    enabled: cf.enabled ?? true,
    position: { index },
  }
}

export class BrowserWafRuleManager implements IWafRuleManager {
  constructor(private readonly client: CfApiClient) {}

  private async getCustomRulesetId(): Promise<string | undefined> {
    try {
      const ruleset = await this.client.get<CfRuleset>(
        `/zones/${this.client.getZoneId()}/rulesets/phases/${CUSTOM_PHASE}/entrypoint`,
      )
      return ruleset.id
    } catch (err) {
      if (err instanceof CloudflareApiError && err.status === 404) return undefined
      throw err
    }
  }

  private async getOrCreateRulesetId(): Promise<string> {
    const existing = await this.getCustomRulesetId()
    if (existing) return existing
    const created = await this.client.post<CfRuleset>(
      `/zones/${this.client.getZoneId()}/rulesets`,
      { name: 'Custom WAF Rules', kind: 'zone', phase: CUSTOM_PHASE, rules: [] },
    )
    if (!created.id) throw new CloudflareApiError('Ruleset created but returned no ID')
    return created.id
  }

  async listRules(): Promise<WafRule[]> {
    try {
      const rulesetId = await this.getCustomRulesetId()
      if (!rulesetId) return []
      const ruleset = await this.client.get<CfRuleset>(
        `/zones/${this.client.getZoneId()}/rulesets/${rulesetId}`,
      )
      return (ruleset.rules ?? []).map((r, i) => toWafRule(r, i))
    } catch (err) {
      if (err instanceof CloudflareApiError) throw err
      throw new CloudflareApiError(
        `Failed to list WAF rules: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  async createRule(input: WafRuleInput): Promise<WafRule> {
    try {
      const rulesetId = await this.getOrCreateRulesetId()
      const body: Record<string, unknown> = {
        description: input.description,
        expression: input.expression,
        action: input.action,
        enabled: input.enabled ?? true,
      }
      if (input.action === 'skip') {
        body.action_parameters = {
          products: SKIP_PRODUCTS,
          phases: SKIP_PHASES,
          ruleset: 'current',
        }
      }
      const result = await this.client.post<CfRuleset>(
        `/zones/${this.client.getZoneId()}/rulesets/${rulesetId}/rules`,
        body,
      )
      const rules = result.rules ?? []
      return toWafRule(rules[rules.length - 1] ?? {}, rules.length - 1)
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
      const result = await this.client.patch<CfRuleset>(
        `/zones/${this.client.getZoneId()}/rulesets/${rulesetId}/rules/${id}`,
        input,
      )
      const rules = result.rules ?? []
      const updated = rules.find((r) => r.id === id) ?? rules[0] ?? {}
      return toWafRule(updated, 0)
    } catch (err) {
      if (err instanceof CloudflareApiError) throw err
      throw new CloudflareApiError(
        `Failed to update WAF rule: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  async deleteRule(id: string): Promise<void> {
    try {
      const rulesetId = await this.getOrCreateRulesetId()
      await this.client.delete(
        `/zones/${this.client.getZoneId()}/rulesets/${rulesetId}/rules/${id}`,
      )
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
      const ruleset = await this.client.get<CfRuleset>(
        `/zones/${this.client.getZoneId()}/rulesets/${rulesetId}`,
      )
      const current = ruleset.rules ?? []
      const reordered = ruleIds
        .map((id) => current.find((r) => r.id === id))
        .filter((r): r is CfRule => r !== undefined)
      await this.client.put(`/zones/${this.client.getZoneId()}/rulesets/${rulesetId}`, {
        rules: reordered,
      })
    } catch (err) {
      if (err instanceof CloudflareApiError) throw err
      throw new CloudflareApiError(
        `Failed to reorder WAF rules: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }
}
