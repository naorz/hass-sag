# Semi-Automated Process

The default mode when no CF API token is set. The tool generates files locally and guides you through the Cloudflare dashboard steps.

## Run the Tool

```bash
bunx hass-sag
```

## Flow

### 1. Initial Configuration

The tool prompts for:
- **Working directory**: Where to save files (default: current directory)
- **Main domain**: Your registered domain (e.g., `example.com`)
- **HA subdomain**: Subdomain for Home Assistant (e.g., `ha`)

These are saved to `.sag-config.json` for future runs.

### 2. Generate mTLS Identity

Select **mTLS Certificates > Generate Identity (CSR/Key)** from the menu.

The tool:
1. Generates `client.key` (RSA-2048 private key)
2. Generates `client.csr` (Certificate Signing Request)
3. Copies the CSR content to your clipboard

### 3. Cloudflare Dashboard Step

The tool pauses and instructs you to:
1. Go to **Cloudflare > SSL/TLS > Client Certificates**
2. Click **Create Certificate > Use my private key and CSR**
3. Paste from clipboard
4. Choose PEM format and save
5. Copy the certificate text and save as `client.pem` in `tunnel_cert/`
6. Add your hostname(s) to the **Hosts** list

Press Enter to continue.

### 4. Generate PKCS#12 Bundle

Select **mTLS Certificates > Generate PKCS#12 (.p12)**.

Creates `device-cert.p12` combining your key and certificate.

### 5. Generate Apple Profile (Optional)

Select **mTLS Certificates > Generate Apple Profile**.

Creates `apple-secure.mobileconfig` with:
- Embedded `.p12` certificate bundle
- Identity preference for auto-selection on macOS/iOS
- Proper reverse-DNS identifiers

### 6. Install on Device

Select **Install Certificate** and choose your platform. The tool runs OS-specific commands to install the certificate. See [certificate installation guides](./certificate-installation/).

### 7. Verify Connection

Select **mTLS Certificates > Verify Connection**.

The tool runs a `curl` test with your certificate against your configured subdomain and shows verbose output for debugging.

## What's Next

- [Set up WAF rules](./cloudflare-setup.md#step-3-create-waf-rules) in the Cloudflare dashboard
- [Share with family](./family-distribution.md) if needed
- Consider [fully automated mode](./fully-automated-process.md) for future operations
