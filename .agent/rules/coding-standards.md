# Coding Standards

Follow these rules for all code generation and modifications in this project:

- **TypeScript Aliases**: Use `@sag/` aliases instead of relative paths (e.g., `import { cli } from '@sag/utils'`).
- **No File Extensions**: Do not include `.ts` or `.js` suffixes in imports (e.g., use `@sag/utils` instead of `@sag/utils/index.js`).
- **Aggregational Exports (Indices)**: 
    - Each module folder (e.g., `src/utils`, `src/topics/mtls`) must have an `index.ts` file that re-exports its public API.
    - Prefer importing from the module root (e.g., `@sag/topics/mtls`) rather than specific files.
    - Top-level indices (e.g., `src/topics/index.ts`) should aggregate all sub-modules.
- **Named Exports**: Use only named exports. Avoid `export default`.
- **Named Imports**: Avoid wildcard imports (`import * as ...`). Import only specific methods/objects and use aliases if needed (e.g., `import { join as pathJoin } from 'node:path'`).
- **Type Organization**:
    - General types belong in `src/types.ts` (top level of `src`).
    - Feature-specific types reside in the feature's directory or alongside the files that use them.
- **Dependency Management**: Always check for the latest stable versions of libraries before installing. Check project dependencies to avoid conflicts.
- **Git Workflow**:
    - Use **Conventional Commits** (e.g., `feat: ...`, `fix: ...`, `chore: ...`).
    - Husky hooks are configured to enforce commit message format and run linters on staged files.
    - Automated changelog generation is handled via `npm run release`.
- **Linting**: Support editor auto-fix on save via ESLint and Prettier. Lint-staged is configured to run on every commit.


