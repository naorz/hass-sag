import { type Menu } from '@sag/menu'
import { certInstallTopic } from './topic'
import { type GeneratorConfig, type Requirement } from '@sag/types'
import { fs } from 'zx'
import { join as pathJoin } from 'node:path'

const noP12 = (config: GeneratorConfig) => () => {
  const p12 = pathJoin(config.workDir, 'certs', 'device-cert.p12')
  return !fs.existsSync(p12)
    ? 'Generate PKCS#12 first (mTLS & Certificates → Generate PKCS#12)'
    : false
}

export const registerCertInstallMenu = (
  menu: Menu,
  config: GeneratorConfig,
  requirements: Requirement[] = [],
) => {
  menu.addOption(
    'Install Certificate (this device)',
    'cert-install-local',
    certInstallTopic.run,
    config,
    requirements,
    'Auto-detect platform and install cert for no-popup access',
    noP12(config),
  )
  menu.addOption(
    'Install Certificate (other platform)',
    'cert-install-platform',
    certInstallTopic.installForPlatform,
    config,
    requirements,
    'Generate install scripts/instructions for another OS',
    noP12(config),
  )
  menu.addOption(
    'Verify Certificate Installation',
    'cert-install-verify',
    certInstallTopic.verify,
    config,
    requirements,
    'Check if the certificate is properly installed on this device',
  )
  menu.addOption(
    'Uninstall Certificate',
    'cert-install-uninstall',
    certInstallTopic.uninstall,
    config,
    requirements,
    "Remove the client certificate from this device's trust store",
  )
}
