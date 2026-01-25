export const appleProfileTemplate = (params: {
  haSubdomain: string;
  b64Data: string;
  identifier: string;
  uuid1: string;
  uuid2: string;
}) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>PayloadCertificateFileName</key>
            <string>${params.haSubdomain}.p12</string>
            <key>PayloadContent</key>
            <data>${params.b64Data}</data>
            <key>PayloadType</key>
            <string>com.apple.certificate.pkcs12</string>
            <key>PayloadUUID</key>
            <string>${params.uuid1}</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
        </dict>
    </array>
    <key>PayloadDisplayName</key>
    <string>mTLS: ${params.haSubdomain}</string>
    <key>PayloadIdentifier</key>
    <string>${params.identifier}</string>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>${params.uuid2}</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>`;
};
