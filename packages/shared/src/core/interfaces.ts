import {
  type CertificateInfo,
  type WafRule,
  type WafRuleInput,
  type AccessPolicy,
  type ZoneSettings,
  type ZoneSetting,
} from './types'

export interface ICertificateManager {
  uploadCsr(csr: string, validityDays?: number): Promise<CertificateInfo>
  listCertificates(): Promise<CertificateInfo[]>
  getCertificate(id: string): Promise<CertificateInfo>
  revokeCertificate(id: string): Promise<void>
  getHostnameAssociations(): Promise<string[]>
  setHostnameAssociations(hostnames: string[]): Promise<void>
}

export interface IWafRuleManager {
  listRules(): Promise<WafRule[]>
  createRule(rule: WafRuleInput): Promise<WafRule>
  updateRule(id: string, rule: Partial<WafRuleInput>): Promise<WafRule>
  deleteRule(id: string): Promise<void>
  reorderRules(ruleIds: string[]): Promise<void>
}

export interface IZoneSettingsManager {
  getSettings(): Promise<ZoneSettings>
  getSetting(settingId: string): Promise<ZoneSetting>
  updateSetting(settingId: string, value: string | boolean | number): Promise<void>
}

export interface IAccessPolicyManager {
  listPolicies(applicationId: string): Promise<AccessPolicy[]>
  createEmailOtpPolicy(applicationId: string, name: string, emails: string[]): Promise<AccessPolicy>
}
