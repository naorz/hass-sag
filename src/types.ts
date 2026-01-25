export type OperationModeValue =
  | 'FULL_SETUP'
  | 'MTLS_ONLY'
  | 'APPLE_PROFILE_ONLY'
  | 'PORTAL_ONLY'
  | 'GITHUB_SSH';

export interface GeneratorConfig {
  mode: OperationModeValue;
  workDir: string;
  domain: string;
  haSubdomain: string;
  portalSubdomain: string;
}

export interface Topic {
  id: string;
  name: string;
  registerMenu: (menu: MenuBuilder) => void;
  run: (config: GeneratorConfig) => Promise<void>;
}

export interface MenuBuilder {
  addOption(label: string, value: string, action: () => Promise<void>): void;
}
