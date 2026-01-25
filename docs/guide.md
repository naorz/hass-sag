# 🛡️ Your Digital Assets Behind Cryptographic Walls

### The "Ghost" Strategy

The ultimate goal of this setup is to make your sensitive services  
Home Assistant, VS Code Server, or Private Dashboards - **invisible** to the public internet.  

By using **mTLS (Mutual TLS)**, we move beyond simple password protection or cloudflare challenge protection. We create a Cloudflare WAF (Web Application Firewall) rule that says:

> "If a device presents my specific hardware certificate, bypass all challenges and grant entry. If not, drop the connection immediately."

_This technice can bypasses even the "Email + PIN" challenge for you, while keeping it as a fallback for guest access or new device onboarding._

---

## 📋 System Prerequisites

Before running the automation script or performing manual steps, your machine needs the core toolkit.

### macOS (using Homebrew)

```bash
brew install node nvm openssl
```

### Linux (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install -y nodejs npm openssl
# For nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

### Windows (using Winget)

```bash
winget install OpenJS.NodeJS
winget install openssl
```

---

## 🚀 The Fast Track: Automated Assistance

We have developed a specialized CLI tool, **`hass-sag`**, to automate the complex OpenSSL commands, directory scaffolding, and Apple Profile generation.

**Run the one-liner:**

```bash
npx zx https://raw.githubusercontent.com/my-user/hass-sag/main/setup-certs.ts

```

*The script will guide you through creating your keys, copying CSRs to your clipboard, and building your mobile configuration files.*

---

## 📖 The Deep Dive: Manual Architecture

### 1. The Certificate Handshake (mTLS)

We generate a unique "Hardware Passport" for your devices.

```bash
# Generate the Private Key
openssl genrsa -out client.key 2048

# Create the CSR (Certificate Signing Request)
openssl req -new -key client.key -out client.csr -subj "/CN=ha.yourdomain.com"

```

**Cloudflare Action:**
Upload this CSR to **Zero Trust > Security > Certificates > Client Certificates**. Save the issued certificate as `client.pem`.

### 2. The Apple "One-Tap" Profile

To make this work on iPhones and the Home Assistant App, you must bundle the keys into a `.p12` and wrap them in a `.mobileconfig` XML.

```bash
# Export to PKCS#12 (The bundle)
openssl pkcs12 -export -out device-cert.p12 -inkey client.key -in client.pem

```

### 3. The Power Move: Bypass WAF Rules

Once your certificate is active, you can create a rule in **Cloudflare Zero Trust > Access > Applications**:

1. **Policy Name**: "Trusted Device Bypass"
2. **Action**: `Bypass`
3. **Include**: `Valid Client Certificate` (select your certificate).
4. **The Result**: When you navigate to `ha.yourdomain.com` or `code.yourdomain.com`, the browser sends the cert, and Cloudflare lets you in **instantly** without asking for an Email or PIN.

---

## 📲 The Onboarding Flow

### Secure Portal `setup.yourdomain.com`

We use a Docker-based **FileBrowser** instance behind a standard "Email + PIN" Cloudflare Access wall. This is your "Onboarding Station."

1. Log in via Email + PIN (make sure you added this email to the Cloudflare Access policy rule).
2. Download the `.mobileconfig`.
3. **iOS Installation**: Settings > Profile Downloaded > Install.
4. **Critical Step**: Enable Trust at *Settings > General > About > Certificate Trust Settings*.

### Does this work for Apps?

**Absolutely.** Because the certificate is installed at the **OS level**, the Home Assistant iOS app, VS Code mobile, and Safari will all "see" the certificate and use it to pass the Cloudflare wall automatically.

---

## 💰 Costs & Complexity

* **Cloudflare Zero Trust**: Free Tier (up to 50 users).
* **Hosting**: Your existing HASS server/Docker host.
* **Domain**: Paid (usually $10-$15/year).
* **Security**: Enterprise Grade.

---

## 📂 File Explanation

When you run the script, several key files are generated in your working directory. Here is what they do and why they are important:

### 🔐 mTLS & Identity (`tunnel_cert/`)

*   **`client.key`**: This is your **Private Key**. Think of it as the physical shape of your key. It must stay secret; if someone has this, they can impersonate your device.
*   **`client.csr`**: The **Certificate Signing Request**. This is essentially a formal application you send to Cloudflare saying, "Please verify that this is my key."
*   **`client.pem`**: The **Signed Certificate**. After you paste the CSR into Cloudflare, they give you this file. It’s the "official stamp" that makes your key valid.
*   **`device-cert.p12`**: A **Certificate Bundle**. It combines your private key and signed certificate into one password-protected file so it can be easily moved.

### 🍎 Apple Integration (`tunnel_cert/`)

*   **`apple-secure.mobileconfig`**: This is an **Apple Configuration Profile**. It wraps your certificate bundle into a format that iPhones and Macs understand. When you open this file on an iOS device, it handles the complex process of installing the certificate into the system keychain automatically.

### 🌐 The Onboarding Portal (`filebrowser/`)

*   **`docker-compose.yml`**: This file tells Docker how to start your **FileBrowser** server. This server acts as your private "download station" where you can securely grab your `.mobileconfig` file from any new device after passing the Email + PIN wall.

### 🐙 GitHub SSH (Optional)

*   **`github-key` & `github-key.pub`**: Your private and public SSH keys. These allow you to push and pull code from GitHub securely without typing your password every time.

