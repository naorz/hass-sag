import { cli } from '@sag/utils'
import { type IZoneSettingsManager, type IWafRuleManager, type HealthCheckResult } from '@sag/core'
import { type CfCertificateManager } from '@sag/providers'
import { type GeneratorConfig } from '@sag/types'
import { ALL_CHECKS, type CheckContext } from './checks'

export class HassVerifyGenerator {
  constructor(
    private settings: IZoneSettingsManager,
    private certificates: CfCertificateManager,
    private wafManager: IWafRuleManager,
  ) {}

  async runFullCheck(config: GeneratorConfig): Promise<void> {
    cli.printSection('HASS Configuration Verification')
    cli.printInfo('Checking Cloudflare zone settings for Home Assistant compatibility...\n')

    const ctx: CheckContext = {
      settings: this.settings,
      certificates: this.certificates,
      wafManager: this.wafManager,
      config,
    }

    const results: HealthCheckResult[] = []

    for (const check of ALL_CHECKS) {
      try {
        const result = await check(ctx)
        results.push(result)

        const icon = result.status === 'pass' ? '✓' : result.status === 'warning' ? '!' : '✗'
        const color =
          result.status === 'pass' ? 'green' : result.status === 'warning' ? 'yellow' : 'red'

        if (color === 'green') cli.printSuccess(`${icon} ${result.name}: ${result.message}`)
        else if (color === 'yellow') cli.printWarning(`${icon} ${result.name}: ${result.message}`)
        else cli.printError(`${icon} ${result.name}: ${result.message}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        cli.printError(`✗ Check failed: ${msg}`)
      }
    }

    // Summary
    const passed = results.filter((r) => r.status === 'pass').length
    const warnings = results.filter((r) => r.status === 'warning').length
    const failed = results.filter((r) => r.status === 'fail').length

    console.log()
    cli.printInfo(`Results: ${passed} passed, ${warnings} warnings, ${failed} failed`)

    if (failed === 0 && warnings === 0) {
      cli.printSuccess('All checks passed! Your CF config is ready for HASS.')
      return
    }

    // Offer to auto-fix
    const fixable = results.filter((r) => r.status !== 'pass' && r.fixable)
    if (fixable.length === 0) return

    const autoFix = await cli.confirm(`Auto-fix ${fixable.length} issue(s)?`)
    if (!autoFix) return

    for (const result of fixable) {
      if (result.fix) {
        try {
          await result.fix()
          cli.printSuccess(`Fixed: ${result.name}`)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          cli.printError(`Failed to fix ${result.name}: ${msg}`)
        }
      }
    }
  }
}
