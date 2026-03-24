# Manual Process

Step-by-step commands to set up mTLS without the tool. Useful for understanding what happens under the hood or for environments where the CLI can't run.

## 1. Generate mTLS Identity

```bash
# Create working directory
mkdir -p tunnel_cert && cd tunnel_cert

# Generate 2048-bit RSA private key
openssl genrsa -out client.key 2048

# Create Certificate Signing Request
# Replace ha.yourdomain.com with your subdomain
openssl req -new -key client.key -out client.csr -subj "/CN=ha.yourdomain.com"
```

## 2. Upload CSR to Cloudflare

1. Copy the contents of `client.csr`
2. Go to **Cloudflare Dashboard > SSL/TLS > Client Certificates**
3. Click **Create Certificate**
4. Select **Use my private key and CSR**
5. Paste CSR content, choose PEM format
6. Save the returned certificate as `client.pem`

**Important**: Add your hostname(s) to the certificate's **Hosts** list. Without this, Cloudflare won't request client certificates.

## 3. Generate PKCS#12 Bundle

```bash
# Create .p12 bundle (press Enter for empty password)
openssl pkcs12 -export -out device-cert.p12 \
  -inkey client.key -in client.pem
```

## 4. Create Apple Profile (Optional)

For iOS/macOS, you need a `.mobileconfig` XML file that embeds the `.p12` bundle. The XML structure requires:

- `com.apple.security.pkcs12` payload with base64-encoded `.p12`
- `com.apple.security.identitypreference` payload for auto-selection
- Proper UUIDs and reverse-DNS identifiers

This is tedious to do by hand — use the tool's Apple Profile generator instead.

## 5. Configure WAF Rules

See [Cloudflare Setup](./cloudflare-setup.md#step-3-create-waf-rules) for the WAF rule configuration.

## 6. Install Certificate

See the [certificate installation guides](./certificate-installation/) for your platform.

## 7. Verify Connection

```bash
curl -v --cert client.pem --key client.key https://ha.yourdomain.com
```

A successful connection shows `SSL certificate verify ok` and returns your service's response. If you see a 403, check your WAF rules. If the handshake fails, verify the Hosts list in Cloudflare.
