import Cloudflare from 'cloudflare'
import { CloudflareApiError } from '@sag/core'

let cfClient: Cloudflare | undefined
let zoneId: string | undefined
let accountId: string | undefined

export const cfApi = {
  configure(token: string, zone: string, account?: string): void {
    cfClient = new Cloudflare({ apiToken: token })
    zoneId = zone
    accountId = account
  },

  get(): Cloudflare {
    if (!cfClient) {
      throw new CloudflareApiError('Cloudflare client not configured. Set up your API token first.')
    }
    return cfClient
  },

  getZoneId(): string {
    if (!zoneId) throw new CloudflareApiError('Zone ID not configured')
    return zoneId
  },

  getAccountId(): string {
    if (!accountId) throw new CloudflareApiError('Account ID not configured')
    return accountId
  },

  isConfigured(): boolean {
    return !!(cfClient && zoneId)
  },

  /** Reset all state — intended for use in tests to prevent state bleed between test cases. */
  reset(): void {
    cfClient = undefined
    zoneId = undefined
    accountId = undefined
  },
}
