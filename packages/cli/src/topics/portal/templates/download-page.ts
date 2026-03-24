interface DownloadPageParams {
  domain: string
  hostname: string
  hasMobileconfig: boolean
  hasP12: boolean
}

export const buildDownloadPage = (params: DownloadPageParams): string => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Secure Access Setup — ${params.domain}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
  .container { max-width: 600px; padding: 2rem; }
  h1 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #f1f5f9; }
  .subtitle { color: #94a3b8; margin-bottom: 2rem; }
  .platform { background: #1e293b; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem; }
  .platform h2 { font-size: 1.1rem; margin-bottom: 0.75rem; color: #38bdf8; }
  .platform ol { padding-left: 1.25rem; }
  .platform li { margin-bottom: 0.5rem; color: #cbd5e1; line-height: 1.5; }
  .btn { display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; margin-top: 0.75rem; }
  .btn:hover { background: #2563eb; }
  .detected { border: 2px solid #3b82f6; }
  .note { background: #1e293b; border-left: 3px solid #f59e0b; padding: 1rem; border-radius: 0 8px 8px 0; margin-top: 1.5rem; color: #fbbf24; font-size: 0.9rem; }
</style>
</head>
<body>
<div class="container">
  <h1>Secure Access Setup</h1>
  <p class="subtitle">Install the certificate to access ${params.hostname}</p>

  <div class="platform" id="apple">
    <h2>Apple (iPhone / iPad / Mac)</h2>
    ${params.hasMobileconfig ? '<a href="apple-secure.mobileconfig" class="btn">Download Profile</a>' : '<p>Profile not yet generated.</p>'}
    <ol>
      <li>Tap the download button above</li>
      <li>Go to Settings → General → VPN & Device Management</li>
      <li>Install the downloaded profile</li>
      <li>Go to Settings → General → About → Certificate Trust Settings</li>
      <li>Enable trust for the certificate</li>
    </ol>
  </div>

  <div class="platform" id="windows">
    <h2>Windows</h2>
    ${params.hasP12 ? '<a href="device-cert.p12" class="btn">Download Certificate (.p12)</a>' : '<p>Certificate not yet generated.</p>'}
    <ol>
      <li>Download the .p12 file</li>
      <li>Double-click to open the Certificate Import Wizard</li>
      <li>Select "Current User" → Next</li>
      <li>Leave password empty → Next</li>
      <li>Let Windows choose the store → Finish</li>
    </ol>
  </div>

  <div class="platform" id="android">
    <h2>Android</h2>
    ${params.hasP12 ? '<a href="device-cert.p12" class="btn">Download Certificate (.p12)</a>' : '<p>Certificate not yet generated.</p>'}
    <ol>
      <li>Download the .p12 file</li>
      <li>Go to Settings → Security → Encryption & credentials</li>
      <li>Tap "Install a certificate" → "VPN and app user certificate"</li>
      <li>Select the downloaded file — leave password empty</li>
      <li>Give it a name (e.g., "Home Assistant")</li>
    </ol>
  </div>

  <div class="platform" id="linux">
    <h2>Linux (Chrome/Firefox)</h2>
    ${params.hasP12 ? '<a href="device-cert.p12" class="btn">Download Certificate (.p12)</a>' : '<p>Certificate not yet generated.</p>'}
    <ol>
      <li>Download the .p12 file</li>
      <li>For Chrome: open <code>chrome://settings/certificates</code> → Import</li>
      <li>For Firefox: Preferences → Privacy → Certificates → View → Import</li>
      <li>Select the .p12 file — leave password empty</li>
    </ol>
  </div>

  <div class="note">
    After installing, open <strong>https://${params.hostname}</strong> in your browser. The connection should work automatically without any popups.
  </div>
</div>

<script>
  // Auto-detect platform and highlight
  const ua = navigator.userAgent;
  let id = 'windows';
  if (/iPhone|iPad|Mac/i.test(ua)) id = 'apple';
  else if (/Android/i.test(ua)) id = 'android';
  else if (/Linux/i.test(ua)) id = 'linux';
  document.getElementById(id)?.classList.add('detected');
</script>
</body>
</html>`
