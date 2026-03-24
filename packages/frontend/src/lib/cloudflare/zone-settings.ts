import { type IZoneSettingsManager, type ZoneSettings, type ZoneSetting } from '@sag/shared/core'
import { type CfApiClient, CloudflareApiError } from './client'

interface CfSetting {
  id?: string
  value?: unknown
  editable?: boolean
}

function boolVal(s: CfSetting): boolean {
  return s.value === 'on' || s.value === true
}

export class BrowserZoneSettingsManager implements IZoneSettingsManager {
  constructor(private readonly client: CfApiClient) {}

  async getSettings(): Promise<ZoneSettings> {
    try {
      const zoneId = this.client.getZoneId()
      const [ws, http2, httpsRewrites, minTls, ssl] = await Promise.all([
        this.client.get<CfSetting>(`/zones/${zoneId}/settings/websockets`),
        this.client.get<CfSetting>(`/zones/${zoneId}/settings/http2`),
        this.client.get<CfSetting>(`/zones/${zoneId}/settings/automatic_https_rewrites`),
        this.client.get<CfSetting>(`/zones/${zoneId}/settings/min_tls_version`),
        this.client.get<CfSetting>(`/zones/${zoneId}/settings/ssl`),
      ])
      return {
        websockets: boolVal(ws),
        http2: boolVal(http2),
        automatic_https_rewrites: boolVal(httpsRewrites),
        min_tls_version: String(minTls.value ?? '1.0'),
        ssl_mode: String(ssl.value ?? 'off'),
      }
    } catch (err) {
      if (err instanceof CloudflareApiError) throw err
      throw new CloudflareApiError(
        `Failed to get zone settings: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  async getSetting(settingId: string): Promise<ZoneSetting> {
    try {
      const result = await this.client.get<CfSetting>(
        `/zones/${this.client.getZoneId()}/settings/${settingId}`,
      )
      return {
        id: settingId,
        value: result.value as string | number | boolean,
        editable: result.editable ?? true,
      }
    } catch (err) {
      if (err instanceof CloudflareApiError) throw err
      throw new CloudflareApiError(
        `Failed to get setting "${settingId}": ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  async updateSetting(settingId: string, value: string | boolean | number): Promise<void> {
    try {
      await this.client.patch(`/zones/${this.client.getZoneId()}/settings/${settingId}`, { value })
    } catch (err) {
      if (err instanceof CloudflareApiError) throw err
      throw new CloudflareApiError(
        `Failed to update setting "${settingId}": ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }
}
