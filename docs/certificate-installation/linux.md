# Linux Certificate Installation

## Automated

Select **Install Certificate > Linux** from the tool menu. The tool:

1. Imports the `.p12` into the NSS database (`~/.pki/nssdb`)
2. Creates a Chrome policy file for auto-selection

## Manual

### Step 1: Import to NSS Database

Chrome and Chromium on Linux use the NSS certificate database:

```bash
# Install NSS tools if needed
# Debian/Ubuntu: sudo apt install libnss3-tools
# Fedora: sudo dnf install nss-tools

# Create NSS database if it doesn't exist
mkdir -p ~/.pki/nssdb
certutil -d sql:$HOME/.pki/nssdb -N --empty-password

# Import the certificate
pk12util -d sql:$HOME/.pki/nssdb -i device-cert.p12
```

Leave password empty when prompted (or enter if you set one).

### Step 2: Auto-Selection (Optional)

To skip the certificate selection dialog, create a Chrome policy:

```bash
sudo mkdir -p /etc/opt/chrome/policies/managed
sudo tee /etc/opt/chrome/policies/managed/auto-cert.json << 'EOF'
{
  "AutoSelectCertificateForUrls": [
    "{\"pattern\":\"https://ha.yourdomain.com\",\"filter\":{}}"
  ]
}
EOF
```

Restart Chrome after creating the policy.

### Firefox

Firefox uses its own certificate store:

1. Go to **Settings > Privacy & Security > Certificates > View Certificates**
2. Click **Your Certificates > Import**
3. Select the `.p12` file

Or via command line:

```bash
# Find Firefox profile
PROFILE=$(find ~/.mozilla/firefox -name "*.default-release" -type d | head -1)

# Import
pk12util -d sql:$PROFILE -i device-cert.p12
```

## Step 3: Verify

```bash
curl -v --cert client.pem --key client.key https://ha.yourdomain.com
```

Or open Chrome/Firefox and navigate to `https://ha.yourdomain.com`.

## Troubleshooting

- **"SEC_ERROR_BAD_DATABASE"**: Recreate the NSS database: `certutil -d sql:$HOME/.pki/nssdb -N --empty-password`
- **Chrome policy not working**: Verify with `chrome://policy` — the `AutoSelectCertificateForUrls` policy should appear
- **Certificate not shown**: List installed certs: `certutil -d sql:$HOME/.pki/nssdb -L`
