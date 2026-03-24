# Fully Automated Process

Zero-touch mode using the Cloudflare API. No dashboard interaction required.

## Setup

Set your CF API token as an environment variable:

```bash
export SAG_CF_API_TOKEN="your-api-token"
```

You can also set zone and account IDs (otherwise the tool will prompt):

```bash
export SAG_CF_ZONE_ID="your-zone-id"
export SAG_CF_ACCOUNT_ID="your-account-id"
```

### Creating an API Token

1. Go to **Cloudflare Dashboard > My Profile > API Tokens**
2. Click **Create Token**
3. Use the **Custom Token** template
4. Permissions needed:
   - **Zone > SSL and Certificates > Edit** (for client certificates)
   - **Zone > Firewall Services > Edit** (for WAF rules)
   - **Zone > Zone Settings > Edit** (for HASS verification/auto-fix)
   - **Account > Access: Apps and Policies > Edit** (for portal Access policies)
5. Zone resources: **Include > Specific zone > your domain**

## Automated Flow

### 1. Generate & Upload Certificate

Select **mTLS Certificates > Generate Identity (CSR/Key)**.

The tool:
1. Generates `client.key` and `client.csr` locally
2. Uploads the CSR to Cloudflare via API
3. Receives the signed PEM certificate
4. Saves `client.pem` automatically
5. Sets hostname associations on the certificate

No clipboard, no dashboard, no manual steps.

### 2. Generate Bundles

Same as semi-automated — generates `.p12` and `.mobileconfig` files locally.

### 3. WAF Management

Select **WAF Rule Management** from the menu. Full CRUD operations via API:
- View existing rules (shows slot usage: X/5)
- Create mTLS skip rules
- Create block rules
- Enable/disable rules
- Optimize rules (combine hostnames to save slots)
- Reorder rules

See [WAF Management](./waf-management.md) for details.

### 4. HASS Verification

Select **HASS Config Verification** to check all CF settings:
- WebSocket support
- HTTP/2
- SSL mode (Full/Strict)
- Minimum TLS version
- HTTPS rewrites
- Certificate host associations

Failing checks can be auto-fixed via API with confirmation.

See [HASS Verification](./hass-verification.md) for details.

### 5. Certificate Rotation

Select **Certificate Rotation** for zero-downtime renewal:
1. Archives existing certificate
2. Generates new key and CSR
3. Uploads to CF via API
4. Installs new cert on device
5. Verifies connection
6. Revokes old certificate

See [Certificate Rotation](./certificate-rotation.md) for details.
