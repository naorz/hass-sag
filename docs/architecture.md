# Architecture

Project structure and patterns for contributors.

## Directory Structure

```
src/
├── main.ts                    # Entry point, DI composition root
├── types.ts                   # Re-exports from schemas + local interfaces
├── schemas/
│   ├── config.schema.ts       # Zod schemas, const objects, derived types
│   └── index.ts
├── core/
│   ├── interfaces.ts          # Repository pattern interfaces (ICertificateManager, etc.)
│   ├── types.ts               # CF-specific domain types
│   ├── errors.ts              # Error hierarchy (SagError base)
│   └── index.ts
├── providers/
│   └── cloudflare/
│       ├── base.ts            # API client singleton (configure, request)
│       ├── certificates.ts    # ICertificateManager implementation
│       ├── waf-rules.ts       # IWafRuleManager implementation
│       ├── zone-settings.ts   # IZoneSettingsManager implementation
│       ├── access-policies.ts # IAccessPolicyManager implementation
│       ├── types.ts           # Raw CF API response shapes
│       └── index.ts
├── topics/
│   ├── mtls/                  # mTLS certificate generation
│   ├── cert-install/          # Cross-platform cert installation
│   │   └── platforms/         # Per-platform installers
│   ├── waf/                   # WAF rule management
│   ├── hass-verify/           # HASS config verification
│   │   └── checks/            # Individual check implementations
│   ├── status/                # Status & health overview
│   ├── cert-rotate/           # Certificate rotation
│   ├── portal/                # Distribution portal
│   │   └── templates/         # HTML template builders
│   └── github-ssh/            # GitHub SSH onboarding
├── menu/
│   └── index.ts               # Menu system (inquirer select + loop)
└── utils/
    ├── cli.ts                 # CLI prompts (inquirer wrappers)
    ├── clipboard.ts           # Clipboard operations
    ├── configStore.ts         # Config persistence with Zod validation
    ├── fs.ts                  # File system helpers
    ├── network.ts             # Network utilities
    ├── secrets.ts             # In-memory secrets (CF API token)
    ├── ssl.ts                 # OpenSSL command wrappers
    └── index.ts
```

## Patterns

### Topic Structure

Each topic follows the same structure:

```
src/topics/<topic>/
├── index.ts          # Barrel re-export
├── topic.ts          # Topic object with action methods
├── menu.ts           # registerXxxMenu(menu, config, ...deps)
└── generator.ts      # Business logic class
```

### Dependency Injection

Providers are instantiated in `main.ts` and passed to topics via their `register*Menu` functions:

```typescript
const wafManager = new CfWafRuleManager()
registerWafMenu(menu, config, wafManager, cfRequirements)
```

Topics that need CF API access accept provider interfaces, not concrete classes. Topics without providers fall back to semi-automated or manual mode.

### Requirements System

Menu options can have requirements that are checked before the action runs:

```typescript
const cfApiRequirement: Requirement = {
  id: 'cf-api',
  action: async () => { /* configure CF API */ },
  check: () => cfApi.isConfigured(),
}
```

### Validation

Config validation uses Zod schemas with `safeParse()`. Types are derived from schemas via `z.infer<>`. No enums — uses `as const` objects instead.

### Error Handling

Custom error hierarchy extends `SagError`:
- `ConfigValidationError` — invalid config
- `CertificateError` — cert generation/installation failures
- `CloudflareApiError` — CF API failures (includes status code)
- `PlatformNotSupportedError` — unsupported OS

## Build

Vite bundles everything into a single `dist/sag.mjs` (ES module, Node 22 target). Dependencies (`zx`, `@inquirer/prompts`, `zod`) are bundled. Node built-in modules are externalized.

```bash
bun run build    # lint:fix + vite build + chmod +x
bun run dev      # vite-node src/main.ts
bun run lint     # eslint
```

## Adding a New Topic

1. Create `src/topics/<name>/` with `index.ts`, `topic.ts`, `menu.ts`, `generator.ts`
2. Export from `src/topics/index.ts`
3. Register menu in `src/main.ts`
4. If it needs CF API, accept provider interface and add `cfApiRequirement`
