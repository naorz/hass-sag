# Certificate Rotation

Zero-downtime certificate renewal. Requires a CF API token.

## How It Works

Cloudflare allows multiple active client certificates simultaneously. This enables zero-downtime rotation:

1. **New cert is created** alongside the existing one
2. **Both certs work** during the transition period
3. **Old cert is revoked** only after the new cert is verified

WAF rules using `cf.tls_client_auth.cert_verified` check validity of any registered cert, not a specific cert — so no WAF changes are needed during rotation.

## Rotation Flow

Select **Certificate Rotation > Rotate Current Cert** from the menu.

### Step 1: Archive Existing Certificate

The current `client.key` and `client.pem` are archived with a timestamp (e.g., `client-2026-03-22.key`).

### Step 2: Generate New Certificate

A new key pair and CSR are generated. With an API token, the CSR is uploaded to Cloudflare automatically and the signed PEM is saved.

### Step 3: Generate New Bundles

New `.p12` and `.mobileconfig` files are created from the new certificate.

### Step 4: Install New Certificate

The tool delegates to the certificate installation flow for your platform.

### Step 5: Verify

A connection test confirms the new certificate works.

### Step 6: Revoke Old Certificate (Optional)

After confirming the new cert works, you can revoke the old one via the CF API. The tool asks for confirmation before revoking.

## Batch Rotation

For multiple subdomains:

- **Wildcard cert** (`*.domain.com`): One rotation covers everything
- **Per-subdomain certs**: Select **Batch Rotate** to rotate all at once

## When to Rotate

- Before certificate expiry (the tool shows expiry dates in **Status & Health**)
- After a suspected key compromise
- As part of regular security hygiene (e.g., annually)

## Family Devices

After rotating, family members need the new certificate. Use the [Distribution Portal](./family-distribution.md) to make the new cert available for download.
