import { describe, it, expect } from 'vitest'
import { GeneratorConfigSchema } from './config.schema'

describe('GeneratorConfigSchema', () => {
  it('parses empty object with defaults', () => {
    const result = GeneratorConfigSchema.parse({})
    expect(result).toBeDefined()
    expect(result.workDir).toBe('sag-output')
    expect(result.platforms).toEqual([])
    expect(result.family).toEqual([])
  })

  it('accepts valid domain', () => {
    const result = GeneratorConfigSchema.parse({ domain: 'example.com' })
    expect(result.domain).toBe('example.com')
  })

  it('rejects invalid domain', () => {
    expect(() => GeneratorConfigSchema.parse({ domain: 'not a domain' })).toThrow()
  })

  it('preserves cloudflare config', () => {
    const result = GeneratorConfigSchema.parse({
      cloudflare: {
        zoneId: 'abcdef0123456789abcdef0123456789',
        accountId: 'account-123',
      },
    })
    expect(result.cloudflare?.zoneId).toBe('abcdef0123456789abcdef0123456789')
    expect(result.cloudflare?.accountId).toBe('account-123')
  })

  it('accepts family members with cfCertId', () => {
    const result = GeneratorConfigSchema.parse({
      family: [
        { name: 'Alice', email: 'alice@example.com', platforms: ['ios'], cfCertId: 'cert-123' },
        { name: 'Bob', email: 'bob@example.com', platforms: ['android'] },
      ],
    })
    expect(result.family).toHaveLength(2)
    expect(result.family[0].cfCertId).toBe('cert-123')
    expect(result.family[1].cfCertId).toBeUndefined()
  })

  it('defaults certStrategy to wildcard', () => {
    const result = GeneratorConfigSchema.parse({})
    expect(result.certStrategy).toBe('wildcard')
  })
})
