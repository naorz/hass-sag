import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, serializePayload, deserializePayload } from './crypto'

// jsdom (via vitest) provides the Web Crypto API

describe('encrypt / decrypt', () => {
  it('round-trips a plaintext string', async () => {
    const passphrase = 'correct-horse-battery-staple'
    const plaintext = 'my-secret-cf-token'

    const payload = await encrypt(plaintext, passphrase)
    const result = await decrypt(payload, passphrase)

    expect(result).toBe(plaintext)
  })

  it('produces different ciphertexts for repeated calls (random IV)', async () => {
    const p = await encrypt('hello', 'pass')
    const q = await encrypt('hello', 'pass')
    expect(p.ciphertext).not.toBe(q.ciphertext)
    expect(p.iv).not.toBe(q.iv)
  })

  it('throws when passphrase is wrong', async () => {
    const payload = await encrypt('secret', 'correct-pass')
    await expect(decrypt(payload, 'wrong-pass')).rejects.toThrow()
  })

  it('encrypts arbitrary unicode content', async () => {
    const text = 'token=abc123&zoneId=café☕'
    const payload = await encrypt(text, 'pass')
    expect(await decrypt(payload, 'pass')).toBe(text)
  })
})

describe('serializePayload / deserializePayload', () => {
  it('round-trips through JSON', async () => {
    const payload = await encrypt('data', 'pass')
    const json = serializePayload(payload)
    const parsed = deserializePayload(json)
    expect(parsed).toEqual(payload)
  })

  it('returns null for empty string', () => {
    expect(deserializePayload('')).toBeNull()
  })

  it('returns null for malformed JSON', () => {
    expect(deserializePayload('not json')).toBeNull()
  })

  it('returns null for JSON missing required fields', () => {
    expect(deserializePayload('{"foo":"bar"}')).toBeNull()
  })
})
