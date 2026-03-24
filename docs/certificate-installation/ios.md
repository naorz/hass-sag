# iOS / iPadOS Certificate Installation

iOS requires an Apple Configuration Profile (`.mobileconfig`) — it cannot import `.p12` files directly.

## Step 1: Transfer the Profile

Get `apple-secure.mobileconfig` onto your device:
- **AirDrop** from your Mac
- **Download** from the distribution portal (`setup.yourdomain.com`)
- **Email** the file to yourself (less secure)

## Step 2: Install the Profile

1. Open the file — iOS shows "Profile Downloaded"
2. Go to **Settings > General > VPN & Device Management**
3. Tap the downloaded profile
4. Tap **Install** and enter your device passcode

## Step 3: Enable Trust

This step is critical and easy to miss:

1. Go to **Settings > General > About > Certificate Trust Settings**
2. Find your certificate in the list
3. Toggle the switch **ON**
4. Confirm when prompted

## Step 4: Verify

1. Open Safari or the Home Assistant app
2. Navigate to `https://ha.yourdomain.com`
3. Access should be seamless — no challenges or prompts

## How It Works

The `.mobileconfig` profile contains:
- Your PKCS#12 certificate bundle
- An identity preference payload that tells iOS to automatically present this certificate for your domain
- Proper reverse-DNS identifiers for iOS compatibility

Because the certificate is installed at the OS level, all apps (Safari, Chrome, Home Assistant) use it automatically.

## Troubleshooting

- **"Profile Downloaded" doesn't appear**: Make sure you opened the file from Safari or Files app, not from within another app
- **Certificate not working in HA app**: Ensure trust is enabled (Step 3). Restart the HA app after installation
- **Multiple profiles**: Remove old profiles before installing new ones: Settings > General > VPN & Device Management > tap profile > Remove
