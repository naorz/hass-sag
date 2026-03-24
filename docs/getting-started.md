# Getting Started

## Prerequisites

- [Bun](https://bun.sh/) (v1.0+) or [Node.js](https://nodejs.org/) (v22+)
- [OpenSSL](https://www.openssl.org/)
- A domain connected to Cloudflare

### Install Prerequisites

**macOS**
```bash
brew install oven-sh/bun/bun openssl
```

**Linux (Debian/Ubuntu)**
```bash
curl -fsSL https://bun.sh/install | bash
sudo apt install -y openssl
```

**Windows**
```bash
powershell -c "irm bun.sh/install.ps1 | iex"
winget install openssl
```

## Quick Start

Run without installing:

```bash
bunx hass-sag
```

The interactive menu will guide you through the setup.

## Local Development

```bash
git clone https://github.com/naorz/hass-sag.git && cd hass-sag
bun install
bun run dev
```

## Operation Modes

The tool detects available credentials and adjusts automatically:

| Mode | When | Description |
|:-----|:-----|:------------|
| **Fully Automated** | CF API token available | Zero-touch: generates CSR, uploads via API, receives PEM, generates bundles |
| **Semi-Automated** | No API token (default) | Interactive: generates CSR, copies to clipboard, you paste in CF dashboard |
| **Manual** | N/A | Prints step-by-step OpenSSL commands |

Set `SAG_CF_API_TOKEN` environment variable to enable fully automated mode. The token needs these permissions: Zone Read, SSL and Certificates Edit, Firewall Services Edit, Zone WAF Edit, Zone Settings Edit. See [Cloudflare Setup](./cloudflare-setup.md#api-token-for-automated-mode) for details.

## Menu Overview

```
Secure Infrastructure Tool
├── mTLS Certificates          Generate keys, CSR, P12, Apple profiles
├── Install Certificate        Auto-install cert on current device
├── WAF Rule Management        Create/manage CF WAF rules (requires API token)
├── HASS Config Verification   Check CF settings for HASS compatibility
├── Status & Health            Local + remote cert status, connection test
├── Certificate Rotation       Renew certs with zero downtime
├── Distribution Portal        Share certs with family members
├── GitHub SSH Onboarding      SSH key generation
└── Exit
```

## Generated Files

All files are generated inside the working directory (default: `sag-output/`).

| Directory | File | Description |
|:----------|:-----|:------------|
| `certs/` | `client.key` | Private key (keep secret) |
| | `client.csr` | Certificate Signing Request for Cloudflare |
| | `client.pem` | Signed certificate from Cloudflare |
| | `device-cert.p12` | PKCS#12 bundle (key + cert) for device installation |
| | `apple-secure.mobileconfig` | Apple configuration profile for iOS/macOS |
| `portal/` | `docker-compose.yml` | FileBrowser portal for cert distribution |
| | `srv/index.html` | Download page for family members |
| `archive/` | `<timestamp>/` | Timestamped backups created during certificate rotation |

## Next Steps

1. [Set up Cloudflare](./cloudflare-setup.md) (one-time)
2. [Generate certificates](./semi-automated-process.md) using the tool
3. [Install on your device](./certificate-installation/macos.md) (pick your platform)
4. [Share with family](./family-distribution.md) if needed
