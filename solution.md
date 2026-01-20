# 🌐 The Mission: Zero Trust & Seamless Onboarding

### The Problem: The "New Machine" Friction

Every developer knows the tedious ritual of setting up a new environment or securing a home server. It usually involves:

1. Generating SSH keys and fumbling with passphrases.
2. Manually copying keys to GitHub and remote servers.
3. Exposing Home Assistant or internal portals to the open web via port forwarding—a massive security risk.
4. Dealing with "untrusted certificate" warnings in browsers.

**HASS-SAG** (Home Assistant Secure Access Generator) was built to consolidate these fragmented steps into a single, high-standards TypeScript automation flow.

---

## 🚀 What This Tool Solves

### 1. Identity-Based Access (mTLS)

Standard "Username/Password" login is vulnerable to brute force. This tool implements **mutual TLS (mTLS)**.

* **The Solution**: We generate a unique private key and certificate request (CSR) for your device.
* **The Result**: Cloudflare verifies your device's hardware certificate before the request even reaches your server. No certificate? No access. The login page doesn't even load for unauthorized users.

### 2. The "Apple Ecosystem" Gap

Installing certificates on iPhones and iPads is notoriously difficult.

* **The Solution**: This script automates the creation of an **Apple Configuration Profile (`.mobileconfig`)**.
* **The Result**: You simply "AirDrop" or download the file, and iOS handles the identity installation natively.

### 3. SSH Onboarding without the Headache

Setting up GitHub access often involves looking up various `ssh-add` flags for the macOS keychain or Linux agent.

* **The Solution**: A guided onboarding flow that handles `rsa-2048` generation, clipboard management, and remote machine syncing (`ssh-copy-id`) in one go.

---

## 🛠 How It Works (The Technical Architecture)

The script is built using **Google's `zx**`, which allows us to combine the power of Node.js (for logic and file system safety) with the speed of Bash (for OpenSSL and SSH commands).

### The Security Logic

The tool implements a **Strict File Awareness** policy:

* **Integrity Check**: Before writing any file, the script reads the target path. If content is detected, it pauses and asks for user intent. This prevents accidental loss of existing SSH keys or production certificates.
* **Standards Compliance**: Every identifier is generated using **Reverse DNS** (e.g., `me.naorz.mtls`). This is the industry standard for Apple and Android system identifiers, ensuring no collisions with other apps.

### The "Secure Portal" Strategy

When you deploy the "Portal" mode:

1. A **FileBrowser** instance is spun up in a Docker container.
2. It is secured with its own SSL layer and sits behind your Cloudflare Tunnel.
3. It serves as a "Drop Box" where you can securely download your `.p12` and `.mobileconfig` files to new devices without sending them over insecure email or chat apps.

---

## 📈 Future Roadmap

* **2026 Focus**: Integration with **AWS Lambda@Edge** for even faster authentication at the network brink.
* **AI-Ready**: Designed to be extended with AI-driven log analysis for Home Assistant security events.
* **WLED/ESP32 Support**: Future modules will include automated WLED certificate flashing for secure smart lighting control.

---

> "Security is a process, not a product. HASS-SAG makes that process automatic."
