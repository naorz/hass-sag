import { z } from 'zod'

const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i

export const OPERATION_MODES = {
  FULL_SETUP: 'FULL_SETUP',
  MTLS_ONLY: 'MTLS_ONLY',
  APPLE_PROFILE_ONLY: 'APPLE_PROFILE_ONLY',
  PORTAL_ONLY: 'PORTAL_ONLY',
  GITHUB_SSH: 'GITHUB_SSH',
} as const

export const PLATFORMS = {
  MACOS: 'macos',
  IOS: 'ios',
  WINDOWS: 'windows',
  LINUX: 'linux',
  ANDROID: 'android',
} as const

export const CERT_STRATEGIES = {
  WILDCARD: 'wildcard',
  MULTI_SUBDOMAIN: 'multi-subdomain',
  PER_SUBDOMAIN: 'per-subdomain',
} as const

export const DISTRIBUTION_METHODS = {
  CF_ACCESS: 'cf-access',
  PORTAL: 'portal',
} as const

const OperationModeSchema = z.enum([
  OPERATION_MODES.FULL_SETUP,
  OPERATION_MODES.MTLS_ONLY,
  OPERATION_MODES.APPLE_PROFILE_ONLY,
  OPERATION_MODES.PORTAL_ONLY,
  OPERATION_MODES.GITHUB_SSH,
])

const PlatformSchema = z.enum([
  PLATFORMS.MACOS,
  PLATFORMS.IOS,
  PLATFORMS.WINDOWS,
  PLATFORMS.LINUX,
  PLATFORMS.ANDROID,
])

const CertStrategySchema = z.enum([
  CERT_STRATEGIES.WILDCARD,
  CERT_STRATEGIES.MULTI_SUBDOMAIN,
  CERT_STRATEGIES.PER_SUBDOMAIN,
])

const DistributionMethodSchema = z.enum([
  DISTRIBUTION_METHODS.CF_ACCESS,
  DISTRIBUTION_METHODS.PORTAL,
])

const FamilyMemberSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  platforms: z.array(PlatformSchema).default([]),
  cfCertId: z.string().optional(), // CF-issued certificate ID (for revocation)
})

const CloudflareConfigSchema = z.object({
  zoneId: z.string().min(1).optional(),
  accountId: z.string().min(1).optional(),
})

const DistributionConfigSchema = z.object({
  method: DistributionMethodSchema.default(DISTRIBUTION_METHODS.CF_ACCESS),
  emails: z.array(z.string().email()).default([]),
})

export const GeneratorConfigSchema = z.object({
  mode: OperationModeSchema.default(OPERATION_MODES.FULL_SETUP),
  workDir: z.string().default('sag-output'),
  domain: z.string().regex(domainRegex, 'Invalid domain format').default('').or(z.literal('')),
  haSubdomain: z.string().default(''),
  portalSubdomain: z.string().default('setup'),
  subdomains: z.array(z.string()).default([]),
  certStrategy: CertStrategySchema.default(CERT_STRATEGIES.WILDCARD),
  platforms: z.array(PlatformSchema).default([]),
  cloudflare: CloudflareConfigSchema.optional(),
  distribution: DistributionConfigSchema.optional(),
  family: z.array(FamilyMemberSchema).default([]),
  geoBlockCountry: z.string().length(2).toUpperCase().optional(),
})

export type OperationModeValue = z.infer<typeof OperationModeSchema>
export type Platform = z.infer<typeof PlatformSchema>
export type CertStrategy = z.infer<typeof CertStrategySchema>
export type DistributionMethod = z.infer<typeof DistributionMethodSchema>
export type FamilyMember = z.infer<typeof FamilyMemberSchema>
export type CloudflareConfig = z.infer<typeof CloudflareConfigSchema>
export type GeneratorConfig = z.infer<typeof GeneratorConfigSchema>
