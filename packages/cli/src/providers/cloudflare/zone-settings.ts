import {
  type IZoneSettingsManager,
  type ZoneSettings,
  type ZoneSetting,
  CloudflareApiError,
} from '@sag/shared/core'
import { cli } from '@sag/utils'
import type { SettingEditParams } from 'cloudflare/resources/zones/settings'
import { cfApi } from './base'

export class CfZoneSettingsManager implements IZoneSettingsManager {
  async getSettings(): Promise<ZoneSettings> {
    cli.printInfo('[CF API] Fetching zone settings (WebSockets, HTTP/2, SSL, TLS version)...')
    cli.printInfo('  Verify: SSL/TLS → Overview and Edge Certificates tabs.')
    const zoneId = cfApi.getZoneId()
    const client = cfApi.get()

    try {
      const [ws, http2, httpsRewrites, minTls, ssl] = await Promise.all([
        client.zones.settings.get('websockets', { zone_id: zoneId }),
        client.zones.settings.get('http2', { zone_id: zoneId }),
        client.zones.settings.get('automatic_https_rewrites', { zone_id: zoneId }),
        client.zones.settings.get('min_tls_version', { zone_id: zoneId }),
        client.zones.settings.get('ssl', { zone_id: zoneId }),
      ])

      const valueOf = (setting: { value?: unknown }) =>
        setting && 'value' in setting ? setting.value : undefined

      return {
        websockets: valueOf(ws) === 'on',
        http2: valueOf(http2) === 'on',
        automatic_https_rewrites: valueOf(httpsRewrites) === 'on',
        min_tls_version: String(valueOf(minTls) ?? '1.0'),
        ssl_mode: String(valueOf(ssl) ?? 'off'),
      }
    } catch (err) {
      throw new CloudflareApiError(
        `Failed to get zone settings: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  async getSetting(settingId: string): Promise<ZoneSetting> {
    try {
      const result = await cfApi.get().zones.settings.get(settingId, { zone_id: cfApi.getZoneId() })
      const value = 'value' in result ? result.value : undefined
      const editable = 'editable' in result ? (result.editable as boolean) : undefined
      return {
        id: settingId,
        value: value as string | number | boolean,
        editable,
      }
    } catch (err) {
      throw new CloudflareApiError(
        `Failed to get setting "${settingId}": ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  async updateSetting(settingId: string, value: string | boolean | number): Promise<void> {
    cli.printInfo(`[CF API] Updating zone setting "${settingId}" → ${String(value)}...`)
    cli.printInfo('  Verify: SSL/TLS settings page — setting value should match.')
    try {
      await cfApi.get().zones.settings.edit(settingId, {
        zone_id: cfApi.getZoneId(),
        value: value as SettingEditParams.Variant1['value'],
      })
    } catch (err) {
      throw new CloudflareApiError(
        `Failed to update setting "${settingId}": ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }
}
