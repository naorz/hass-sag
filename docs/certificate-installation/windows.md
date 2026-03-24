# Windows Certificate Installation

## Automated

Select **Install Certificate > Windows** from the tool menu. The tool runs:

```
certutil -importpfx -user -p "" device-cert.p12
```

It can also generate a `.ps1` PowerShell script for users who prefer a double-click installation.

## Manual

### Step 1: Import Certificate

1. Double-click `device-cert.p12`
2. Certificate Import Wizard opens:
   - Store Location: **Current User**
   - Password: Leave blank (press Next)
   - Certificate Store: **Automatically select the certificate store** (or choose "Personal")
3. Click **Finish**

Or via command line:

```powershell
certutil -importpfx -user -p "" device-cert.p12
```

### Step 2: Verify

1. Open Chrome
2. Navigate to `https://ha.yourdomain.com`
3. Chrome may prompt you to select a certificate on first visit — select your certificate
4. Subsequent visits should be automatic

## Auto-Selection

Unlike macOS, Windows/Chrome doesn't have a built-in identity preference mechanism. Chrome will show the certificate selection dialog on first visit but remembers the choice for subsequent visits.

For fully automated selection, the tool can configure a Chrome policy:

```
AutoSelectCertificateForUrls = ["{\"pattern\":\"https://ha.yourdomain.com\",\"filter\":{}}"]
```

## Troubleshooting

- **Certificate not showing in prompt**: Verify it was imported to the "Personal" store: `certutil -store -user My`
- **Access denied after selecting cert**: Check WAF rules in Cloudflare
- **Need to change certificate**: Remove old cert from `certmgr.msc` > Personal > Certificates before importing new one
