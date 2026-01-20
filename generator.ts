#!/usr/bin/env zx

/**
 * @fileoverview Automation script for Cloudflare mTLS and Secure Portal setup.
 * Follows Google TypeScript Style Guide.
 * * Usage: npx zx setup-certs.ts
 */

import { $, question, chalk, fs, os } from 'zx';
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';

// Disable verbose shell echoing for cleaner output.
$.verbose = false;

/** Defines the execution scope of the script. */
const OperationMode = {
  FULL_SETUP : 'FULL_SETUP',
  MTLS_ONLY : 'MTLS_ONLY',
  APPLE_PROFILE_ONLY: 'APPLE_PROFILE_ONLY',
  PORTAL_ONLY : 'PORTAL_ONLY',
} as const

type OperationModeValue = typeof OperationMode[keyof typeof OperationMode]

/** Configuration interface for the generator. */
interface GeneratorConfig {
  mode: OperationModeValue;
  workDir: string;
  domain: string;
  haSubdomain: string;
  portalSubdomain: string;
}

/**
 * Class responsible for orchestrating the secure access setup.
 * Encapsulates state and logic for certificate generation and configuration.
 */
class SecureAccessGenerator {
  private config: GeneratorConfig;

  constructor() {
    this.config = {
      mode: OperationMode.FULL_SETUP,
      workDir: './setup',
      domain: '',
      haSubdomain: 'ha',
      portalSubdomain: 'setup',
    };
  }

  /**
   * Main entry point to run the generator.
   */
  public async run(): Promise<void> {
    this.printHeader();
    
    // 1. Select Mode
    await this.selectOperationMode();

    // 2. Gather Common Config (Path/Domain is needed for all operations)
    await this.gatherCommonConfiguration();

    // 3. Ensure Directories Exist
    await this.scaffoldDirectories();

    // 4. Execute Flow based on Mode
    switch (this.config.mode) {
      case OperationMode.FULL_SETUP:
        await this.generateMtlsCertificates();
        await this.generateAppleProfile();
        await this.generatePortalConfiguration();
        break;

      case OperationMode.MTLS_ONLY:
        await this.generateMtlsCertificates();
        break;

      case OperationMode.APPLE_PROFILE_ONLY:
        if (this.verifyPrerequisites(['client.key', 'client.pem'])) {
          await this.generateAppleProfile();
        }
        break;

      case OperationMode.PORTAL_ONLY:
        // We warn but don't hard stop if p12 is missing, we just skip copying it.
        await this.generatePortalConfiguration();
        break;
    }

    this.printSummary();
  }

  /**
   * Prints the application header.
   */
  private printHeader(): void {
    console.log(chalk.bold.magenta('\n--- Cloudflare mTLS & Secure Portal Generator (2026 Standards) ---'));
    console.log(chalk.gray('Initializing secure configuration sequence...\n'));
  }

  /**
   * Interactive menu to select the operation mode.
   */
  private async selectOperationMode(): Promise<void> {
    console.log(chalk.blue('--- Select Operation Mode ---'));
    console.log('1. Full Setup (Generate Keys, Apple Profile, and Portal)');
    console.log('2. mTLS Identity Only (Keys & CSR)');
    console.log('3. Apple Profile Only (Regenerate .mobileconfig from existing keys)');
    console.log('4. Portal Configuration Only (Docker Compose & FileBrowser)');
    
    const choice = await question(chalk.cyan('Select option [1-4] (default 1): ')) || '1';

    switch (choice.trim()) {
      case '2':
        this.config.mode = OperationMode.MTLS_ONLY;
        break;
      case '3':
        this.config.mode = OperationMode.APPLE_PROFILE_ONLY;
        break;
      case '4':
        this.config.mode = OperationMode.PORTAL_ONLY;
        break;
      default:
        this.config.mode = OperationMode.FULL_SETUP;
    }
    console.log(chalk.gray(`Selected Mode: ${this.config.mode}\n`));
  }

  /**
   * Prompts the user for necessary configuration parameters common to all tasks.
   */
  private async gatherCommonConfiguration(): Promise<void> {
    console.log(chalk.blue('--- Phase 1: Configuration ---'));

    const workDirRaw = await question('Enter working directory (default: ./setup): ');
    this.config.workDir = workDirRaw || './setup';

    const domainRaw = await question('Enter root domain (e.g., my-domain.com): ');
    if (!domainRaw) {
      throw new Error('Domain name is required to proceed.');
    }
    this.config.domain = domainRaw;

    this.config.haSubdomain = await question(`Enter Home Assistant subdomain (default: ha): `) || 'ha';
    
    // Only ask for portal subdomain if we are generating the portal
    if (this.config.mode === OperationMode.FULL_SETUP || this.config.mode === OperationMode.PORTAL_ONLY) {
      this.config.portalSubdomain = await question(`Enter Portal subdomain (default: setup): `) || 'setup';
    }

    console.log(chalk.green(`\nConfiguration locked: ${JSON.stringify(this.config, null, 2)}\n`));
  }

  /**
   * Checks if specific files exist in the tunnel_cert directory before proceeding.
   */
  private verifyPrerequisites(files: string[]): boolean {
    const missing: string[] = [];
    for (const file of files) {
      const p = path.join(this.config.workDir, 'tunnel_cert', file);
      if (!fs.existsSync(p)) missing.push(file);
    }

    if (missing.length > 0) {
      console.error(chalk.red(`\n[!] Error: Missing prerequisite files in ${path.join(this.config.workDir, 'tunnel_cert')}:`));
      missing.forEach(f => console.error(chalk.red(`    - ${f}`)));
      console.error(chalk.yellow(`Please run the 'mTLS Identity Only' step first or place your existing keys in the folder.`));
      process.exit(1);
    }
    return true;
  }

  /**
   * Creates the required directory structure on the file system.
   */
  private async scaffoldDirectories(): Promise<void> {
    // Only verify/create logic based on what we actually need might be better, 
    // but creating the structure is safe and idempotent.
    const dirs = [
      path.join(this.config.workDir, 'tunnel_cert'),
      path.join(this.config.workDir, 'filebrowser', 'cert'),
      path.join(this.config.workDir, 'filebrowser', 'conf'),
      path.join(this.config.workDir, 'filebrowser', 'srv'),
    ];

    for (const dir of dirs) {
      await $`mkdir -p ${dir}`;
    }
  }

  /**
   * Generates the Private Key and CSR for Cloudflare mTLS.
   */
  private async generateMtlsCertificates(): Promise<void> {
    console.log(chalk.blue('\n--- Phase 2: mTLS Identity Generation ---'));

    const keyPath = path.join(this.config.workDir, 'tunnel_cert', 'client.key');
    const csrPath = path.join(this.config.workDir, 'tunnel_cert', 'client.csr');
    const commonName = `${this.config.haSubdomain}.${this.config.domain}`;

    console.log(chalk.gray(`Generating RSA 2048 bit key for ${commonName}...`));
    
    await $`openssl genrsa -out ${keyPath} 2048`;
    await $`openssl req -new -key ${keyPath} -out ${csrPath} -subj "/CN=${commonName}"`;

    console.log(chalk.green(`\n[ACTION REQUIRED]`));
    console.log(`1. Upload this CSR to Cloudflare (Zero Trust > Security > Certificates):`);
    console.log(chalk.cyan(csrPath));
    
    await this.copyFileToClipboard(csrPath);

    console.log(`2. Paste the resulting Certificate into:`);
    console.log(chalk.bold.yellow(path.join(this.config.workDir, 'tunnel_cert', 'client.pem')));

    await question(chalk.magenta('\nPress Enter once you have saved client.pem to continue...'));

    const pemPath = path.join(this.config.workDir, 'tunnel_cert', 'client.pem');
    if (!fs.existsSync(pemPath)) {
      console.log(chalk.red('\n[!] Error: client.pem not found. Script aborted.'));
      process.exit(1);
    }
  }

  /**
   * Attempts to copy the content of a file to the system clipboard.
   */
  private async copyFileToClipboard(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      switch (process.platform) {
        case 'darwin':
          await $`echo ${content} | pbcopy`;
          console.log(chalk.bgGreen.black(' [✓] CSR copied to clipboard! '));
          break;
        case 'win32':
          await $`echo ${content} | clip`;
          console.log(chalk.bgGreen.black(' [✓] CSR copied to clipboard! '));
          break;
        case 'linux':
          try {
            await $`echo ${content} | xclip -selection clipboard`;
            console.log(chalk.bgGreen.black(' [✓] CSR copied to clipboard! '));
          } catch {
             console.log(chalk.yellow(' [i] Manual copy required (xclip missing).'));
          }
          break;
        default:
          console.log(chalk.yellow(' [i] Manual copy required.'));
      }
    } catch (error) {
      console.log(chalk.red(' [!] Failed to access clipboard.'));
    }
  }

  /**
   * Packages the certs into a PKCS#12 bundle and generates the Apple .mobileconfig.
   */
  private async generateAppleProfile(): Promise<void> {
    console.log(chalk.blue('\n--- Phase 3: Apple Profile Construction ---'));

    const certDir = path.join(this.config.workDir, 'tunnel_cert');
    const keyPath = path.join(certDir, 'client.key');
    const pemPath = path.join(certDir, 'client.pem');
    const p12Path = path.join(certDir, 'device-cert.p12');
    const profilePath = path.join(certDir, 'apple-secure.mobileconfig');

    console.log(chalk.yellow('You will now be prompted to set an Export Password for the .p12 file.'));
    
    try {
      await $`openssl pkcs12 -export -out ${p12Path} -inkey ${keyPath} -in ${pemPath}`;
    } catch (error) {
      console.error(chalk.red('Failed to generate P12 file. Check OpenSSL/Passwords.'));
      process.exit(1);
    }

    const b64Data = (await $`cat ${p12Path} | base64`).toString().trim();
    const displayName = `Home mTLS (${this.config.haSubdomain}.${this.config.domain})`;
    const identifier = `${this.config.domain.split('.').reverse().join('.')}.mtls`;

    const profileXml = this.getAppleProfileTemplate({
      fileName: `${this.config.haSubdomain}.p12`,
      base64Data: b64Data,
      payloadUuid: randomUUID(),
      profileUuid: randomUUID(),
      displayName,
      identifier
    });

    await fs.writeFile(profilePath, profileXml);
    console.log(chalk.green(`[+] Profile generated: ${profilePath}`));
  }

  /**
   * Helper to return the Apple Configuration Profile XML string.
   */
  private getAppleProfileTemplate(params: {
    fileName: string; base64Data: string; payloadUuid: string;
    profileUuid: string; displayName: string; identifier: string;
  }): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>PayloadCertificateFileName</key>
            <string>${params.fileName}</string>
            <key>PayloadContent</key>
            <data>${params.base64Data}</data>
            <key>PayloadType</key>
            <string>com.apple.certificate.pkcs12</string>
            <key>PayloadUUID</key>
            <string>${params.payloadUuid}</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
        </dict>
    </array>
    <key>PayloadDisplayName</key>
    <string>${params.displayName}</string>
    <key>PayloadIdentifier</key>
    <string>${params.identifier}</string>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>${params.profileUuid}</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>`;
  }

  /**
   * Configurations for the FileBrowser secure portal.
   */
  private async generatePortalConfiguration(): Promise<void> {
    console.log(chalk.blue('\n--- Phase 4: Secure Portal (FileBrowser) ---'));

    const fbDir = path.join(this.config.workDir, 'filebrowser');
    const certPath = path.join(fbDir, 'cert', 'fb-cert.pem');
    const keyPath = path.join(fbDir, 'cert', 'fb-key.pem');
    const commonName = `${this.config.portalSubdomain}.${this.config.domain}`;

    // 1. Self-Signed Cert
    console.log(chalk.gray('Generating local SSL certificates for FileBrowser container...'));
    await $`openssl req -x509 -newkey rsa:4096 -keyout ${keyPath} -out ${certPath} -sha256 -days 365 -nodes -subj "/CN=${commonName}"`;

    // 2. Settings JSON
    const settings = {
      port: 443, address: "0.0.0.0", cert: "/certs/fb-cert.pem", key: "/certs/fb-key.pem",
      log: "stdout", database: "/database/filebrowser.db", root: "/srv",
      auth: { method: "json" },
      branding: { name: "Secure Setup Portal", disableExternal: true }
    };
    await fs.writeJson(path.join(fbDir, 'conf', 'settings.json'), settings, { spaces: 2 });

    // 3. Docker Compose
    const dockerCompose = `
services:
  filebrowser:
    image: filebrowser/filebrowser:latest
    container_name: filebrowser-portal
    restart: unless-stopped
    ports: ["8443:443"]
    volumes:
      - ../srv:/srv
      - ./filebrowser.db:/database/filebrowser.db
      - ./settings.json:/config/settings.json
      - ../cert/fb-cert.pem:/certs/fb-cert.pem:ro
      - ../cert/fb-key.pem:/certs/fb-key.pem:ro
    environment:
      - PUID=1000
      - PGID=1000`;
      
    await fs.writeFile(path.join(fbDir, 'conf', 'docker-compose.yml'), dockerCompose);

    // 4. Attempt Copy
    const p12Src = path.join(this.config.workDir, 'tunnel_cert', 'device-cert.p12');
    const profileSrc = path.join(this.config.workDir, 'tunnel_cert', 'apple-secure.mobileconfig');
    const srvDest = path.join(fbDir, 'srv');

    if (fs.existsSync(p12Src) && fs.existsSync(profileSrc)) {
        await $`cp ${p12Src} ${profileSrc} ${srvDest}`;
        console.log(chalk.gray(`[+] Copied mTLS files to Portal download area.`));
    } else {
        console.log(chalk.yellow(`[i] Skipping copy of mTLS files (not found in tunnel_cert). Portal will be empty.`));
    }

    console.log(chalk.green(`[+] Portal Configuration written to ${fbDir}`));
  }

  /**
   * Prints the final summary.
   */
  private printSummary(): void {
    console.log(chalk.bold.green('\n✅ Operation Complete'));
    console.log(chalk.white('------------------------------------------------'));
    
    if (this.config.mode === OperationMode.FULL_SETUP || this.config.mode === OperationMode.MTLS_ONLY) {
       console.log(`Key/CSR:       ${path.join(this.config.workDir, 'tunnel_cert')}`);
    }
    
    if (this.config.mode === OperationMode.FULL_SETUP || this.config.mode === OperationMode.APPLE_PROFILE_ONLY) {
       console.log(`Apple Profile: ${path.join(this.config.workDir, 'tunnel_cert', 'apple-secure.mobileconfig')}`);
    }

    if (this.config.mode === OperationMode.FULL_SETUP || this.config.mode === OperationMode.PORTAL_ONLY) {
       console.log(`Portal Config: ${path.join(this.config.workDir, 'filebrowser', 'conf')}`);
    }
    console.log(chalk.white('------------------------------------------------'));
  }
}

// Execution
const generator = new SecureAccessGenerator();
generator.run().catch((err) => {
  console.error(chalk.bold.red('\n[FATAL] Execution failed:'));
  console.error(err);
  process.exit(1);
});