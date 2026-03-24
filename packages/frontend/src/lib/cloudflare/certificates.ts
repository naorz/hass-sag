import { type ICertificateManager, type CertificateInfo } from '@sag/shared/core'
import { type CfApiClient, CloudflareApiError } from './client'

interface CfCert {
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
}

interface CfHostnameAssociations {
  hostnames?: string[]
}

function toCertificateInfo(cf: CfCert): CertificateInfo {
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

export class BrowserCertificateManager implements ICertificateManager {
  constructor(private readonly client: CfApiClient) {}

  async uploadCsr(csr: string, validityDays = 3650): Promise<CertificateInfo> {
    try {
      const result = await this.client.post<CfCert>(
        `/zones/${this.client.getZoneId()}/client_certificates`,
        { csr, validity_days: validityDays },
      )
      return toCertificateInfo(result)
    } catch (err) {
      if (err instanceof CloudflareApiError) throw err
      throw new CloudflareApiError(
        `Failed to upload CSR: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  async listCertificates(): Promise<CertificateInfo[]> {
    try {
      const result = await this.client.get<CfCert[]>(
        `/zones/${this.client.getZoneId()}/client_certificates?per_page=100&status=active`,
      )
      return result.map(toCertificateInfo)
    } catch (err) {
      if (err instanceof CloudflareApiError) throw err
      throw new CloudflareApiError(
        `Failed to list certificates: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  async getCertificate(id: string): Promise<CertificateInfo> {
    try {
      const result = await this.client.get<CfCert>(
        `/zones/${this.client.getZoneId()}/client_certificates/${id}`,
      )
      return toCertificateInfo(result)
    } catch (err) {
      if (err instanceof CloudflareApiError) throw err
      throw new CloudflareApiError(
        `Failed to get certificate: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  async revokeCertificate(id: string): Promise<void> {
    try {
      await this.client.delete(`/zones/${this.client.getZoneId()}/client_certificates/${id}`)
    } catch (err) {
      if (err instanceof CloudflareApiError) throw err
      throw new CloudflareApiError(
        `Failed to revoke certificate: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  async getHostnameAssociations(): Promise<string[]> {
    try {
      const result = await this.client.get<CfHostnameAssociations>(
        `/zones/${this.client.getZoneId()}/certificate_authorities/hostname_associations`,
      )
      return result.hostnames ?? []
    } catch (err) {
      if (err instanceof CloudflareApiError) throw err
      throw new CloudflareApiError(
        `Failed to get hostname associations: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  async setHostnameAssociations(hostnames: string[]): Promise<void> {
    try {
      await this.client.put(
        `/zones/${this.client.getZoneId()}/certificate_authorities/hostname_associations`,
        { hostnames },
      )
    } catch (err) {
      if (err instanceof CloudflareApiError) throw err
      throw new CloudflareApiError(
        `Failed to set hostname associations: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }
}
