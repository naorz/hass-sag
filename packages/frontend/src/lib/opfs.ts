/**
 * OPFS (Origin Private File System) persistence layer.
 *
 * All SAG data is stored under the virtual root:  /sag/
 *   config.json        — GeneratorConfig (domain, subdomains, cert strategy, family)
 *   state.json         — flow step statuses + current step
 *   consent.json       — disclaimer acceptance { version, acceptedAt }
 *   credentials.enc    — AES-GCM encrypted CF token/zone/account IDs
 *   certs/
 *     client.key       — RSA private key (PEM)
 *     client.csr       — CSR (PEM)
 *     client.pem       — Signed certificate (PEM)
 *     device-cert.p12  — PKCS#12 bundle (binary)
 *
 * Paths are relative to the SAG root (no leading slash needed).
 * Directory segments are created automatically on write.
 */

const SAG_ROOT = 'sag'

async function getRoot(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory()
  return root.getDirectoryHandle(SAG_ROOT, { create: true })
}

/**
 * Resolve a path like "certs/client.key" to a FileSystemFileHandle.
 * @param create - create missing intermediate directories and the file itself
 */
async function resolveFile(path: string, create: boolean): Promise<FileSystemFileHandle | null> {
  const segments = path.split('/').filter(Boolean)
  const fileName = segments.pop()
  if (!fileName) throw new Error(`Invalid OPFS path: "${path}"`)

  let dir = await getRoot()

  for (const segment of segments) {
    try {
      dir = await dir.getDirectoryHandle(segment, { create })
    } catch {
      // Directory doesn't exist and we're not creating
      return null
    }
  }

  try {
    return await dir.getFileHandle(fileName, { create })
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function readJSON<T>(path: string): Promise<T | null> {
  const handle = await resolveFile(path, false)
  if (!handle) return null
  const file = await handle.getFile()
  const text = await file.text()
  if (!text.trim()) return null
  return JSON.parse(text) as T
}

export async function writeJSON(path: string, data: unknown): Promise<void> {
  const handle = await resolveFile(path, true)
  if (!handle) throw new Error(`Cannot create OPFS file: "${path}"`)
  const writable = await handle.createWritable()
  await writable.write(JSON.stringify(data, null, 2))
  await writable.close()
}

export async function readBinary(path: string): Promise<ArrayBuffer | null> {
  const handle = await resolveFile(path, false)
  if (!handle) return null
  const file = await handle.getFile()
  return file.arrayBuffer()
}

export async function writeBinary(path: string, data: ArrayBuffer): Promise<void> {
  const handle = await resolveFile(path, true)
  if (!handle) throw new Error(`Cannot create OPFS file: "${path}"`)
  const writable = await handle.createWritable()
  await writable.write(data)
  await writable.close()
}

export async function exists(path: string): Promise<boolean> {
  const handle = await resolveFile(path, false)
  return handle !== null
}

export async function deleteFile(path: string): Promise<void> {
  const segments = path.split('/').filter(Boolean)
  const fileName = segments.pop()
  if (!fileName) throw new Error(`Invalid OPFS path: "${path}"`)

  let dir = await getRoot()

  for (const segment of segments) {
    try {
      dir = await dir.getDirectoryHandle(segment)
    } catch {
      return // path doesn't exist — nothing to delete
    }
  }

  try {
    await dir.removeEntry(fileName)
  } catch {
    // file didn't exist — treat as no-op
  }
}
