# Troubleshooting

## Connection Issues

### Handshake Failure / Certificate Not Requested

**Symptom**: `curl` shows no certificate exchange, or the browser doesn't prompt for a cert.

**Cause**: Certificate hosts not configured in Cloudflare.

**Fix**: Go to **Cloudflare > SSL/TLS > Client Certificates** and add your hostname(s) to the **Hosts** list. Without this, Cloudflare doesn't know to request client certificates.

### 403 Forbidden with Valid Certificate

**Symptom**: Certificate is presented but access is blocked.

**Cause**: WAF rules misconfigured — the block rule may be before the skip rule, or the skip rule expression doesn't match your hostname.

**Fix**: Check rule order in **Cloudflare > Security > WAF > Custom Rules**. The mTLS skip rule must be first. Use the tool's **WAF Rule Management > View Current Rules** to inspect.

### Certificate Popup on Every Visit (macOS)

**Symptom**: Chrome/Safari asks to select a certificate on every page load.

**Cause**: Identity preference not set.

**Fix**: Run the tool's **Install Certificate > macOS** which sets `security set-identity-preference`. Or manually:
```bash
security find-identity -v -p ssl-client
security set-identity-preference -s "https://ha.yourdomain.com" -Z <HASH>
```

### Home Assistant App Disconnects

**Symptom**: The HA iOS/Android app loses connection intermittently.

**Cause**: Likely WebSocket support is disabled in Cloudflare, or Super Bot Fight Mode is blocking WebSocket connections.

**Fix**: Run **HASS Config Verification** to check. Enable WebSocket support and ensure the mTLS skip rule bypasses Bot Fight Mode.

## Certificate Issues

### "Certificate Expired"

**Fix**: Use **Status & Health > Local Device Status** to check expiry. Then **Certificate Rotation > Rotate Current Cert** to renew.

### Certificate Works in Browser but Not in HA App

**Symptom**: Browser accesses the site fine, but the HA app can't connect.

**Cause**: The HA app may not be using the system certificate store on your OS version.

**Fix**:
- **iOS**: Ensure trust is enabled in Settings > General > About > Certificate Trust Settings
- **Android**: Some Android versions require installing as "VPN and app user certificate" specifically

### Lost Private Key

If `client.key` is lost, the certificate is unusable. You must:
1. Generate a new key pair and CSR
2. Upload new CSR to Cloudflare
3. Revoke the old certificate
4. Re-install on all devices

## Build Issues

### `bun run build` Fails

```bash
# Clear cache and rebuild
rm -rf node_modules dist
bun install
bun run build
```

### `bunx hass-sag` Doesn't Work

Ensure bun is installed and on your PATH:
```bash
bun --version
```

For local development, use `bun run dev` instead.

## Verification Commands

### Test mTLS Connection
```bash
curl -v --cert tunnel_cert/client.pem --key tunnel_cert/client.key https://ha.yourdomain.com
```

### Check Certificate Expiry
```bash
openssl x509 -enddate -noout -in tunnel_cert/client.pem
```

### Check Installed Certificates (macOS)
```bash
security find-identity -v -p ssl-client
```

### Check Identity Preference (macOS)
```bash
security get-identity-preference -s "https://ha.yourdomain.com"
```

### Check NSS Database (Linux)
```bash
certutil -d sql:$HOME/.pki/nssdb -L
```
