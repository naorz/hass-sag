export type {
  OperationModeValue,
  Platform,
  CertStrategy,
  DistributionMethod,
  FamilyMember,
  CloudflareConfig,
  GeneratorConfig,
} from '@sag/schemas'

export { OPERATION_MODES, PLATFORMS, CERT_STRATEGIES, DISTRIBUTION_METHODS } from '@sag/schemas'

export interface Requirement {
  id: string
  action: (config: GeneratorConfig) => Promise<void>
  check?: (config: GeneratorConfig) => boolean | Promise<boolean>
}

export interface Topic {
  id: string
  name: string
  registerMenu: (menu: MenuBuilder) => void
  run: (config: GeneratorConfig) => Promise<void>
}

export interface MenuBuilder {
  addOption(
    label: string,
    value: string,
    action: (config: GeneratorConfig) => Promise<void>,
    requirements?: Requirement[],
  ): void
}

// Re-import for use in this file's interfaces
import { type GeneratorConfig } from '@sag/schemas'
