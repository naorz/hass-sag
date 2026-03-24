/**
 * Browser Cloudflare API client.
 *
 * Wraps fetch with:
 *  - Bearer token auth header
 *  - CF v4 envelope unwrapping  ({ success, errors, result })
 *  - Typed error for non-2xx / CF errors
 *
 * Usage:
 *   cfClient.configure(token, zoneId, accountId?)
 *   const certs = new BrowserCertificateManager(cfClient)
 */

const BASE = 'https://api.cloudflare.com/client/v4'

export class CloudflareApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly cfErrors?: CfError[],
  ) {
    super(message)
    this.name = 'CloudflareApiError'
  }
}

interface CfError {
  code: number
  message: string
}

interface CfEnvelope<T> {
  success: boolean
  errors: CfError[]
  result: T
}

interface CfConfig {
  token: string
  zoneId: string
  accountId?: string
}

class CfApiClient {
  private config: CfConfig | null = null

  configure(token: string, zoneId: string, accountId?: string): void {
    this.config = { token, zoneId, accountId }
  }

  isConfigured(): boolean {
    return this.config !== null
  }

  getZoneId(): string {
    if (!this.config) throw new CloudflareApiError('Cloudflare client not configured')
    return this.config.zoneId
  }

  getAccountId(): string {
    if (!this.config) throw new CloudflareApiError('Cloudflare client not configured')
    if (!this.config.accountId) throw new CloudflareApiError('Account ID not configured')
    return this.config.accountId
  }

  reset(): void {
    this.config = null
  }

  // -------------------------------------------------------------------------
  // HTTP helpers
  // -------------------------------------------------------------------------

  private headers(): HeadersInit {
    if (!this.config) throw new CloudflareApiError('Cloudflare client not configured')
    return {
      Authorization: `Bearer ${this.config.token}`,
      'Content-Type': 'application/json',
    }
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path)
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body)
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PUT', path, body)
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body)
  }

  async delete<T = void>(path: string): Promise<T> {
    return this.request<T>('DELETE', path)
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${BASE}${path}`
    const res = await fetch(url, {
      method,
      headers: this.headers(),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })

    // CF returns JSON even for errors
    let envelope: CfEnvelope<T>
    try {
      envelope = (await res.json()) as CfEnvelope<T>
    } catch {
      throw new CloudflareApiError(`Non-JSON response from CF API (HTTP ${res.status})`, res.status)
    }

    if (!envelope.success || !res.ok) {
      const msg = envelope.errors?.[0]?.message ?? `HTTP ${res.status}`
      throw new CloudflareApiError(msg, res.status, envelope.errors)
    }

    return envelope.result
  }
}

/** Singleton — configure once, use everywhere in the session. */
export const cfClient = new CfApiClient()
