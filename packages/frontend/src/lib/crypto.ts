/**
 * AES-256-GCM encryption for sensitive values (CF API token, zone/account IDs).
 *
 * Key derivation: PBKDF2 (SHA-256, 100 000 iterations) from a user passphrase.
 * Store format: JSON  { salt: base64, iv: base64, ciphertext: base64 }
 *
 * The encrypted payload is stored as a JSON string in OPFS "credentials.enc".
 */

export interface EncryptedPayload {
  salt: string // base64-encoded 16-byte random salt
  iv: string // base64-encoded 12-byte random IV
  ciphertext: string // base64-encoded AES-GCM ciphertext (includes auth tag)
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function bufToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function base64ToBuf(b64: string): ArrayBuffer {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

async function deriveKey(passphrase: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Encrypt a plaintext string with AES-256-GCM using a passphrase.
 * Each call generates a fresh random salt and IV.
 */
export async function encrypt(plaintext: string, passphrase: string): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(16)).buffer
  const iv = crypto.getRandomValues(new Uint8Array(12)).buffer
  const key = await deriveKey(passphrase, salt)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  )
  return { salt: bufToBase64(salt), iv: bufToBase64(iv), ciphertext: bufToBase64(ciphertext) }
}

/**
 * Decrypt an EncryptedPayload with the original passphrase.
 * Throws DOMException (OperationError) if the passphrase is wrong or data is corrupt.
 */
export async function decrypt(payload: EncryptedPayload, passphrase: string): Promise<string> {
  const salt = base64ToBuf(payload.salt)
  const iv = base64ToBuf(payload.iv)
  const ciphertext = base64ToBuf(payload.ciphertext)
  const key = await deriveKey(passphrase, salt)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(plaintext)
}

/**
 * Serialise an EncryptedPayload to a JSON string (ready to write to OPFS).
 */
export function serializePayload(payload: EncryptedPayload): string {
  return JSON.stringify(payload)
}

/**
 * Deserialise from a JSON string read from OPFS.
 * Returns null if the string is empty or malformed.
 */
export function deserializePayload(json: string): EncryptedPayload | null {
  try {
    const parsed = JSON.parse(json) as unknown
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'salt' in parsed &&
      'iv' in parsed &&
      'ciphertext' in parsed
    ) {
      return parsed as EncryptedPayload
    }
    return null
  } catch {
    return null
  }
}
