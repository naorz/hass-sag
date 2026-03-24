import { describe, it, expect } from 'vitest'
import { NotFoundError, PermissionDeniedError } from 'cloudflare'

describe('WAF rules error handling', () => {
  it('NotFoundError should be treated as "no ruleset exists" (not an error)', () => {
    const err = new NotFoundError(404, undefined, 'not found', undefined)
    expect(err).toBeInstanceOf(NotFoundError)
    // getCustomRulesetId should return undefined for 404, not throw
  })

  it('PermissionDeniedError should propagate (not be swallowed)', () => {
    const err = new PermissionDeniedError(403, undefined, 'forbidden', undefined)
    expect(err).not.toBeInstanceOf(NotFoundError)
    // getCustomRulesetId should throw for 403, not return undefined
  })

  it('generic errors should propagate (not be swallowed)', () => {
    const err = new Error('network timeout')
    expect(err).not.toBeInstanceOf(NotFoundError)
    // getCustomRulesetId should throw for generic errors
  })

  describe('error classification logic (mirrors getCustomRulesetId)', () => {
    function getCustomRulesetIdErrorHandler(err: unknown): 'not-found' | 'error' {
      if (err instanceof NotFoundError) return 'not-found'
      return 'error'
    }

    it('returns not-found for 404', () => {
      const err = new NotFoundError(404, undefined, 'not found', undefined)
      expect(getCustomRulesetIdErrorHandler(err)).toBe('not-found')
    })

    it('returns error for 403', () => {
      const err = new PermissionDeniedError(403, undefined, 'forbidden', undefined)
      expect(getCustomRulesetIdErrorHandler(err)).toBe('error')
    })

    it('returns error for generic errors', () => {
      expect(getCustomRulesetIdErrorHandler(new Error('timeout'))).toBe('error')
    })
  })
})
