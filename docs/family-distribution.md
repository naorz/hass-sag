# Family Distribution

Share certificates with non-technical family members across all platforms.

## Distribution Methods

### Method A: Download Page with CF Access (Recommended)

A static HTML page behind Cloudflare Access email OTP. Family members:

1. Receive a link to `setup.yourdomain.com`
2. Enter their email
3. Receive a one-time PIN via email
4. See a platform-aware download page with one-click install

#### Setup

1. Select **Distribution Portal > Generate Download Page** from the menu
2. The tool generates `portal/srv/index.html` with:
   - Auto-detected platform (Apple, Windows, Android, Linux)
   - Download buttons for the appropriate cert format
   - Step-by-step installation instructions per platform
3. Deploy the `srv/` folder to your portal subdomain
4. Set up CF Access (see [Cloudflare Setup](./cloudflare-setup.md#step-4-optional-access-application-for-portal))

### Method B: FileBrowser Docker Portal

A self-hosted file server for cert distribution:

1. Select **Distribution Portal > FileBrowser Docker Setup**
2. The tool generates `portal/conf/docker-compose.yml` and `settings.json`
3. Run `docker compose up -d` in the `portal/conf/` directory
4. Access at `setup.yourdomain.com`

## Family Member Management

Select **Distribution Portal > Manage Family Members**.

- **Add member**: Name + email. Email is used for CF Access OTP policy.
- **Remove member**: Select from list. Removes from config (and optionally from CF Access policy).
- **View members**: Lists all registered family members.

Members are stored in `.sag-config.json`.

## Per-Platform Instructions

The download page includes tailored instructions for each platform:

| Platform | File | Key Steps |
|:---------|:-----|:----------|
| iPhone/iPad | `.mobileconfig` | Download > Settings > Install Profile > Enable Trust |
| Mac | `.mobileconfig` | Download > System Settings > Profiles > Install |
| Windows | `.p12` | Download > Double-click > Import Wizard |
| Android | `.p12` | Download > Settings > Security > Install Certificate |
| Linux | `.p12` | Download > NSS import or browser import |

See the [certificate installation guides](./certificate-installation/) for detailed steps.

## QR Code Generation

Select **Portal: Generate QR Code** to print a scannable QR code in the terminal that links to your portal URL. This makes it easy to share the portal link with family members — they scan the code with their phone camera and land directly on the download page.

## Refreshing Portal Certs After Rotation

After rotation, select **Portal: Refresh Portal Certs** to update cert files in the portal and optionally refresh via the FileBrowser REST API. This ensures family members always download the latest certificates.

## Security

- The portal is protected by CF Access email OTP — only whitelisted emails can access it
- Certificate files are encrypted (`.p12` bundle)
- The download page is static HTML — no server-side code, no database
- Session duration is configurable (default: 30 minutes)
