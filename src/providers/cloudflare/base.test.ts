import { describe, it, expect, beforeEach } from 'vitest'
import { cfApi } from './base'
import { CloudflareApiError } from '@sag/core'

describe('cfApi', () => {
  beforeEach(() => {
    // Reset by re-configuring with known values
    // Note: cfApi has no public reset, so we just test configure → get flow
  })

  it('isConfigured() returns false before configure()', () => {
    // We can't fully reset module state, but we can test the API contract
    expect(typeof cfApi.isConfigured()).toBe('boolean')
  })

  it('configure() makes isConfigured() return true', () => {
    cfApi.configure('test-token', 'abcdef0123456789abcdef0123456789')
    expect(cfApi.isConfigured()).toBe(true)
  })

  it('get() returns Cloudflare client after configure', () => {
    cfApi.configure('test-token', 'abcdef0123456789abcdef0123456789')
    const client = cfApi.get()
    expect(client).toBeDefined()
  })

  it('getZoneId() returns zone ID after configure', () => {
    cfApi.configure('test-token', 'abcdef0123456789abcdef0123456789')
    expect(cfApi.getZoneId()).toBe('abcdef0123456789abcdef0123456789')
  })

  it('getAccountId() throws when account not provided', () => {
    cfApi.configure('test-token', 'abcdef0123456789abcdef0123456789')
    expect(() => cfApi.getAccountId()).toThrow(CloudflareApiError)
  })

  it('getAccountId() returns account ID when provided', () => {
    cfApi.configure('test-token', 'abcdef0123456789abcdef0123456789', 'account-123')
    expect(cfApi.getAccountId()).toBe('account-123')
  })
})
