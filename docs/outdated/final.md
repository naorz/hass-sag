# 🛡️ HASS-SAG: The Ultimate Guide to Secure Access

This document provides a comprehensive overview of the **Home Assistant Secure Access Generator (HASS-SAG)**. It captures the entire journey from identifying the security problem to implementing a robust, certificate-based solution.

---

## 📑 Table of Contents

1.  [The Core Problem](#-the-core-problem)
2.  [The Solution: mTLS & The "Ghost" Strategy](#-the-solution-mtls--the-ghost-strategy)
3.  [Project File Structure & Logic](#-project-file-structure--logic)
4.  [End-to-End Implementation](#-end-to-end-implementation)
    - [A. Automated Process (The Fast Track)](#a-automated-process-the-fast-track)
    - [B. Manual Process (The Deep Dive)](#b-manual-process-the-deep-dive)
5.  [Bonus: GitHub SSH Onboarding](#-bonus-github-ssh-onboarding)
6.  [Final Deployment: Cloudflare & Devices](#-final-deployment-cloudflare--devices)

---

## 🙇‍♂️ The Core Problem

Accessing internal home services (like Home Assistant, self hosting, or private dashboards) from the public internet typically leads to two major issues:

1.  **Security Risks**: Traditional port forwarding exposes your server directly to the internet, inviting brute-force attacks and scanner probes.
2.  **User Friction**: Standard Cloudflare "Managed Challenges" (like "Prove you are human") often break third-party apps, WebSockets or some protocols (silently or not), which are critical for example Home Assistant's real-time updates.

---

## 🔐 The Solution: mTLS & The "Ghost" Strategy

The **mTLS (Mutual TLS)** strategy moves beyond simple passwords. It requires both the server _and_ the client (your phone/laptop) to present a valid cryptographic certificate.

#### The "Ghost" Strategy

Using mTLS on Cloudflare WAF, your server becomes "invisible" to anyone without the certificate.

- **No Cert?** Connection is dropped immediately. Attackers don't even see a login page - just being blocked.
- **Valid Cert?** Cloudflare recognizes your device instantly, bypasses all challenges, and grants seamless access 🤯.

---

## 📂 Project File Structure & Logic

### Documentation (`docs/`)

- **`readme.md` (Root)**: Quick-start instructions and project overview.
- **`guide.md`**: Detailed breakdown of strategy, prerequisites, and file explanations.
- **`final.md`**: (This file) The comprehensive end-to-end master guide.
- **`explain.png`**: A visual diagram of protected infrastructure.

### Security Logic & Standards

- **Strict File Awareness**: The generator script performs integrity checks. If a key or certificate already exists, it pauses to ask for user intent, preventing accidental overwrites.
- **Standardized Identifiers**: Every certificate and profile identifier uses industry-standard **Reverse DNS** (e.g., `com.yourdomain.mtls`). This ensures native compatibility with iOS/macOS.

### Generated Assets (Default)

> ⚠️ Make sure those files will not being publish to the public, its like your keys to your "garage".

The tool generates the following structure in your `dist/` directory (the standardized output folder):

| Directory           | File                        | Description                                                               |
| :------------------ | :-------------------------- | :------------------------------------------------------------------------ |
| `dist/tunnel_cert/` | `client.key`                | **Private Key**: Your device's secret identity. Keep this safe.           |
|                     | `client.csr`                | **Signing Request**: Sent to Cloudflare to get your official certificate. |
|                     | `client.pem`                | **Cloudflare Cert**: The official "stamp" provided by Cloudflare.         |
|                     | `device-cert.p12`           | **PKCS#12 Bundle**: Combines key + cert into a mobile-ready file.         |
|                     | `apple-secure.mobileconfig` | **Apple Profile**: One-tap installation for iOS and macOS.                |
| `dist/filebrowser/` | `docker-compose.yml`        | Configuration for your secure certificate distribution portal.            |
|                     | `settings.json`             | Internal settings for the FileBrowser service.                            |
| `dist/ssh/`         | `github-key`                | **GitHub SSH Key**: Generated SSH key pair for onboarding.                |

---

## 🚀 End-to-End Implementation

### A. Automated Process (The highway 🛣️)

The automated script `npx sag` handles the complex OpenSSL math and file generation.

#### 1. Execution

```bash
# Run via NPX
npx sag

# OR if running from source:
npm run dev
```

#### 2. Step-by-Step Script Walkthrough

The script will guide you through these prompts:

##### Script Prompts

1.  **Working Directory**: Where to save files (default: `dist`).
2.  **Main Domain**: Your registered domain (e.g., `example.com`).
3.  **HA Subdomain**: Subdomain for Home Assistant (e.g., `ha`).
4.  **Key Generation**:
    - Generates `client.key` and `client.csr`.
    - **Action**: The script **copies the CSR content to your clipboard**.
5.  **Cloudflare Action**: The script pauses for you to:
    - Go to **Cloudflare > your domain > SSL/TLS > Create Certificate**.
    - Click **Use my private key and CSR** > Paste clipboard contents.
    - Certificate validate (10 its long time, but up to you, I use 3 and replace it over time)
    - Key Format chose `PEM`.
    - Save the resulting certificate text as `client.pem` under the `dist/tunnel_cert/` folder. (you can create a `.txt` file, paste the text and save it as `client.pem` or change the name once you close the file)
    - **REQUIRED**: In the same "Client Certificates" section, look for the **"Hosts"** list.
      - Click **Edit**.
      - Add your specific subdomain (e.g., `ha.yourdomain.com`) or wildcard (`*.yourdomain.com`).
      - **Without this step, Cloudflare will treat requests as normal traffic and won't ask for your certificate.**
    - Back to the script, press Enter.
6.  **Profile Generation**: Once you press Enter, the script bundles the files into a `.p12` and generates the Apple `.mobileconfig` file.
    (This bundle make it easy to install later for apple devices, non apple devices will need use p12)

##### Add mTLS to Cloudflare

1.  **Add mTLS**: Go to **Cloudflare > your domain > Access Control > Service certificates > Manual mTLS > Add an mTLS certificate**
    - fill up:
      - **Certificate Name**: `Enforce mTLS for subdomain` <- replace the subdomain with what you entered in the script subdomain
      - **Enter FQDNs**: `yourdomain.com` or `ha.yourdomain.com` <- when you use a sub domain you might need to include them all, one by one.
      - Click `Save/Add/Next`.
      - Key format chose `PEM`.
      - COPY! the certificate text and save it as `client.pem` in the `dist/tunnel_cert/` folder.
      - Click `OK`.
2.  Now you will see `CN=$'*.yourdomain.com'` or `CN=$'ha.yourdomain.com'`.  
    click on `Create mTLS rule`.
3.  fill up:
    - **Rule Name**: `Enforce mTLS for subdomain` <- replace the subdomain with what you entered in the script subdomain
    - now you can chose all subdomains or chose specific subdomain
      - For **Wildcard** chose, `Hostname` then chose `*.yourdomain.com` or `ha.yourdomain.com` <- replace the subdomain with what you entered in the script subdomain `yourdomain.com*` (the astrixs are important, its allow all path after the domain)
      - For **Specific** chose, `Hostname` then select `is in` `ha.yourdomain.com` for HASS or/or `vscode.yourdomain.com` <- you will need to add each subdomain one by one.
4.  then take action...
    - chose action `Skip`
    - log matching request - turned it on
    - WAF components to skip - select `All remaining custom rules`, `All rate limiting rules`, `All managed rules`.
5.  place at the First place/order.
6.  Deploy

##### Portal Setup

> Note: the file `mobileconfig` is for apple devices, `p12` file is for other devices such as windows, ubuntu, android etc.

1.  **Portal Setup**: It generates a `docker-compose.yml` for **FileBrowser**, allowing you to host these files securely for remote device onboarding. (TODO: Will be replace with an image the serves the files and verify which devices needs each file)

2.  **Secure Distribution** now we need to distribute the files to the devices via `setup.yourdomain.com` behind Cloudflare Access Application:
    - **Create Access Application**: Go to **Cloudflare > Zero Trust Dashboard > Access Control > Policies** click on `+ add a policy`.
    - fill up:
      - **Policy Name**: `Setup portal whitelist emails`
      - **Action**: `Allow`
      - **Session Duration**: `30 minutes`
      - chose **Include** and under Selector chose **Email** and add your multiple emails, after each email click `Enter`.
      - each email will be allowed to reach the `setup.yourdomain.com` and get from cloudflare an email with a PIN code to access the portal and download the certificates.  
        Click `Save`.
    - Go to `Access Control > Applications` and click on `+ add an application`.
    - again fill application name (e.g. `Setup Portal app`), session duration `30 minutes`, public hostname chose default, subdomain is `setup` domain (chose your domain e.g. `example.com`) path leave empty.  
      click `Save`.
    - try to each `setup.yourdomain.com` and you will get an email with a PIN code to access the portal and download the certificates.

---

### B. Manual Process (The Deep Dive)

#### 1. Generate mTLS Identity

```bash
# Generate the Private Key
openssl genrsa -out client.key 2048

# Create the CSR (Replace with your domain)
openssl req -new -key client.key -out client.csr -subj "/CN=ha.yourdomain.com"
```

#### 2. Create the Apple Bundle

After getting `client.pem` from Cloudflare:

```bash
# Export to PKCS#12
openssl pkcs12 -export -out device-cert.p12 -inkey client.key -in client.pem
```

---

## 🐙 Bonus: GitHub SSH Onboarding

The tool also includes a **GitHub SSH** module to solve "New Machine Friction":

- **What it does**: Automates RSA-2048 key generation, optionally installs them to your global `~/.ssh` directory, adds the key to the macOS/Linux agent/keychain, and copies the public key to your clipboard.
- **Benefit**: Secure code pushes without passwords, integrated into the same setup flow. Allows you to choose between keeping keys in the centralized `dist/` folder or deploying them for immediate use.

---

## 🏁 Final Deployment: Cloudflare & Devices

### Cloudflare WAF Configuration

1.  Go to **Cloudflare Zero Trust > Access > Applications**.
2.  Add a **Policy Rule** to your HA application:
    - **Action**: `Bypass`
    - **Include**: `Valid Client Certificate`
3.  **Result**: Your devices with the certificate bypass authentication instantly.

### Device Onboarding

> **Tip**: For the smoothest experience, use the `Apple Profile (.mobileconfig)` on Apple devices. For others, use the `PKCS#12 (.p12)` file.

#### 🍏 iOS / iPadOS

1.  **Transfer**: AirDrop or download the `.mobileconfig` file to your device.
2.  **Install**: Open **Settings** > **Profile Downloaded** > **Install**.
3.  **TRUST (Crucial)**: Go to **Settings > General > About > Certificate Trust Settings**. Toggle the switch ON for your new certificate.

#### 🍎 macOS (Chrome / Safari)

1.  **Install Profile**: Double-click the `.mobileconfig` file.
2.  **Approve**: Go to **System Settings > Privacy & Security > Profiles** and install it.
3.  **Auto-Select**: The profile includes an "Identity Preference" that tells your Mac to automatically use this certificate for your domain, skipping the "Select Certificate" prompt in Chrome and Safari.

#### 🪟 Windows

1.  **Transfer**: Move the `device-cert.p12` file to your PC.
2.  **Install**: Double-click the file.
3.  **Wizard**:
    - Store Location: **Current User**.
    - Password: Leave blank (unless you added one).
    - Certificate Store: Select **"Automatically select the certificate store"** (or "Personal").
4.  **Chrome**: Restart Chrome. When visiting the site, select the certificate when prompted.

#### 🤖 Android

1.  **Transfer**: Send the `.p12` file to your phone (Google Drive, USB, etc.).
2.  **Install**: Go to **Settings > Security > Encryption & Credentials > Install a certificate > CA certificate** (or "VPN & App user certificate" depending on model).
3.  **Verify**: Select the `.p12` file. You may be asked for your device PIN.

#### 🐧 Linux (Chrome / Firefox)

- **Chrome**: Go to `chrome://settings/certificates` -> **Import** -> Select the `.p12` file.
- **Firefox**: Go to **Settings > Privacy & Security > Certificates > View Certificates > Your Certificates > Import**.

### Automated Verification

The easiest way to verify your mTLS connection is to use the `sag` tool:

1.  Run the tool: `npx sag`
2.  Navigate to **mTLS & Apple Profile**.
3.  Select **Verify mTLS Connection**.

This will automatically use your generated `client.pem` and `client.key` to test connectivity to your subdomain and provide verbose output for debugging.

- **Handshake Failure**: If Cloudflare doesn't ask for a certificate, verify your **Hosts** list in the Cloudflare Dashboard (**SSL/TLS > Client Certificates**).
- **403 Forbidden**: If you are blocked even with the certificate, check your **WAF Rules**.
