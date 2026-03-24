import { describe, it, expect, beforeAll } from 'vitest'
import forge from 'node-forge'
import {
  generateKeyPair,
  exportPrivateKeyPem,
  exportPublicKeyPem,
  generateCsr,
  generateP12,
  type GeneratedKeyPair,
} from './ssl'

// Generate one key pair for the whole suite to keep tests fast
let kp: GeneratedKeyPair

beforeAll(async () => {
  kp = await generateKeyPair()
}, 15_000) // RSA-2048 generation timeout

// ---------------------------------------------------------------------------
// generateKeyPair
// ---------------------------------------------------------------------------

describe('generateKeyPair', () => {
  it('returns PKCS#8 private key PEM', () => {
    expect(kp.privateKeyPem).toContain('-----BEGIN PRIVATE KEY-----')
    expect(kp.privateKeyPem).toContain('-----END PRIVATE KEY-----')
  })

  it('returns SPKI public key PEM', () => {
    expect(kp.publicKeyPem).toContain('-----BEGIN PUBLIC KEY-----')
    expect(kp.publicKeyPem).toContain('-----END PUBLIC KEY-----')
  })

  it('generates a different key pair each call', async () => {
    const kp2 = await generateKeyPair()
    expect(kp2.privateKeyPem).not.toBe(kp.privateKeyPem)
  }, 15_000)
})

// ---------------------------------------------------------------------------
// exportPrivateKeyPem / exportPublicKeyPem
// ---------------------------------------------------------------------------

describe('exportPrivateKeyPem', () => {
  it('exports CryptoKey to PKCS#8 PEM', async () => {
    const cryptoKp = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 1024,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify'],
    )
    const pem = await exportPrivateKeyPem(cryptoKp.privateKey)
    expect(pem).toContain('-----BEGIN PRIVATE KEY-----')
  }, 10_000)
})

describe('exportPublicKeyPem', () => {
  it('exports CryptoKey to SPKI PEM', async () => {
    const cryptoKp = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 1024,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify'],
    )
    const pem = await exportPublicKeyPem(cryptoKp.publicKey)
    expect(pem).toContain('-----BEGIN PUBLIC KEY-----')
  }, 10_000)
})

// ---------------------------------------------------------------------------
// generateCsr
// ---------------------------------------------------------------------------

describe('generateCsr', () => {
  it('returns a PEM-encoded CSR', () => {
    const csr = generateCsr(kp.privateKeyPem, 'ha.example.com')
    expect(csr).toContain('-----BEGIN CERTIFICATE REQUEST-----')
    expect(csr).toContain('-----END CERTIFICATE REQUEST-----')
  })

  it('embeds the commonName in the subject', () => {
    const csr = generateCsr(kp.privateKeyPem, 'ha.example.com')
    const parsed = forge.pki.certificationRequestFromPem(csr)
    const cn = parsed.subject.getField('CN')
    expect(cn?.value).toBe('ha.example.com')
  })

  it('produces a CSR that verifies its own signature', () => {
    const csr = generateCsr(kp.privateKeyPem, 'test.local')
    const parsed = forge.pki.certificationRequestFromPem(csr)
    expect(parsed.verify()).toBe(true)
  })

  it('throws for commonName containing /', () => {
    expect(() => generateCsr(kp.privateKeyPem, 'ha.example.com/O=Evil')).toThrow()
  })

  it('throws for commonName containing =', () => {
    expect(() => generateCsr(kp.privateKeyPem, 'cn=bad')).toThrow()
  })
})

// ---------------------------------------------------------------------------
// generateP12
// ---------------------------------------------------------------------------

function makeSelfSignedCert(privateKeyPem: string): string {
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem) as forge.pki.rsa.PrivateKey
  const publicKey = forge.pki.setRsaPublicKey(privateKey.n, privateKey.e)

  const cert = forge.pki.createCertificate()
  cert.publicKey = publicKey
  cert.serialNumber = '01'
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date()
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1)
  const attrs = [{ name: 'commonName', value: 'test' }]
  cert.setSubject(attrs)
  cert.setIssuer(attrs)
  cert.sign(privateKey, forge.md.sha256.create())
  return forge.pki.certificateToPem(cert)
}

describe('generateP12', () => {
  it('returns a non-empty Uint8Array', () => {
    const certPem = makeSelfSignedCert(kp.privateKeyPem)
    const p12 = generateP12(kp.privateKeyPem, certPem)
    expect(p12).toBeInstanceOf(Uint8Array)
    expect(p12.length).toBeGreaterThan(100)
  })

  it('produces a parseable PKCS#12 with no password', () => {
    const certPem = makeSelfSignedCert(kp.privateKeyPem)
    const p12 = generateP12(kp.privateKeyPem, certPem, '')
    // Verify it's valid DER by parsing back
    const p12Der = Array.from(p12)
      .map((b) => String.fromCharCode(b))
      .join('')
    const p12Asn1 = forge.asn1.fromDer(p12Der)
    expect(() => forge.pkcs12.pkcs12FromAsn1(p12Asn1, '')).not.toThrow()
  })

  it('produces a parseable PKCS#12 with a password', () => {
    const certPem = makeSelfSignedCert(kp.privateKeyPem)
    const p12 = generateP12(kp.privateKeyPem, certPem, 'secret-pass')
    const p12Der = Array.from(p12)
      .map((b) => String.fromCharCode(b))
      .join('')
    const p12Asn1 = forge.asn1.fromDer(p12Der)
    expect(() => forge.pkcs12.pkcs12FromAsn1(p12Asn1, 'secret-pass')).not.toThrow()
  })
})
