import { describe, it, expect, beforeEach, vi } from 'vitest'
import { cfClient, CloudflareApiError } from './client'
import { BrowserCertificateManager } from './certificates'

const ZONE = 'zone-abc'

function mockFetch(result: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status < 400,
      status,
      json: () => Promise.resolve({ success: status < 400, errors: [], result }),
    }),
  )
}

let certs: BrowserCertificateManager

beforeEach(() => {
  cfClient.reset()
  cfClient.configure('tok', ZONE)
  vi.unstubAllGlobals()
  certs = new BrowserCertificateManager(cfClient)
})

const CERT = {
  id: 'cert-1',
  status: 'active',
  certificate: '-----BEGIN CERTIFICATE-----\n...',
  csr: '-----BEGIN CERTIFICATE REQUEST-----\n...',
  expires_on: '2030-01-01',
  issued_on: '2025-01-01',
  serial_number: 'SN1',
  signature: 'sha256',
  ski: 'abc',
  common_name: 'ha.example.com',
}

describe('uploadCsr', () => {
  it('posts to /client_certificates and returns CertificateInfo', async () => {
    mockFetch(CERT)
    const result = await certs.uploadCsr('-----BEGIN CERTIFICATE REQUEST-----\n...', 365)
    expect(result.id).toBe('cert-1')
    expect(result.certificate).toContain('BEGIN CERTIFICATE')
    const [url, opts] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toContain(`/zones/${ZONE}/client_certificates`)
    expect(JSON.parse(opts.body as string)).toMatchObject({ validity_days: 365 })
  })
})

describe('listCertificates', () => {
  it('returns array of CertificateInfo', async () => {
    mockFetch([CERT])
    const result = await certs.listCertificates()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('cert-1')
  })
})

describe('getCertificate', () => {
  it('fetches a single certificate by id', async () => {
    mockFetch(CERT)
    const result = await certs.getCertificate('cert-1')
    expect(result.common_name).toBe('ha.example.com')
    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toContain('cert-1')
  })
})

describe('revokeCertificate', () => {
  it('sends DELETE and resolves', async () => {
    mockFetch(null)
    await expect(certs.revokeCertificate('cert-1')).resolves.toBeUndefined()
    const [, opts] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(opts.method).toBe('DELETE')
  })
})

describe('getHostnameAssociations', () => {
  it('returns hostnames array', async () => {
    mockFetch({ hostnames: ['ha.example.com'] })
    const result = await certs.getHostnameAssociations()
    expect(result).toEqual(['ha.example.com'])
  })

  it('returns empty array when hostnames missing', async () => {
    mockFetch({})
    expect(await certs.getHostnameAssociations()).toEqual([])
  })
})

describe('setHostnameAssociations', () => {
  it('PUTs hostname list', async () => {
    mockFetch(null)
    await certs.setHostnameAssociations(['ha.example.com', '*.example.com'])
    const [, opts] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(opts.method).toBe('PUT')
    expect(JSON.parse(opts.body as string)).toEqual({
      hostnames: ['ha.example.com', '*.example.com'],
    })
  })
})
