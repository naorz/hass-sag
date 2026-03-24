export interface CertificateInfo {
  id: string
  status: 'active' | 'pending_reactivation' | 'pending_revocation' | 'revoked'
  certificate: string
  csr: string
  expires_on: string
  issued_on: string
  serial_number: string
  signature: string
  ski: string
  common_name: string
  hosts: string[]
}

export interface WafRule {
  id: string
  description: string
  expression: string
  action: string
  enabled: boolean
  position?: { index: number }
}

export interface WafRuleInput {
  description: string
  expression: string
  action: string
  enabled?: boolean
}

export interface AccessPolicy {
  id: string
  name: string
  decision: string
  include: AccessPolicyRule[]
}

export interface AccessPolicyRule {
  email?: { email: string }
  email_domain?: { domain: string }
}

export interface ZoneSetting {
  id: string
  value: string | boolean | number
  editable: boolean
}

export interface ZoneSettings {
  websockets: boolean
  http2: boolean
  automatic_https_rewrites: boolean
  min_tls_version: string
  ssl_mode: string
}

export interface HealthCheckResult {
  name: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  fixable: boolean
  fix?: () => Promise<void>
}
