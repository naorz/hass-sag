import { cli } from '@sag/utils'
import { type IWafRuleManager, type WafRule } from '@sag/core'
import { type GeneratorConfig } from '@sag/types'

const MAX_FREE_RULES = 5

export class WafGenerator {
  constructor(private wafManager: IWafRuleManager) {}

  async viewRules(config: GeneratorConfig): Promise<void> {
    cli.printSection('WAF Custom Rules')
    const rules = await this.wafManager.listRules()

    if (rules.length === 0) {
      cli.printInfo('No custom WAF rules found.')
      return
    }

    cli.printInfo(`Rules: ${rules.length}/${MAX_FREE_RULES} (free tier limit)\n`)

    const hostname = config.haSubdomain ? `${config.haSubdomain}.${config.domain}` : config.domain
    const mtlsRules: { index: number; rule: WafRule }[] = []

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i]
      const status = rule.enabled ? '✓' : '✗'
      const num = `${i + 1}.`
      const isMtls = this.isMtlsRelated(rule)
      const mtlsTag = isMtls ? ' (mTLS)' : ''

      if (isMtls) mtlsRules.push({ index: i, rule })

      console.log(`  ${status} ${num} ${rule.description}${mtlsTag}`)
      console.log(`    Action: ${rule.action}`)
      console.log(`    Expression: ${rule.expression}`)
      console.log(`    ID: ${rule.id}\n`)
    }

    if (rules.length >= MAX_FREE_RULES) {
      cli.printWarning(
        `Free tier limit reached (${MAX_FREE_RULES}/${MAX_FREE_RULES}). Use "Optimize Rules" to combine rules and free up slots.`,
      )
    } else {
      cli.printInfo(`${MAX_FREE_RULES - rules.length} rule slot(s) available.`)
    }

    // mTLS-specific suggestions
    if (mtlsRules.length > 0 && hostname) {
      console.log()
      cli.printInfo('mTLS rule analysis:')
      for (const { index, rule } of mtlsRules) {
        const expr = rule.expression
        const coversHostname = expr.includes(hostname)
        const isSkip = rule.action === 'skip'
        const isBlock = rule.action === 'block'
        const hasWildcard = expr.includes(`*.${config.domain}`)
        const hasCertVerified = expr.includes('cf.tls_client_auth.cert_verified')

        if (isSkip && !coversHostname && !hasWildcard) {
          cli.printWarning(
            `  Rule #${index + 1}: skip rule does not cover "${hostname}" — your HA traffic may not bypass WAF.`,
          )
        }
        if (isBlock && !coversHostname && !hasWildcard) {
          cli.printWarning(
            `  Rule #${index + 1}: block rule does not cover "${hostname}" — non-cert traffic may not be blocked.`,
          )
        }
        if (isSkip && coversHostname && hasCertVerified) {
          cli.printSuccess(
            `  Rule #${index + 1}: correctly skips WAF for verified certs on "${hostname}".`,
          )
        }
        if (isBlock && coversHostname && hasCertVerified) {
          cli.printSuccess(
            `  Rule #${index + 1}: correctly blocks non-cert traffic on "${hostname}".`,
          )
        }
      }

      // Check for missing rules
      const hasSkipForHost = mtlsRules.some(
        ({ rule }) =>
          rule.action === 'skip' &&
          (rule.expression.includes(hostname) || rule.expression.includes(`*.${config.domain}`)),
      )
      const hasBlockForHost = mtlsRules.some(
        ({ rule }) =>
          rule.action === 'block' &&
          (rule.expression.includes(hostname) || rule.expression.includes(`*.${config.domain}`)),
      )

      if (!hasSkipForHost) {
        cli.printWarning(
          `  Missing: no mTLS skip rule for "${hostname}". Use "Create mTLS Skip Rule" to add one.`,
        )
      }
      if (!hasBlockForHost) {
        cli.printWarning(
          `  Missing: no mTLS block rule for "${hostname}". Use "Create Block Rule" to add one.`,
        )
      }

      if (mtlsRules.length > 0) {
        const skipRules = mtlsRules.filter(({ rule }) => rule.action === 'skip')
        if (skipRules.length > 1 && rules.length >= MAX_FREE_RULES) {
          cli.printInfo(
            `  Tip: you have ${skipRules.length} skip rules that could be combined into 1 to free up ${skipRules.length - 1} slot(s). Use "Optimize Rules".`,
          )
        }
      }
    }
  }

  private isMtlsRelated(rule: WafRule): boolean {
    const text = `${rule.description} ${rule.expression}`.toLowerCase()
    return (
      text.includes('mtls') ||
      text.includes('tls_client_auth') ||
      text.includes('cert_verified') ||
      text.includes('client cert') ||
      text.includes('mutual tls')
    )
  }

  async createMtlsSkipRule(config: GeneratorConfig): Promise<void> {
    cli.printSection('Create mTLS Skip Rule')

    const rules = await this.wafManager.listRules()
    if (rules.length >= MAX_FREE_RULES) {
      cli.printError(`Cannot create rule — at ${MAX_FREE_RULES}/${MAX_FREE_RULES} limit.`)
      cli.printInfo('Delete or optimize existing rules first.')
      return
    }

    const hostname = config.haSubdomain ? `${config.haSubdomain}.${config.domain}` : config.domain

    const useMultipleHosts = await cli.confirm('Add multiple hostnames to this rule?')
    let expression: string

    if (useMultipleHosts) {
      const hostsInput = await cli.ask('Enter hostnames (comma-separated)', hostname)
      const hosts = hostsInput
        .split(',')
        .map((h) => h.trim())
        .filter(Boolean)
      const hostConditions = hosts.map((h) => `http.host eq "${h}"`).join(' or ')
      expression = `(cf.tls_client_auth.cert_verified and (${hostConditions}))`
    } else {
      expression = `(cf.tls_client_auth.cert_verified and http.host eq "${hostname}")`
    }

    const description = await cli.ask('Rule description', `mTLS skip for ${hostname}`)

    const rule = await this.wafManager.createRule({
      description,
      expression,
      action: 'skip',
      enabled: true,
    })

    cli.printSuccess(`Rule created: ${rule.description} (${rule.id})`)
    cli.printInfo(
      'This rule skips WAF, rate limiting, managed rules, and bot protection for verified mTLS clients.',
    )
  }

  async createBlockRule(config: GeneratorConfig): Promise<void> {
    cli.printSection('Create Block Rule (non-mTLS traffic)')

    const rules = await this.wafManager.listRules()
    if (rules.length >= MAX_FREE_RULES) {
      cli.printError(`Cannot create rule — at ${MAX_FREE_RULES}/${MAX_FREE_RULES} limit.`)
      return
    }

    const hostname = config.haSubdomain ? `${config.haSubdomain}.${config.domain}` : config.domain

    const expression = `(not cf.tls_client_auth.cert_verified and http.host eq "${hostname}")`
    const description = await cli.ask('Rule description', `Block non-mTLS traffic for ${hostname}`)

    const rule = await this.wafManager.createRule({
      description,
      expression,
      action: 'block',
      enabled: true,
    })

    cli.printSuccess(`Block rule created: ${rule.description} (${rule.id})`)
  }

  async toggleRule(_config: GeneratorConfig): Promise<void> {
    cli.printSection('Enable/Disable Rule')

    const rules = await this.wafManager.listRules()
    if (rules.length === 0) {
      cli.printInfo('No rules to toggle.')
      return
    }

    const choices = rules.map((r, i) => ({
      name: `${i + 1}. ${r.enabled ? '[ON]' : '[OFF]'} ${r.description}`,
      value: r.id,
    }))

    const ruleId = await cli.askChoice('Select rule to toggle', choices)
    const rule = rules.find((r) => r.id === ruleId)
    if (!rule) return

    const newState = !rule.enabled
    await this.wafManager.updateRule(ruleId, { enabled: newState })
    cli.printSuccess(`Rule "${rule.description}" is now ${newState ? 'enabled' : 'disabled'}.`)
  }

  async optimizeRules(_config: GeneratorConfig): Promise<void> {
    cli.printSection('Optimize WAF Rules')

    const rules = await this.wafManager.listRules()
    if (rules.length <= 1) {
      cli.printInfo('Nothing to optimize with 1 or fewer rules.')
      return
    }

    // Find rules that could be combined (same action, hostname-based expressions)
    const skipRules = rules.filter((r) => r.action === 'skip')
    const blockRules = rules.filter((r) => r.action === 'block')

    const suggestions: string[] = []

    if (skipRules.length > 1) {
      suggestions.push(
        `Combine ${skipRules.length} skip rules into 1 using "or" in the expression. ` +
          `This would free up ${skipRules.length - 1} rule slot(s).`,
      )
    }

    if (blockRules.length > 1) {
      suggestions.push(
        `Combine ${blockRules.length} block rules into 1 using "or" in the expression. ` +
          `This would free up ${blockRules.length - 1} rule slot(s).`,
      )
    }

    if (suggestions.length === 0) {
      cli.printSuccess('Rules look optimized — no suggestions.')
      return
    }

    cli.printInfo('Optimization suggestions:')
    suggestions.forEach((s, i) => cli.printInfo(`  ${i + 1}. ${s}`))

    const apply = await cli.confirm('Apply optimizations?')
    if (!apply) return

    if (skipRules.length > 1) {
      await this.combineRules(skipRules, 'skip')
    }
    if (blockRules.length > 1) {
      await this.combineRules(blockRules, 'block')
    }
  }

  async deleteRule(_config: GeneratorConfig): Promise<void> {
    cli.printSection('Delete WAF Rule')

    const rules = await this.wafManager.listRules()
    if (rules.length === 0) {
      cli.printInfo('No rules to delete.')
      return
    }

    const choices = rules.map((r, i) => ({
      name: `${i + 1}. ${r.description} (${r.action})`,
      value: r.id,
    }))

    const ruleId = await cli.askChoice('Select rule to delete', choices)
    const rule = rules.find((r) => r.id === ruleId)
    if (!rule) return

    const confirmed = await cli.confirm(`Delete "${rule.description}"? This cannot be undone.`)
    if (!confirmed) return

    await this.wafManager.deleteRule(ruleId)
    cli.printSuccess('Rule deleted.')
  }

  async createGeoBlockRule(config: GeneratorConfig): Promise<void> {
    cli.printSection('Create Geo-Block Rule (optional extra layer)')

    const rules = await this.wafManager.listRules()
    if (rules.length >= MAX_FREE_RULES) {
      cli.printError(`Cannot create rule — at ${MAX_FREE_RULES}/${MAX_FREE_RULES} limit.`)
      cli.printInfo('Delete or optimize existing rules first.')
      return
    }

    cli.printInfo(
      'This rule blocks non-mTLS visitors from outside a specific country. ' +
        'Cert holders bypass it automatically via the mTLS skip rule.',
    )

    const country = await cli.ask(
      'Country code to ALLOW (visitors outside this country will be blocked)',
      config.geoBlockCountry ?? 'IL',
    )

    const hostname = config.haSubdomain ? `${config.haSubdomain}.${config.domain}` : config.domain

    const expression =
      `(not cf.tls_client_auth.cert_verified and ` +
      `not ip.src.country in {"${country.toUpperCase()}"} and ` +
      `http.host eq "${hostname}")`

    const description = await cli.ask(
      'Rule description',
      `Geo-block (allow ${country.toUpperCase()} only) for ${hostname}`,
    )

    const rule = await this.wafManager.createRule({
      description,
      expression,
      action: 'block',
      enabled: true,
    })

    cli.printSuccess(`Geo-block rule created: ${rule.description} (${rule.id})`)
    cli.printInfo(
      `Non-cert visitors outside "${country.toUpperCase()}" will be blocked. ` +
        'Cert holders bypass this rule regardless of their location.',
    )
  }

  async reorderRules(_config: GeneratorConfig): Promise<void> {
    cli.printSection('Reorder WAF Rules')

    const rules = await this.wafManager.listRules()
    if (rules.length <= 1) {
      cli.printInfo('Need at least 2 rules to reorder.')
      return
    }

    cli.printInfo('Current order:')
    rules.forEach((r, i) => console.log(`  ${i + 1}. ${r.description}`))

    const moveChoice = await cli.askChoice(
      'Select rule to move to position 1 (first)',
      rules.map((r) => ({
        name: r.description,
        value: r.id,
      })),
    )

    const newOrder = [moveChoice, ...rules.filter((r) => r.id !== moveChoice).map((r) => r.id)]
    await this.wafManager.reorderRules(newOrder)
    cli.printSuccess('Rules reordered.')
  }

  private async combineRules(rules: WafRule[], action: string): Promise<void> {
    // Extract hostname expressions and combine with "or"
    const expressions = rules.map((r) => r.expression)
    const combinedExpression = expressions.join(' or ')
    const combinedDescription = `Combined ${action} rule (${rules.length} merged)`

    // Delete old rules
    for (const rule of rules) {
      await this.wafManager.deleteRule(rule.id)
    }

    // Create combined rule
    await this.wafManager.createRule({
      description: combinedDescription,
      expression: combinedExpression,
      action,
      enabled: true,
    })

    cli.printSuccess(`Combined ${rules.length} ${action} rules into 1.`)
  }
}
