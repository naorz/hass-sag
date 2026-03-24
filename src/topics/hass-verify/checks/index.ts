import {
  type IZoneSettingsManager,
  type IWafRuleManager,
  type ICertificateManager,
  type HealthCheckResult,
} from '@sag/core'
import { type GeneratorConfig } from '@sag/types'

export interface CheckContext {
  settings: IZoneSettingsManager
  certificates: ICertificateManager
  wafManager: IWafRuleManager
  config: GeneratorConfig
}

type CheckFn = (ctx: CheckContext) => Promise<HealthCheckResult>

const checkWebsockets: CheckFn = async (ctx) => {
  const settings = await ctx.settings.getSettings()
  return {
    name: 'WebSocket Support',
    status: settings.websockets ? 'pass' : 'fail',
    message: settings.websockets
      ? 'WebSocket enabled'
      : 'WebSocket disabled — HASS real-time updates will not work',
    fixable: true,
    fix: async () => ctx.settings.updateSetting('websockets', 'on'),
  }
}

const checkHttp2: CheckFn = async (ctx) => {
  const settings = await ctx.settings.getSettings()
  return {
    name: 'HTTP/2',
    status: settings.http2 ? 'pass' : 'warning',
    message: settings.http2 ? 'HTTP/2 enabled' : 'HTTP/2 disabled — recommended for performance',
    fixable: true,
    fix: async () => ctx.settings.updateSetting('http2', 'on'),
  }
}

const checkSslMode: CheckFn = async (ctx) => {
  const settings = await ctx.settings.getSettings()
  const isGood = settings.ssl_mode === 'full' || settings.ssl_mode === 'strict'
  return {
    name: 'SSL/TLS Mode',
    status: isGood ? 'pass' : 'fail',
    message: isGood
      ? `SSL mode: ${settings.ssl_mode}`
      : `SSL mode "${settings.ssl_mode}" — should be "full" or "strict" for mTLS`,
    fixable: true,
    fix: async () => ctx.settings.updateSetting('ssl', 'strict'),
  }
}

const checkMinTls: CheckFn = async (ctx) => {
  const settings = await ctx.settings.getSettings()
  const version = parseFloat(settings.min_tls_version)
  const isGood = version >= 1.2
  return {
    name: 'Minimum TLS Version',
    status: isGood ? 'pass' : 'warning',
    message: isGood
      ? `Min TLS: ${settings.min_tls_version}`
      : `Min TLS ${settings.min_tls_version} — recommend 1.2+`,
    fixable: true,
    fix: async () => ctx.settings.updateSetting('min_tls_version', '1.2'),
  }
}

const checkHttpsRewrites: CheckFn = async (ctx) => {
  const settings = await ctx.settings.getSettings()
  return {
    name: 'Automatic HTTPS Rewrites',
    status: settings.automatic_https_rewrites ? 'pass' : 'warning',
    message: settings.automatic_https_rewrites
      ? 'HTTPS rewrites enabled'
      : 'HTTPS rewrites disabled — recommended for consistent HTTPS',
    fixable: true,
    fix: async () => ctx.settings.updateSetting('automatic_https_rewrites', 'on'),
  }
}

const checkCertHosts: CheckFn = async (ctx) => {
  const hostname = ctx.config.haSubdomain
    ? `${ctx.config.haSubdomain}.${ctx.config.domain}`
    : ctx.config.domain

  try {
    const hosts = await ctx.certificates.getHostnameAssociations()
    const hasHost = hosts.some((h) => h === hostname || h === `*.${ctx.config.domain}`)
    return {
      name: 'Certificate Hostname Associations',
      status: hasHost ? 'pass' : 'fail',
      message: hasHost
        ? `Hostname "${hostname}" is in the client cert hosts list`
        : `Hostname "${hostname}" NOT found in client cert hosts — CF will not request the certificate`,
      fixable: true,
      fix: async () => {
        const current = await ctx.certificates.getHostnameAssociations()
        await ctx.certificates.setHostnameAssociations([...current, hostname])
      },
    }
  } catch {
    return {
      name: 'Certificate Hostname Associations',
      status: 'warning',
      message: 'Could not check hostname associations',
      fixable: false,
    }
  }
}

const checkMtlsSkipRule: CheckFn = async (ctx) => {
  const hostname = ctx.config.haSubdomain
    ? `${ctx.config.haSubdomain}.${ctx.config.domain}`
    : ctx.config.domain

  try {
    const rules = await ctx.wafManager.listRules()
    const skipRule = rules.find(
      (r) =>
        r.action === 'skip' &&
        r.enabled &&
        (r.expression.includes('cf.tls_client_auth.cert_verified') ||
          r.expression.includes(hostname)),
    )

    if (!skipRule) {
      return {
        name: 'mTLS Skip Rule',
        status: 'fail',
        message:
          'No active mTLS skip rule found — cert-verified clients will still go through WAF checks',
        fixable: false,
      }
    }

    const isFirst = rules[0]?.id === skipRule.id
    if (!isFirst) {
      return {
        name: 'mTLS Skip Rule Priority',
        status: 'warning',
        message: `mTLS skip rule exists but is not first (position ${rules.indexOf(skipRule) + 1}) — ensure it has highest priority`,
        fixable: true,
        fix: async () => {
          const reordered = [
            skipRule.id,
            ...rules.filter((r) => r.id !== skipRule.id).map((r) => r.id),
          ]
          await ctx.wafManager.reorderRules(reordered)
        },
      }
    }

    return {
      name: 'mTLS Skip Rule',
      status: 'pass',
      message: `mTLS skip rule active at position 1 (${skipRule.description})`,
      fixable: false,
    }
  } catch {
    return {
      name: 'mTLS Skip Rule',
      status: 'warning',
      message: 'Could not check WAF rules',
      fixable: false,
    }
  }
}

export const ALL_CHECKS: CheckFn[] = [
  checkWebsockets,
  checkHttp2,
  checkSslMode,
  checkMinTls,
  checkHttpsRewrites,
  checkCertHosts,
  checkMtlsSkipRule,
]
