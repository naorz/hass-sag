# HASS Config Verification

Checks that your Cloudflare zone settings are compatible with Home Assistant. Requires a CF API token.

## Why This Matters

Home Assistant uses WebSockets for real-time updates, HTTP/2 for performance, and requires specific SSL settings. Misconfigured Cloudflare settings can cause subtle issues — the dashboard loads but automations don't trigger, or the app disconnects randomly.

## Checks Performed

| Check | Required Value | Why |
|:------|:---------------|:----|
| **WebSocket** | ON | HASS uses WebSocket for real-time entity updates and automations |
| **HTTP/2** | ON | Performance and multiplexing for HASS dashboard |
| **SSL Mode** | Full or Strict | Ensures end-to-end encryption between CF and your server |
| **Min TLS Version** | 1.2+ | Security baseline; older versions have known vulnerabilities |
| **HTTPS Rewrites** | ON | Prevents mixed-content issues in the HASS dashboard |
| **Certificate Hosts** | Includes HASS subdomain | Without this, CF won't request client certificates for your HASS domain |
| **mTLS Skip Rule** | Active at position 1 | Ensures cert-verified clients bypass all WAF processing; auto-fix reorders if not first |

## Running the Check

Select **HASS Config Verification > Run Full Check** from the menu.

The tool displays results as a checklist:

```
HASS Configuration Verification
================================
[PASS] WebSocket support is enabled
[PASS] HTTP/2 is enabled
[FAIL] SSL mode is 'Flexible' — should be 'Full' or 'Strict'
[PASS] Minimum TLS version is 1.2
[WARN] HTTPS rewrites not enabled
[PASS] Certificate hosts include ha.example.com
[PASS] mTLS skip rule is active at position 1
```

## Auto-Fix

For each failing check, the tool offers to fix it via the CF API:

```
Fix SSL mode to 'Full (strict)'? (y/n)
```

Changes are made one at a time with confirmation. The tool re-runs the check after all fixes to verify.

## Common Issues

### WebSocket Disconnections
If the HA app frequently disconnects, WebSocket support might be OFF. This is the most common CF misconfiguration for HASS.

### "Mixed Content" Warnings
If the HASS dashboard shows mixed-content warnings, enable HTTPS rewrites and set SSL mode to Full or Strict.

### Super Bot Fight Mode
CF's Super Bot Fight Mode can interfere with WebSocket connections. The mTLS skip rule (see [WAF Management](./waf-management.md)) bypasses this for trusted devices.
