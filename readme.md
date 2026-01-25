# HASS-SAG 🛡️
**Home Assistant Secure Access Generator**

Accessing your Home Assistant (or any home server) from the outside can be difficult. Traditional methods like port forwarding or VPNs are either insecure or annoying to use daily.

Cloudflare offers great protection, but its "security challenges" (like "Prove you are human") often break apps like Home Assistant that need constant connections (WebSockets).

### 🔐 The Solution: mTLS
This tool helps you set up **mTLS**. It gives your phone and laptop a "digital key" (certificate) that identifies you instantly.

*   **No more challenges:** Cloudflare recognizes your device and lets you right in—no more breaking WebSockets.
*   **Invisible Security:** Your server stays hidden from the public internet. Only your approved devices can even see the login page.
*   **Simple Onboarding:** Easily share these keys with family and install them on iPhones, Macs, or Android.

### 🛠️ High-Level Process
1. **Cloudflare Setup**: Connect your domain to Cloudflare Zero Trust.
2. **Generate Keys**: Use this script to create your digital certificates.
3. **Lock it Down**: Tell Cloudflare to only allow your specific keys.
4. **Deploy**: Share certificates with your devices and enjoy secure, seamless access.

> **Note:** This tool automates the tedious manual steps of generating keys, building Apple profiles, and setting up distribution portals.

![explain how it works](./docs/explain.png)

---
## Table of content
> TODO

---

## 🚀 One-Line Execution

You can run this tool instantly without cloning the repository or installing packages globally:

```bash
npx zx https://raw.githubusercontent.com/naorz/hass-sag/main/generator.ts

```

*Prerequisites: [Node.js](https://nodejs.org/) (v22+) and [OpenSSL](https://www.openssl.org/).*

---

## 🛠️ Operation Modes

| Mode | Description |
| --- | --- |
| **Full Setup** | Orchestrates mTLS keys, Apple Profile, and Secure Portal. |
| **mTLS Identity** | Generates RSA-2048 Private Key and CSR for Cloudflare. |
| **Apple Profile** | Compiles existing certs into a `.mobileconfig` for iOS/macOS. |
| **Secure Portal** | Generates a FileBrowser Docker stack for cert distribution. |
| **GitHub SSH** | Automates SSH keygen, agent/keychain addition, and clipboard copy. |


---

## 📦 Manual Installation

If you prefer to keep a local copy for development:

1. **Clone the repo**:
   ```bash
   git clone https://github.com/naorz/hass-sag.git && cd hass-sag
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run via NPM**:
   ```bash
   npm start
   ```



---

## 🔗 Useful Links

* [GitHub SSH Keys Settings](https://github.com/settings/keys)
* [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
* [ZX Documentation](https://google.github.io/zx/)

---

**License:** MIT
