import { type Menu } from '@sag/menu'
import { type ICertificateManager } from '@sag/core'
import { type GeneratorConfig, type Requirement } from '@sag/types'
import { createCertRotateTopic } from './topic'

export const registerCertRotateMenu = (
  menu: Menu,
  config: GeneratorConfig,
  certManager: ICertificateManager,
  requirements: Requirement[] = [],
) => {
  const topic = createCertRotateTopic(certManager)

  menu.addOption(
    'Rotate: Generate New Certificate',
    'cert-rotate',
    topic.rotate,
    config,
    requirements,
    'Archive old cert, generate new, upload to CF, verify',
  )
  menu.addOption(
    'Rotate: Batch Rotate All',
    'cert-rotate-batch',
    topic.batchRotate,
    config,
    requirements,
    'Rotate all active certificates',
  )
  menu.addOption(
    'Rotate: Revoke Old Certificate',
    'cert-rotate-revoke',
    topic.revokeOld,
    config,
    requirements,
    'Revoke a previously active certificate',
  )
}
