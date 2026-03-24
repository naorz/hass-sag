# Web Companion App (GitHub Pages SPA)

**Status**: Backlog
**Priority**: Medium

## Motivation

Non-technical users (family members, end users) currently need to install the CLI to generate and manage certificates. A static SPA hosted on GitHub Pages would provide a zero-install alternative for the most common operations — no Node.js or bun required.

## What / Scope

A static single-page application that handles:

- **Key + CSR generation** — via Web Crypto API (`crypto.subtle.generateKey` + `exportKey`). No server needed; keys are generated in the browser and never leave the device.
- **Cloudflare API management** — CF REST API supports CORS. Calls can be made directly from the browser using a user-provided API token (stored in `sessionStorage` or `localStorage` by explicit user choice).
- **File downloads** — browser-native blob downloads for `.p12`, `.mobileconfig`, `.ps1` installation scripts.
- **Config persistence** — `localStorage` for non-sensitive config (domain, subdomains, family members).
- **QR code generation** — pure JS, no server.
- **Family distribution portal** — static download page viewable without the CLI.

Operations that remain **CLI-only**:
- OS-level certificate installation (Keychain on macOS, NSS on Linux, certutil on Windows)
- Apple profile signing (`security cms` — macOS shell command)
- FileBrowser docker deployment

## How (rough approach)

- React (or Preact for size) + TypeScript + Vite
- Hosted as a separate repo: `hass-sag-web` → GitHub Pages at `https://naorz.github.io/hass-sag-web`
- Uses the `cloudflare` npm package (browser-compatible) for CF API calls
- WebCrypto API for key generation; `pkijs` or `forge` for CSR creation
- CF API token entered by user → offered to store in `localStorage` (with explicit consent + warning)

## Acceptance Criteria

- [ ] User can generate RSA key + CSR in browser (no server)
- [ ] User can upload CSR to CF and download the signed certificate
- [ ] User can download `.p12`, `.mobileconfig`, `.ps1` files
- [ ] User can manage WAF rules (view, create mTLS skip, create geo-block)
- [ ] User can run HASS config verification
- [ ] User can manage family members + CF Access policies
- [ ] API token stored optionally in `localStorage` with clear consent prompt
- [ ] Works on all modern browsers (Chrome, Safari, Firefox)
- [ ] CLI and SPA share the same `IDisplay` abstraction — no logic duplication

## Related Work

- `src/core/interfaces.ts` — `IDisplay` interface (add when implementing)
- `docs/architecture.md` — system design notes
- Plan Phase 7 in `~/.claude/plans/reflective-drifting-cookie.md`
