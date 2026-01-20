# HASS-SAG 🛡️
**Home Assistant Secure Access Generator**

A unified CLI for onboarding machines to GitHub via SSH and generating Cloudflare mTLS infrastructure for Home Assistant. Built with TypeScript and `zx`.

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

## 🛡️ Security & Standards

* **Google TS Style**: Logic follows the Google TypeScript Style Guide for readability and maintenance.
* **Reverse DNS**: Identifiers are generated using Reverse DNS notation (e.g., `xyz.my-domain.mtls`) for Apple Profile compliance.
* **Fail-Safe Overwrites**: The script checks for existing file content and prompts for confirmation before every write.
* **Passphrase-less**: Optimized for developer velocity while maintaining secure local agent integration.

---

## 📦 Manual Installation

If you prefer to keep a local copy for development:

1. **Clone the repo**:
```bash
git clone https://github.com/naorz/hass-sag.git
cd hass-sag

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
