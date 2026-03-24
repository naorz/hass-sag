/**
 * Browser PKI utilities.
 *
 * Key generation — WebCrypto RSASSA-PKCS1-v1_5 2048-bit (OS CSPRNG).
 * CSR generation  — node-forge PKCS#10 (accepts the WebCrypto-exported PKCS#8 PEM).
 * P12 generation  — node-forge PKCS#12 (3DES, macOS/iOS compatible).
 *
 * All async functions are safe to call in the browser main thread;
 * key generation typically completes in < 200 ms on modern hardware.
 */

import forge from 'node-forge'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeneratedKeyPair {
  /** PKCS#8 PEM — store in OPFS certs/client.key */
  privateKeyPem: string
  /** SubjectPublicKeyInfo PEM */
  publicKeyPem: string
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function bufToBase64Lines(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  const b64 = btoa(binary)
  // Split into 64-char lines (PEM convention)
  return b64.match(/.{1,64}/g)?.join('\n') ?? b64
}

// ---------------------------------------------------------------------------
// Key generation
// ---------------------------------------------------------------------------

/**
 * Generate a 2048-bit RSA key pair using WebCrypto.
 * Returns both keys as PEM strings ready for OPFS storage.
 */
export async function generateKeyPair(): Promise<GeneratedKeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
      hash: 'SHA-256',
    },
    true, // extractable — needed to export to PEM
    ['sign', 'verify'],
  )

  const [privateKeyPem, publicKeyPem] = await Promise.all([
    exportPrivateKeyPem(keyPair.privateKey),
    exportPublicKeyPem(keyPair.publicKey),
  ])

  return { privateKeyPem, publicKeyPem }
}

/**
 * Export a CryptoKey (private) to PKCS#8 PEM.
 */
export async function exportPrivateKeyPem(key: CryptoKey): Promise<string> {
  const der = await crypto.subtle.exportKey('pkcs8', key)
  return `-----BEGIN PRIVATE KEY-----\n${bufToBase64Lines(der)}\n-----END PRIVATE KEY-----`
}

/**
 * Export a CryptoKey (public) to SubjectPublicKeyInfo PEM.
 */
export async function exportPublicKeyPem(key: CryptoKey): Promise<string> {
  const der = await crypto.subtle.exportKey('spki', key)
  return `-----BEGIN PUBLIC KEY-----\n${bufToBase64Lines(der)}\n-----END PUBLIC KEY-----`
}

// ---------------------------------------------------------------------------
// CSR generation
// ---------------------------------------------------------------------------

/**
 * Generate a PKCS#10 CSR for the given commonName using an RSA private key PEM.
 * Accepts both PKCS#8 ("BEGIN PRIVATE KEY") and PKCS#1 ("BEGIN RSA PRIVATE KEY") format.
 *
 * Returns the CSR as a PEM string — upload to Cloudflare to get a signed certificate.
 */
export function generateCsr(privateKeyPem: string, commonName: string): string {
  if (/[/=]/.test(commonName) || commonName.includes('\x00')) {
    throw new Error(`Invalid commonName "${commonName}": must not contain '/', '=', or null bytes`)
  }

  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem)
  const publicKey = forge.pki.setRsaPublicKey(
    (privateKey as forge.pki.rsa.PrivateKey).n,
    (privateKey as forge.pki.rsa.PrivateKey).e,
  )

  const csr = forge.pki.createCertificationRequest()
  csr.publicKey = publicKey
  csr.setSubject([{ name: 'commonName', value: commonName }])
  csr.sign(privateKey as forge.pki.rsa.PrivateKey, forge.md.sha256.create())

  return forge.pki.certificationRequestToPem(csr)
}

// ---------------------------------------------------------------------------
// P12 bundle generation
// ---------------------------------------------------------------------------

/**
 * Generate a PKCS#12 bundle from a private key PEM and a signed certificate PEM.
 * Uses 3DES encryption for broadest macOS / iOS compatibility.
 *
 * @param password  Optional password to protect the bundle (empty string = no password).
 * @returns         Raw bytes suitable for writeBinary() to OPFS or Blob download.
 */
export function generateP12(privateKeyPem: string, certPem: string, password = ''): Uint8Array {
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem) as forge.pki.rsa.PrivateKey
  const cert = forge.pki.certificateFromPem(certPem)

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(privateKey, cert, password, {
    algorithm: '3des',
    useMac: true,
    generateLocalKeyId: true,
  })

  const p12Der = forge.asn1.toDer(p12Asn1).getBytes()

  // Convert binary string to Uint8Array
  const bytes = new Uint8Array(p12Der.length)
  for (let i = 0; i < p12Der.length; i++) bytes[i] = p12Der.charCodeAt(i)
  return bytes
}
