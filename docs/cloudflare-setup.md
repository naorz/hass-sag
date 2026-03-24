# Cloudflare Setup

One-time configuration to enable mTLS on your Cloudflare zone.

## Prerequisites

- A domain added to Cloudflare (free plan works)
- Access to the Cloudflare dashboard

## API Token (for automated mode)

To use automated features (cert upload, WAF management, zone settings), create a CF API token:

1. Go to [Cloudflare Dashboard → My Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token**
3. Add these permissions:

| Scope | Permission | Why |
|:------|:-----------|:----|
| Zone > Zone > Read | Read | Basic zone access |
| Zone > SSL and Certificates > Edit | Edit | Upload and manage mTLS client certificates |
| Zone > Firewall Services > Edit | Edit | Create and manage WAF custom rules |
| Zone > Zone WAF > Edit | Edit | Read and modify WAF rulesets |
| Zone > Zone Settings > Edit | Edit | Enable TLS client authentication |

4. Zone Resources: **Include → Specific zone → your domain**
5. Click **Continue to summary → Create Token**

Use `Manage CF Token → Validate Token & Permissions` in the tool to verify all scopes are correct.

## Step 1: Enable Client Certificates

1. Go to **Cloudflare Dashboard > your domain > SSL/TLS > Client Certificates**
2. Click **Create Certificate** (you'll do this when running the tool)
3. Select **Use my private key and CSR**
4. Paste the CSR content (the tool copies it to your clipboard)
5. Choose validity period (recommended: 3 years)
6. Key format: **PEM**
7. Save the certificate text as `client.pem` in your `tunnel_cert/` folder

## Step 2: Configure Certificate Hosts

This step is critical — without it, Cloudflare won't request certificates from clients.

1. In **SSL/TLS > Client Certificates**, find your certificate
2. Click **Edit** on the **Hosts** section
3. Add your subdomains:
   - `ha.yourdomain.com` for Home Assistant
   - `*.yourdomain.com` for wildcard coverage
4. Save

## Step 3: Create WAF Rules

You need at least two WAF rules (the tool can create these automatically with an API token):

### Rule 1: Skip WAF for Trusted Devices (Priority: First)

- **Expression**: `(cf.tls_client_auth.cert_verified and http.host eq "ha.yourdomain.com")`
- **Action**: Skip
- **Skip**: All remaining custom rules, All rate limiting rules, All managed rules
- **Log matching requests**: ON

### Rule 2: Block Untrusted Traffic (Priority: After Rule 1)

- **Expression**: `(not cf.tls_client_auth.cert_verified and http.host eq "ha.yourdomain.com")`
- **Action**: Block

### Free Tier Limit

Cloudflare free tier allows **5 custom WAF rules**. The tool's [WAF Management](./waf-management.md) feature can optimize rules by combining hostnames with `or` expressions to save slots.

## Step 4: (Optional) Access Application for Portal

If distributing certificates to family members:

1. Go to **Cloudflare Zero Trust > Access > Applications**
2. Add application:
   - **Subdomain**: `setup` (or your portal subdomain)
   - **Domain**: your domain
   - **Session Duration**: 30 minutes
3. Create policy:
   - **Action**: Allow
   - **Include**: Emails (add family member emails)
   - Authentication: Email OTP (one-time PIN sent via email)

## Costs

- **Cloudflare**: Free tier (up to 50 users)
- **Domain**: ~$10-15/year
- **Hosting**: Your existing server/Docker host
