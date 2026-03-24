import { type Menu } from '@sag/menu'
import { type ICertificateManager, type IWafRuleManager } from '@sag/core'
import { type GeneratorConfig, type Requirement } from '@sag/types'
import { createStatusTopic } from './topic'
import { fs } from 'zx'
import { join as pathJoin } from 'node:path'
import { cfApi } from '@sag/providers'

export const registerStatusMenu = (
  menu: Menu,
  config: GeneratorConfig,
  certManager?: ICertificateManager,
  wafManager?: IWafRuleManager,
  requirements: Requirement[] = [],
) => {
  const topic = createStatusTopic(certManager, wafManager)

  const noCerts = () => {
    const keyPath = pathJoin(config.workDir, 'certs', 'client.key')
    const pemPath = pathJoin(config.workDir, 'certs', 'client.pem')
    if (!fs.existsSync(keyPath) || !fs.existsSync(pemPath)) {
      return 'Generate mTLS identity first (mTLS & Certificates → Generate Identity)'
    }
    return false
  }

  menu.addOption(
    'Local Certificates & Keychain',
    'status-local',
    topic.localStatus,
    config,
    requirements,
    'Check if cert files exist locally, show expiry dates, and verify macOS Keychain status',
  )
  menu.addOption(
    'Cloudflare Remote State',
    'status-remote',
    topic.remoteStatus,
    config,
    requirements,
    'List client certificates uploaded to CF and active WAF custom rules for your zone',
    () => (!cfApi.isConfigured() ? 'Configure CF token first (Manage CF Token)' : false),
  )
  menu.addOption(
    'mTLS Connection Test',
    'status-test',
    topic.connectionTest,
    config,
    requirements,
    'Test with and without client cert — expects 200 with cert, 403 without',
    noCerts,
  )
}
