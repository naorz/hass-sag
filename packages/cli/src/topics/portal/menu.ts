import { type Menu } from '@sag/menu'
import { portalTopic } from './topic'
import { type GeneratorConfig, type Requirement } from '@sag/types'
import { type ICertificateManager } from '@sag/shared/core'

export const registerPortalMenu = (
  menu: Menu,
  config: GeneratorConfig,
  requirements: Requirement[] = [],
  certManager?: ICertificateManager,
) => {
  menu.addOption(
    'Portal: FileBrowser Docker Setup',
    'portal-docker',
    portalTopic.run,
    config,
    requirements,
    'Generate docker-compose for self-hosted file portal',
  )
  menu.addOption(
    'Portal: Generate Download Page',
    'portal-download-page',
    portalTopic.generateDownloadPage,
    config,
    requirements,
    'Static HTML page with per-platform install instructions',
  )
  menu.addOption(
    'Portal: Manage Family Members',
    'portal-family',
    (conf) => portalTopic.manageFamilyMembers(conf, certManager),
    config,
    requirements,
    certManager
      ? 'Add/remove family members + provision/revoke CF certificates'
      : 'Add/remove family members (configure CF token to also manage certs)',
  )
  menu.addOption(
    'Portal: Generate QR Code',
    'portal-qr',
    portalTopic.generateQrCode,
    config,
    requirements,
    'Generate a terminal QR code for the portal URL',
  )
  menu.addOption(
    'Portal: Refresh Portal Certs',
    'portal-refresh-certs',
    portalTopic.refreshPortalCerts,
    config,
    requirements,
    'Copy latest certs and optionally update via FileBrowser API',
  )
}
