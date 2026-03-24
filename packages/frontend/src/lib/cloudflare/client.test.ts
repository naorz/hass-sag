import { describe, it, expect, beforeEach, vi } from 'vitest'
import { cfClient, CloudflareApiError } from './client'

function mockFetch(body: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    }),
  )
}

beforeEach(() => {
  cfClient.reset()
  vi.unstubAllGlobals()
})

describe('cfClient.configure / isConfigured / reset', () => {
  it('is not configured initially', () => {
    expect(cfClient.isConfigured()).toBe(false)
  })

  it('is configured after configure()', () => {
    cfClient.configure('token', 'zone-id')
    expect(cfClient.isConfigured()).toBe(true)
  })

  it('reset() clears configuration', () => {
    cfClient.configure('token', 'zone-id')
    cfClient.reset()
    expect(cfClient.isConfigured()).toBe(false)
  })

  it('getAccountId() throws when not provided', () => {
    cfClient.configure('token', 'zone-id')
    expect(() => cfClient.getAccountId()).toThrow(CloudflareApiError)
  })

  it('getAccountId() returns value when provided', () => {
    cfClient.configure('token', 'zone-id', 'acct-id')
    expect(cfClient.getAccountId()).toBe('acct-id')
  })
})

describe('cfClient.get()', () => {
  it('sends Authorization header and returns result', async () => {
    cfClient.configure('my-token', 'zone-123')
    mockFetch({ success: true, errors: [], result: { id: 'zone-123' } })

    const result = await cfClient.get<{ id: string }>('/zones/zone-123')

    expect(result).toEqual({ id: 'zone-123' })
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(call[1].headers['Authorization']).toBe('Bearer my-token')
  })

  it('throws CloudflareApiError on CF error response', async () => {
    cfClient.configure('token', 'zone')
    mockFetch(
      { success: false, errors: [{ code: 9109, message: 'Invalid zone' }], result: null },
      400,
    )

    await expect(cfClient.get('/zones/bad')).rejects.toThrow('Invalid zone')
  })

  it('throws when not configured', async () => {
    await expect(cfClient.get('/zones/z')).rejects.toThrow(CloudflareApiError)
  })
})

describe('cfClient.post()', () => {
  it('serialises body as JSON', async () => {
    cfClient.configure('token', 'zone')
    mockFetch({ success: true, errors: [], result: { id: 'new' } })

    await cfClient.post('/test', { foo: 'bar' })

    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(call[1].method).toBe('POST')
    expect(JSON.parse(call[1].body as string)).toEqual({ foo: 'bar' })
  })
})

describe('cfClient.delete()', () => {
  it('sends DELETE with no body', async () => {
    cfClient.configure('token', 'zone')
    mockFetch({ success: true, errors: [], result: null })

    await cfClient.delete('/test/id')

    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(call[1].method).toBe('DELETE')
    expect(call[1].body).toBeUndefined()
  })
})
