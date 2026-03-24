import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readJSON, writeJSON, readBinary, writeBinary, exists, deleteFile } from './opfs'

// ---------------------------------------------------------------------------
// In-memory OPFS mock
// ---------------------------------------------------------------------------

type FileData = string | ArrayBuffer

function makeOpfsMock() {
  const store = new Map<string, FileData>()

  function makeFile(data: FileData) {
    return {
      async text() {
        return typeof data === 'string' ? data : new TextDecoder().decode(data)
      },
      async arrayBuffer() {
        return typeof data === 'string' ? new TextEncoder().encode(data).buffer : data
      },
    }
  }

  function makeWritable(key: string) {
    let buf = ''
    return {
      async write(chunk: string | ArrayBuffer) {
        if (typeof chunk === 'string') buf += chunk
        else buf = chunk as unknown as string // store ArrayBuffer directly
        store.set(key, chunk)
      },
      async close() {},
    }
  }

  function makeFileHandle(key: string, create: boolean) {
    if (!store.has(key) && !create) throw new DOMException('Not found', 'NotFoundError')
    if (!store.has(key)) store.set(key, '')
    return {
      async getFile() {
        return makeFile(store.get(key)!)
      },
      createWritable() {
        return makeWritable(key)
      },
    }
  }

  function makeDirHandle(prefix: string): unknown {
    return {
      async getDirectoryHandle(name: string, opts?: { create?: boolean }) {
        return makeDirHandle(`${prefix}/${name}`)
      },
      async getFileHandle(name: string, opts?: { create?: boolean }) {
        const key = `${prefix}/${name}`
        return makeFileHandle(key, opts?.create ?? false)
      },
      async removeEntry(name: string) {
        const key = `${prefix}/${name}`
        store.delete(key)
      },
    }
  }

  return {
    store,
    rootHandle: makeDirHandle(''),
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let mock: ReturnType<typeof makeOpfsMock>

beforeEach(() => {
  mock = makeOpfsMock()
  Object.defineProperty(navigator, 'storage', {
    value: {
      async getDirectory() {
        return mock.rootHandle
      },
    },
    configurable: true,
  })
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('readJSON / writeJSON', () => {
  it('returns null for a non-existent path', async () => {
    expect(await readJSON('config.json')).toBeNull()
  })

  it('round-trips a JSON object', async () => {
    const data = { domain: 'example.com', port: 443 }
    await writeJSON('config.json', data)
    expect(await readJSON('config.json')).toEqual(data)
  })

  it('overwrites existing data', async () => {
    await writeJSON('config.json', { v: 1 })
    await writeJSON('config.json', { v: 2 })
    expect(await readJSON<{ v: number }>('config.json')).toEqual({ v: 2 })
  })

  it('handles nested paths (certs/client.pem)', async () => {
    const pem = '-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----'
    await writeJSON('certs/info.json', { pem })
    expect(await readJSON<{ pem: string }>('certs/info.json')).toEqual({ pem })
  })
})

describe('readBinary / writeBinary', () => {
  it('returns null for a non-existent path', async () => {
    expect(await readBinary('certs/device-cert.p12')).toBeNull()
  })

  it('round-trips binary data', async () => {
    const data = new Uint8Array([0x00, 0x01, 0x02, 0xff]).buffer
    await writeBinary('certs/device-cert.p12', data)
    const result = await readBinary('certs/device-cert.p12')
    expect(result).not.toBeNull()
    expect(new Uint8Array(result!)).toEqual(new Uint8Array([0x00, 0x01, 0x02, 0xff]))
  })
})

describe('exists', () => {
  it('returns false before writing', async () => {
    expect(await exists('consent.json')).toBe(false)
  })

  it('returns true after writing', async () => {
    await writeJSON('consent.json', { version: '1.0' })
    expect(await exists('consent.json')).toBe(true)
  })
})

describe('deleteFile', () => {
  it('is a no-op for a non-existent file', async () => {
    await expect(deleteFile('nope.json')).resolves.toBeUndefined()
  })

  it('removes a previously written file', async () => {
    await writeJSON('state.json', { step: 1 })
    expect(await exists('state.json')).toBe(true)
    await deleteFile('state.json')
    expect(await exists('state.json')).toBe(false)
  })
})
