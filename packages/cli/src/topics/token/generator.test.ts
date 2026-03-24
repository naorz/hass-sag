import { describe, it, expect } from 'vitest'
import { PermissionDeniedError, AuthenticationError, NotFoundError } from 'cloudflare'
import { isValidCfId } from '@sag/utils'

describe('Token permission check error classification', () => {
  it('PermissionDeniedError is a 403 error', () => {
    const err = new PermissionDeniedError(403, undefined, 'forbidden', undefined)
    expect(err).toBeInstanceOf(PermissionDeniedError)
    expect(err.status).toBe(403)
  })

  it('AuthenticationError is a 401 error', () => {
    const err = new AuthenticationError(401, undefined, 'unauthorized', undefined)
    expect(err).toBeInstanceOf(AuthenticationError)
    expect(err.status).toBe(401)
  })

  it('NotFoundError is a 404 error and is NOT a permission error', () => {
    const err = new NotFoundError(404, undefined, 'not found', undefined)
    expect(err).toBeInstanceOf(NotFoundError)
    expect(err).not.toBeInstanceOf(PermissionDeniedError)
    expect(err).not.toBeInstanceOf(AuthenticationError)
  })

  it('correctly distinguishes permission errors from other errors', () => {
    const permErr = new PermissionDeniedError(403, undefined, 'forbidden', undefined)
    const authErr = new AuthenticationError(401, undefined, 'unauthorized', undefined)
    const notFoundErr = new NotFoundError(404, undefined, 'not found', undefined)
    const genericErr = new Error('network timeout')

    const isPermissionError = (err: unknown) =>
      err instanceof PermissionDeniedError || err instanceof AuthenticationError

    expect(isPermissionError(permErr)).toBe(true)
    expect(isPermissionError(authErr)).toBe(true)
    expect(isPermissionError(notFoundErr)).toBe(false)
    expect(isPermissionError(genericErr)).toBe(false)
  })
})

describe('Zone ID validation (isValidCfId)', () => {
  const VALID_ZONE_IDS = [
    '023e105f4ecef8ad9ca31a8372d0c353',
    'abcdef0123456789abcdef0123456789',
    'ABCDEF0123456789ABCDEF0123456789',
    '00000000000000000000000000000000',
    '3ba495ef9552231f624812bf6351283f', // real-world format
  ]

  const INVALID_ZONE_IDS = [
    'Zveda',
    'my-zone',
    '023e105f4ecef8ad9ca31a8372d0c35', // 31 chars
    '023e105f4ecef8ad9ca31a8372d0c3533', // 33 chars
    '',
    'not-hex-at-all-not-hex-at-all-zz',
    'peles.win', // domain, not a zone ID
  ]

  it.each(VALID_ZONE_IDS)('accepts valid zone ID: %s', (id) => {
    expect(isValidCfId(id)).toBe(true)
  })

  it.each(INVALID_ZONE_IDS)('rejects invalid zone ID: %s', (id) => {
    expect(isValidCfId(id)).toBe(false)
  })

  describe('config priority: .sag-config.json vs .env', () => {
    it('invalid config zoneId should not shadow valid .env value', () => {
      // Simulates the priority logic: config value checked first, .env as fallback
      const configZoneId = 'Zveda' // bad value from .sag-config.json
      const envZoneId = '3ba495ef9552231f624812bf6351283f' // good value from .env

      // Old behavior: configZoneId is truthy → used directly (broken)
      const oldResult = configZoneId || envZoneId
      expect(oldResult).toBe('Zveda')
      expect(isValidCfId(oldResult)).toBe(false)

      // New behavior: validate first, fall through if invalid
      const newResult =
        (configZoneId && isValidCfId(configZoneId) ? configZoneId : null) || envZoneId
      expect(newResult).toBe('3ba495ef9552231f624812bf6351283f')
      expect(isValidCfId(newResult)).toBe(true)
    })
  })
})
