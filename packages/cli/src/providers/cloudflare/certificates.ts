import {
  type ICertificateManager,
  type CertificateInfo,
  CloudflareApiError,
} from '@sag/shared/core'
import { cli } from '@sag/utils'
import { cfApi } from './base'

export class CfCertificateManager implements ICertificateManager {
  async uploadCsr(csr: string, validityDays = 3650): Promise<CertificateInfo> {
    cli.printInfo(
      `[CF API] Creating client certificate from CSR (validity: ${validityDays} days)...`,
    )
    cli.printInfo('  Verify: SSL/TLS → Client Certificates — new cert should appear in the list.')
    try {
      const result = await cfApi.get().clientCertificates.create({
        zone_id: cfApi.getZoneId(),
        csr,
        validity_days: validityDays,
      })
      return this.toCertificateInfo(result)
    } catch (err) {
      throw new CloudflareApiError(
        `Failed to upload CSR: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  async listCertificates(): Promise<CertificateInfo[]> {
    cli.printInfo('[CF API] Listing client certificates for this zone...')
    cli.printInfo('  Verify: SSL/TLS → Client Certificates — compare the list below.')
    try {
      const certs: CertificateInfo[] = []
      for await (const cert of cfApi
        .get()
        .clientCertificates.list({ zone_id: cfApi.getZoneId() })) {
        certs.push(this.toCertificateInfo(cert))
      }
      return certs
    } catch (err) {
      throw new CloudflareApiError(
        `Failed to list certificates: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  async getCertificate(id: string): Promise<CertificateInfo> {
    cli.printInfo(`[CF API] Fetching certificate details (${id.substring(0, 8)}...)...`)
    cli.printInfo('  Verify: SSL/TLS → Client Certificates → click the certificate.')
    try {
      const result = await cfApi.get().clientCertificates.get(id, { zone_id: cfApi.getZoneId() })
      return this.toCertificateInfo(result)
    } catch (err) {
      throw new CloudflareApiError(
        `Failed to get certificate: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  async revokeCertificate(id: string): Promise<void> {
    cli.printInfo(`[CF API] Revoking certificate (${id.substring(0, 8)}...)...`)
    cli.printInfo(
      '  Verify: SSL/TLS → Client Certificates — cert status should change to "Revoked".',
    )
    try {
      await cfApi.get().clientCertificates.delete(id, { zone_id: cfApi.getZoneId() })
    } catch (err) {
      throw new CloudflareApiError(
        `Failed to revoke certificate: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  async getHostnameAssociations(): Promise<string[]> {
    cli.printInfo('[CF API] Fetching certificate hostname associations...')
    cli.printInfo(
      '  Verify: SSL/TLS → Client Certificates → Hosts section (which hostnames request client certs).',
    )
    try {
      const result = await cfApi.get().certificateAuthorities.hostnameAssociations.get({
        zone_id: cfApi.getZoneId(),
      })
      return result.hostnames ?? []
    } catch (err) {
      throw new CloudflareApiError(
        `Failed to get hostname associations: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  async setHostnameAssociations(hostnames: string[]): Promise<void> {
    cli.printInfo(`[CF API] Setting certificate hosts: ${hostnames.join(', ')}...`)
    cli.printInfo('  Verify: SSL/TLS → Client Certificates → Hosts — should list these hostnames.')
    try {
      await cfApi.get().certificateAuthorities.hostnameAssociations.update({
        zone_id: cfApi.getZoneId(),
        hostnames,
      })
    } catch (err) {
      throw new CloudflareApiError(
        `Failed to set hostname associations: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  private toCertificateInfo(cf: {
    id?: string
    status?: string
    certificate?: string
    csr?: string
    expires_on?: string
    issued_on?: string
    serial_number?: string
    signature?: string
    ski?: string
    common_name?: string
  }): CertificateInfo {
    return {
      id: cf.id ?? '',
      status: (cf.status ?? 'active') as CertificateInfo['status'],
      certificate: cf.certificate ?? '',
      csr: cf.csr ?? '',
      expires_on: cf.expires_on ?? '',
      issued_on: cf.issued_on ?? '',
      serial_number: cf.serial_number ?? '',
      signature: cf.signature ?? '',
      ski: cf.ski ?? '',
      common_name: cf.common_name ?? '',
      hosts: [],
    }
  }
}
