# Windows: Certificate Auto-Selection via Chrome Policy

**Status**: Backlog
**Priority**: Low

## Motivation

On macOS and Linux, the CLI eliminates the browser certificate selection popup entirely (macOS: `security set-identity-preference`; Linux: Chrome `AutoSelectCertificateForUrls` policy JSON). On Windows, the certificate popup appears on the first visit and then the browser remembers the choice.

Generating a Chrome policy file for Windows would provide a consistent zero-popup experience across all platforms.

## What / Scope

Add Windows auto-selection support to `src/topics/cert-install/platforms/windows.ts`:

1. Generate a Chrome `AutoSelectCertificateForUrls` policy file for Windows
2. Provide instructions for applying it (user-installed via Group Policy or registry)

The policy JSON format (same as Linux but placed in a different path):
```json
{
  "AutoSelectCertificateForUrls": [
    "{\"pattern\":\"https://ha.yourdomain.com\",\"filter\":{\"ISSUER\":{},\"SUBJECT\":{}}}"
  ]
}
```

On Windows, this can be applied via:
- **Registry** (per-machine): `HKLM\SOFTWARE\Policies\Google\Chrome\AutoSelectCertificateForUrls\1 = <json-string>`
- **Registry** (per-user): `HKCU\SOFTWARE\Policies\Google\Chrome\AutoSelectCertificateForUrls\1 = <json-string>`
- **PowerShell script** — generate a `.ps1` that sets the registry key

## How (rough approach)

In `windows.ts`, after importing the certificate:
1. Generate a `chrome-policy.ps1` alongside the existing `install-cert.ps1`
2. The PowerShell script sets the Chrome registry key for the user's hostname
3. Add instructions in the output: "Run chrome-policy.ps1 to enable auto-selection (no popup)"

No elevated permissions needed for per-user registry keys.

## Acceptance Criteria

- [ ] `windows.ts` generates `chrome-policy.ps1` with correct registry key for the user's domain
- [ ] CLI explains what the script does before generating it
- [ ] Documentation in `docs/certificate-installation/windows.md` updated
- [ ] Tested on Windows with Chrome — confirms no cert popup after running script

## Related Work

- `src/topics/cert-install/platforms/windows.ts` — add policy generation
- `src/topics/cert-install/platforms/linux.ts` — reference implementation (Chrome policy JSON)
- `docs/certificate-installation/windows.md`
