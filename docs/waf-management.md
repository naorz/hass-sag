# WAF Rule Management

Manage Cloudflare WAF custom rules via the CLI.

**Required token permissions:** Zone > Firewall Services > Edit, Zone > Zone WAF > Edit. See [Cloudflare Setup](./cloudflare-setup.md#api-token-for-automated-mode) for full token setup.

## The 5-Rule Limit

Cloudflare free tier allows **5 custom WAF rules**. This tool helps you use them efficiently.

## Menu Options

### View Current Rules

Lists all custom WAF rules with:
- **Numbered list** (1–5) — use these numbers when selecting rules to update, toggle, or delete
- Expression (what traffic it matches)
- Action (skip, block, challenge, etc.)
- Enabled/disabled status
- Slot usage: X/5 (free tier limit)

**mTLS analysis:** Rules containing `tls_client_auth`, `cert_verified`, or "mTLS" are tagged and analyzed:
- Checks if your configured hostname is covered by skip and block rules
- Warns about missing rules or hostname mismatches
- Suggests optimization when at the 5-rule limit

### Create mTLS Skip Rule

Pre-built rule that bypasses WAF for verified devices:

- **Expression**: `cf.tls_client_auth.cert_verified and http.host eq "ha.yourdomain.com"`
- **Action**: Skip
- **Skips**: Custom rules, rate limiting, managed rules, Super Bot Fight Mode
- **Logging**: Enabled

This should be your **first** rule (highest priority).

### Create Block Rule

Blocks traffic without a valid certificate:

- **Expression**: `not cf.tls_client_auth.cert_verified and http.host eq "ha.yourdomain.com"`
- **Action**: Block

Place this **after** the skip rule.

### Create Geo-Block Rule

Blocks visitors without a valid certificate who are connecting from outside a specific country. This adds an extra layer of protection by restricting non-cert traffic geographically.

- **Expression**: `not cf.tls_client_auth.cert_verified and not ip.src.country in {"IL"} and http.host eq "ha.yourdomain.com"`
- **Action**: Block
- **Default country**: Configurable (stored in `.sag-config.json` as `geoBlockCountry`)

> **Note:** Certificate holders bypass this rule regardless of their location, because they match the mTLS skip rule (position 1) before this rule is evaluated.

### Enable/Disable Rule

Toggle rules without deleting them. Useful for debugging.

### Optimize Rules

The tool analyzes your rules and suggests combinations to save slots. For example:

**Before** (3 rules):
```
cf.tls_client_auth.cert_verified and http.host eq "ha.example.com"    → Skip
cf.tls_client_auth.cert_verified and http.host eq "nas.example.com"   → Skip
cf.tls_client_auth.cert_verified and http.host eq "code.example.com"  → Skip
```

**After** (1 rule):
```
cf.tls_client_auth.cert_verified and (http.host eq "ha.example.com" or http.host eq "nas.example.com" or http.host eq "code.example.com")  → Skip
```

Saves 2 rule slots.

### Reorder Rules

Change rule priority. The skip rule must always come before the block rule.

### Delete Rule

Remove a rule with confirmation.

## Rule Strategy

For most users with a single subdomain:

| # | Rule | Action |
|:--|:-----|:-------|
| 1 | mTLS skip for `ha.yourdomain.com` | Skip WAF |
| 2 | Block non-mTLS for `ha.yourdomain.com` | Block |
| 3 | *(Optional)* Geo-block non-cert visitors outside your country | Block |

For multiple subdomains, combine into one skip + one block rule (2 slots total):

| # | Rule | Action |
|:--|:-----|:-------|
| 1 | mTLS skip for `ha` + `nas` + `code` | Skip WAF |
| 2 | Block non-mTLS for `ha` + `nas` + `code` | Block |
| 3 | *(Optional)* Geo-block non-cert visitors outside your country | Block |

With the optional geo-block rule, the 3-rule setup uses 3 of the 5 free-tier slots, leaving 2 for other rules.
