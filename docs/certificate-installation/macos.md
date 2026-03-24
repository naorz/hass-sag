# macOS Certificate Installation

## Automated (Recommended)

Select **Install Certificate > macOS** from the tool menu. The tool runs:

1. `security import <p12> -k login.keychain-db -A` — imports cert to your login keychain
2. `security set-identity-preference -s "https://ha.yourdomain.com" -Z <hash>` — sets auto-selection for your domain

After this, Chrome and Safari will automatically use the certificate without showing a popup.

## Manual

### Step 1: Import Certificate

Double-click the `.p12` file, or run:

```bash
security import device-cert.p12 -k ~/Library/Keychains/login.keychain-db -A
```

Enter your macOS password when prompted.

### Step 2: Set Identity Preference

This eliminates the "Select a certificate" popup in browsers:

```bash
# Find the certificate hash
security find-identity -v -p ssl-client | grep "yourdomain"

# Set the identity preference (replace HASH with the actual hash)
security set-identity-preference -s "https://ha.yourdomain.com" -Z HASH
```

### Step 3: Verify

1. Open Chrome or Safari
2. Navigate to `https://ha.yourdomain.com`
3. The connection should work automatically — no certificate popup

## Using Apple Profile (.mobileconfig)

Alternatively, double-click the `apple-secure.mobileconfig` file:

1. Go to **System Settings > Privacy & Security > Profiles**
2. Install the profile
3. The profile includes identity preference settings, so no manual hash setup needed

## Troubleshooting

- **"Certificate not trusted"**: The mTLS certificate doesn't need to be trusted in the system trust store. It only needs to be in your keychain.
- **Still seeing popup**: Verify the identity preference is set: `security get-identity-preference -s "https://ha.yourdomain.com"`
- **Wrong certificate selected**: Remove stale identity preferences: `security set-identity-preference -s "https://ha.yourdomain.com" -n`
