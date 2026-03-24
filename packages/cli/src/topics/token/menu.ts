import { type Menu } from '@sag/menu'
import { type GeneratorConfig } from '@sag/types'
import { cfApi } from '@sag/providers'
import { tokenTopic } from './topic'

const noToken = () =>
  !cfApi.isConfigured() ? 'Configure a token first (Configure CF Token)' : false

export function registerTokenMenu(menu: Menu, config: GeneratorConfig, badge?: () => string): void {
  const sub = menu.createSubMenu(
    'Manage CF Token',
    'cat-token',
    config,
    'Configure, validate, and clear your Cloudflare API token',
    undefined,
    badge,
  )

  sub.addOption(
    'Validate Token & Permissions',
    'token-validate',
    (conf) => tokenTopic.validate(conf),
    config,
    [],
    'Test token against CF API and report permission gaps',
    noToken,
  )

  sub.addOption(
    'Configure CF Token',
    'token-configure',
    (conf) => tokenTopic.configure(conf),
    config,
    [],
    'Set or replace API token, Zone ID, and Account ID',
  )

  sub.addOption(
    'Clear Token',
    'token-clear',
    () => tokenTopic.clear(),
    config,
    [],
    'Remove token from .env and memory cache',
    noToken,
  )

  sub.addBackOption()
}
