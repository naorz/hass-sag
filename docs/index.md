# HASS-SAG Documentation

**Home Assistant Secure Access Generator** — a CLI tool that automates Cloudflare mTLS certificate management to make your home services invisible to the public internet.

## How It Works

mTLS (Mutual TLS) requires both the server and the client device to present a valid certificate. With Cloudflare WAF, devices without your certificate don't even see a login page — the connection is dropped immediately. Devices with a valid certificate bypass all challenges and get seamless access.

## Guides

| Guide | Description |
|:------|:------------|
| [Getting Started](./getting-started.md) | Prerequisites, installation, first run |
| [Cloudflare Setup](./cloudflare-setup.md) | One-time Cloudflare dashboard configuration |
| [Manual Process](./manual-process.md) | Step-by-step without the tool |
| [Semi-Automated Process](./semi-automated-process.md) | Interactive CLI flow (default) |
| [Fully Automated Process](./fully-automated-process.md) | Zero-touch via CF API token |

## Certificate Installation

| Platform | Guide |
|:---------|:------|
| macOS | [certificate-installation/macos.md](./certificate-installation/macos.md) |
| iOS / iPadOS | [certificate-installation/ios.md](./certificate-installation/ios.md) |
| Windows | [certificate-installation/windows.md](./certificate-installation/windows.md) |
| Android | [certificate-installation/android.md](./certificate-installation/android.md) |
| Linux | [certificate-installation/linux.md](./certificate-installation/linux.md) |

## Advanced Topics

| Topic | Description |
|:------|:------------|
| [WAF Management](./waf-management.md) | Managing Cloudflare WAF rules (5-rule free tier limit) |
| [HASS Verification](./hass-verification.md) | Verify Cloudflare settings for Home Assistant compatibility |
| [Certificate Rotation](./certificate-rotation.md) | Zero-downtime certificate renewal |
| [Family Distribution](./family-distribution.md) | Sharing certificates with family members |
| [Troubleshooting](./troubleshooting.md) | Common issues and solutions |
| [Architecture](./architecture.md) | Project structure for contributors |
