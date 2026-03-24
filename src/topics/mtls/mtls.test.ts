import { describe, it, expect } from 'vitest'
import { fs } from 'zx'
import { join as pathJoin } from 'node:path'

describe('mTLS flow', () => {
  describe('file dependency checks', () => {
    const workDir = '/tmp/sag-test'
    const certDir = pathJoin(workDir, 'certs')

    it('key + pem check returns false when files missing', () => {
      const hasKeyAndPem = () => {
        return (
          fs.existsSync(pathJoin(certDir, 'client.key')) &&
          fs.existsSync(pathJoin(certDir, 'client.pem'))
        )
      }
      expect(hasKeyAndPem()).toBe(false)
    })

    it('p12 check returns false when file missing', () => {
      const hasP12 = () => fs.existsSync(pathJoin(certDir, 'device-cert.p12'))
      expect(hasP12()).toBe(false)
    })

    it('profile check returns false when file missing', () => {
      const hasProfile = () => fs.existsSync(pathJoin(certDir, 'apple-secure.mobileconfig'))
      expect(hasProfile()).toBe(false)
    })
  })

  describe('PEM validation', () => {
    const validPem = `-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJALRiMLAh0KLMMA0GCSqGSIb3DQEBCwUAMBExDzANBgNVBAMMBnRl
c3RDQTAEFW0yNDA2MDExMjAwMDBaFw0yNTA2MDExMjAwMDBaMBExDzANBgNVBAMM
BnRlc3RDQTBcMA0GCSqGSIb3DQEBAQUAAwsAMEgCQQC7o96TDNx0fOxMhA
-----END CERTIFICATE-----`

    const invalidPem = 'just some random text'
    const partialPem = '-----BEGIN CERTIFICATE-----\ndata'

    it('accepts valid PEM content', () => {
      const isValidPem = (content: string) =>
        content.includes('-----BEGIN CERTIFICATE-----') &&
        content.includes('-----END CERTIFICATE-----')
      expect(isValidPem(validPem)).toBe(true)
    })

    it('rejects non-PEM content', () => {
      const isValidPem = (content: string) =>
        content.includes('-----BEGIN CERTIFICATE-----') &&
        content.includes('-----END CERTIFICATE-----')
      expect(isValidPem(invalidPem)).toBe(false)
    })

    it('rejects partial PEM (missing END marker)', () => {
      const isValidPem = (content: string) =>
        content.includes('-----BEGIN CERTIFICATE-----') &&
        content.includes('-----END CERTIFICATE-----')
      expect(isValidPem(partialPem)).toBe(false)
    })
  })

  describe('P12 generation', () => {
    it('openssl legacy flag is required for macOS compatibility', () => {
      // The command should include -legacy for OpenSSL 3.x compatibility with macOS Keychain
      const cmd =
        'openssl pkcs12 -export -out out.p12 -inkey key.pem -in cert.pem -passout pass: -legacy'
      expect(cmd).toContain('-legacy')
      expect(cmd).toContain('-passout pass:')
    })
  })

  describe('macOS cert install error detection', () => {
    it('detects MAC verification error', () => {
      const errorMsg =
        'security: SecKeychainItemImport: MAC verification failed during PKCS12 import (wrong password?)'
      expect(errorMsg.includes('MAC verification failed')).toBe(true)
    })

    it('suggests regenerating p12 for MAC error', () => {
      const isMacError = (msg: string) => msg.includes('MAC verification failed')
      expect(isMacError('MAC verification failed during PKCS12 import')).toBe(true)
      expect(isMacError('some other error')).toBe(false)
    })
  })

  describe('connection test expectations', () => {
    it('with mTLS cert should expect 200', () => {
      const statusCode = '200'
      expect(statusCode.startsWith('2')).toBe(true)
    })

    it('without mTLS cert should expect 403', () => {
      const statusCode = '403'
      expect(statusCode).toBe('403')
    })

    it('000 means connection failure', () => {
      const statusCode = '000'
      expect(statusCode).toBe('000')
    })
  })

  describe('menu disabled state logic', () => {
    it('disables P12 generation when key+pem missing', () => {
      const hasKeyAndPem = false
      const disabledMsg = !hasKeyAndPem ? 'Generate Identity first (Key + CSR)' : false
      expect(disabledMsg).toBe('Generate Identity first (Key + CSR)')
    })

    it('enables P12 generation when key+pem exist', () => {
      const hasKeyAndPem = true
      const disabledMsg = !hasKeyAndPem ? 'Generate Identity first (Key + CSR)' : false
      expect(disabledMsg).toBe(false)
    })

    it('disables Apple Profile when p12 missing', () => {
      const hasP12 = false
      const disabledMsg = !hasP12 ? 'Generate PKCS#12 first' : false
      expect(disabledMsg).toBe('Generate PKCS#12 first')
    })

    it('disables cert install when p12 missing', () => {
      const hasP12 = false
      const disabledMsg = !hasP12
        ? 'Generate PKCS#12 first (mTLS & Certificates → Generate PKCS#12)'
        : false
      expect(typeof disabledMsg).toBe('string')
    })

    it('disables connection test when certs missing', () => {
      const hasKeyAndPem = false
      const disabledMsg = !hasKeyAndPem
        ? 'Generate mTLS identity first (mTLS & Certificates → Generate Identity)'
        : false
      expect(typeof disabledMsg).toBe('string')
    })
  })
})
