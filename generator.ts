#!/usr/bin/env zx

/**
 * @fileoverview Infrastructure automation tool.
 * Standards: Google TS Style, No Enums, Strict File Overwrite Checks.
 */

import { $, question, chalk, fs, os } from 'zx';
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';

$.verbose = false;

const OperationMode = {
  FULL_SETUP: 'FULL_SETUP',
  MTLS_ONLY: 'MTLS_ONLY',
  APPLE_PROFILE_ONLY: 'APPLE_PROFILE_ONLY',
  PORTAL_ONLY: 'PORTAL_ONLY',
  GITHUB_SSH: 'GITHUB_SSH',
} as const;

type OperationModeValue = typeof OperationMode[keyof typeof OperationMode];

interface GeneratorConfig {
  mode: OperationModeValue;
  workDir: string;
  domain: string;
  haSubdomain: string;
  portalSubdomain: string;
}

class SecureAccessGenerator {
  private config: GeneratorConfig;

  constructor() {
    this.config = {
      mode: OperationMode.FULL_SETUP,
      workDir: '',
      domain: '',
      haSubdomain: 'ha',
      portalSubdomain: 'setup',
    };
  }

  public async run(): Promise<void> {
    this.printHeader();
    await this.selectOperationMode();

    if (this.config.mode === OperationMode.GITHUB_SSH) {
      await this.onboardGithubUser();
      return;
    }

    await this.gatherCommonConfiguration();
    await this.scaffoldDirectories();

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
        await this.generateAppleProfile();
        break;
      case OperationMode.PORTAL_ONLY:
        await this.generatePortalConfiguration();
        break;
    }

    this.printSummary();
  }

  private printHeader(): void {
    console.log(chalk.bold.magenta('\n--- Secure Infrastructure Tool ---'));
  }

  private async selectOperationMode(): Promise<void> {
    console.log(chalk.blue('--- Select Operation ---'));
    console.log('1. Full Setup (mTLS + Portal)');
    console.log('2. mTLS Identity Only');
    console.log('3. Apple Profile Only');
    console.log('4. Portal Only');
    console.log('5. GitHub SSH Onboarding');
    
    const choice = await question(chalk.cyan('Select option [1-5]: ')) || '1';
    const map: Record<string, OperationModeValue> = {
      '1': OperationMode.FULL_SETUP,
      '2': OperationMode.MTLS_ONLY,
      '3': OperationMode.APPLE_PROFILE_ONLY,
      '4': OperationMode.PORTAL_ONLY,
      '5': OperationMode.GITHUB_SSH,
    };
    this.config.mode = map[choice] || OperationMode.FULL_SETUP;
  }

  /**
   * Helper to handle file writes with content awareness.
   */
  private async safeWrite(filePath: string, content: string): Promise<void> {
    if (fs.existsSync(filePath)) {
      const existing = await fs.readFile(filePath, 'utf-8');
      if (existing.trim().length > 0) {
        console.log(chalk.yellow(`\n[!] File exists with content: ${filePath}`));
        const ans = await question('Override (o) or keep & use existing (k)? [o/k]: ');
        if (ans.toLowerCase() === 'k') return;
      }
    }
    await fs.writeFile(filePath, content);
    console.log(chalk.green(`[✓] Saved: ${filePath}`));
  }

  /**
   * Onboarding process for GitHub SSH setup.
   */
  private async onboardGithubUser(): Promise<void> {
    console.log(chalk.blue('\n--- GitHub SSH Onboarding ---'));
    
    // 1. Path selection
    const defaultSshDir = path.join(os.homedir(), '.ssh');
    console.log(chalk.gray(`Default SSH directory: ${defaultSshDir}`));
    const sshDirChoice = await question(`Use default or enter new path: `);
    const sshDir = sshDirChoice || defaultSshDir;

    // 2. Key name selection
    const defaultKeyName = 'github-key';
    const keyName = await question(`Key name (default: ${defaultKeyName}): `) || defaultKeyName;
    
    const privateKeyPath = path.join(sshDir, keyName);
    const publicKeyPath = `${privateKeyPath}.pub`;

    // 3. Email for identifier
    const defaultEmail = 'naorz@example.com';
    const email = await question(`Identifier email (default: ${defaultEmail}): `) || defaultEmail;

    // 4. Generate Key Pair
    if (fs.existsSync(privateKeyPath)) {
      console.log(chalk.yellow(`\n[!] File exists: ${privateKeyPath}`));
      const ans = await question('Override existing key (o) or keep/use (k)? [o/k]: ');
      if (ans.toLowerCase() === 'o') {
        await $`ssh-keygen -t rsa -b 2048 -f ${privateKeyPath} -C ${email} -N ""`;
      }
    } else {
      await $`ssh-keygen -t rsa -b 2048 -f ${privateKeyPath} -C ${email} -N ""`;
    }

    // 5. Copy to Clipboard
    if (fs.existsSync(publicKeyPath)) {
      const pubContent = await fs.readFile(publicKeyPath, 'utf-8');
      await this.copyToClipboard(pubContent);
      console.log(chalk.white(`\n1. Go to: ${chalk.bold('https://github.com/settings/keys')}`));
      console.log(`2. Click 'New SSH Key' and paste the content now in your clipboard.`);
      await question(chalk.magenta('Press Enter once added to GitHub...'));
    }

    // 6. Add to Agent
    console.log(chalk.gray('Adding key to SSH agent...'));
    if (process.platform === 'darwin') {
      await $`ssh-add --apple-use-keychain ${privateKeyPath}`;
    } else {
      await $`ssh-add ${privateKeyPath}`;
    }

    // 7. Remote Machine Sync
    console.log(chalk.blue('\n[Optional] Copy Identity to Remote Machine'));
    console.log('Aim: Allows password-less login to a remote server (e.g., RPI, Cloud Instance).');
    const remote = await question('Enter MACHINE_USER_NAME@MACHINE_IP (or leave blank to skip): ');
    
    if (remote.trim()) {
      try {
        await $`ssh-copy-id -i ${privateKeyPath} ${remote}`;
      } catch (err) {
        console.log(chalk.red('Failed to copy key to remote machine. Check IP/Username.'));
      }
    } else {
      console.log(chalk.gray('Skipping remote machine sync.'));
    }
  }

  private async generateMtlsCertificates(): Promise<void> {
    console.log(chalk.blue('\n--- mTLS Identity ---'));
    const keyPath = path.join(this.config.workDir, 'tunnel_cert', 'client.key');
    const csrPath = path.join(this.config.workDir, 'tunnel_cert', 'client.csr');

    // Key Generation with check
    if (fs.existsSync(keyPath)) {
        console.log(chalk.yellow(`[!] File exists: ${keyPath}`));
        const ans = await question('Override key (o) or keep (k)? [o/k]: ');
        if (ans.toLowerCase() === 'o') await $`openssl genrsa -out ${keyPath} 2048`;
    } else {
        await $`openssl genrsa -out ${keyPath} 2048`;
    }

    await $`openssl req -new -key ${keyPath} -out ${csrPath} -subj "/CN=${this.config.haSubdomain}.${this.config.domain}"`;
    
    const csrContent = await fs.readFile(csrPath, 'utf-8');
    await this.copyToClipboard(csrContent);
    
    console.log(chalk.green('CSR copied. Paste into Cloudflare and save client.pem in tunnel_cert/.'));
    await question(chalk.magenta('Press Enter once client.pem is saved...'));
  }

  private async generateAppleProfile(): Promise<void> {
    const certDir = path.join(this.config.workDir, 'tunnel_cert');
    const p12Path = path.join(certDir, 'device-cert.p12');
    const profilePath = path.join(certDir, 'apple-secure.mobileconfig');

    if (fs.existsSync(p12Path)) {
      const ans = await question(chalk.yellow(`device-cert.p12 exists. Override? (y/n): `));
      if (ans.toLowerCase() === 'y') {
        await $`openssl pkcs12 -export -out ${p12Path} -inkey ${path.join(certDir, 'client.key')} -in ${path.join(certDir, 'client.pem')} -passout pass:`;
      }
    } else {
      await $`openssl pkcs12 -export -out ${p12Path} -inkey ${path.join(certDir, 'client.key')} -in ${path.join(certDir, 'client.pem')} -passout pass:`;
    }

    const b64Data = (await $`cat ${p12Path} | base64`).toString().trim();
    const identifier = `${this.config.domain.split('.').reverse().join('.')}.mtls`;

    const profileXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>PayloadCertificateFileName</key>
            <string>${this.config.haSubdomain}.p12</string>
            <key>PayloadContent</key>
            <data>${b64Data}</data>
            <key>PayloadType</key>
            <string>com.apple.certificate.pkcs12</string>
            <key>PayloadUUID</key>
            <string>${randomUUID()}</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
        </dict>
    </array>
    <key>PayloadDisplayName</key>
    <string>mTLS: ${this.config.haSubdomain}</string>
    <key>PayloadIdentifier</key>
    <string>${identifier}</string>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>${randomUUID()}</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>`;

    await this.safeWrite(profilePath, profileXml);
  }

  private async generatePortalConfiguration(): Promise<void> {
    const fbDir = path.join(this.config.workDir, 'filebrowser', 'conf');
    const composePath = path.join(fbDir, 'docker-compose.yml');
    const dockerCompose = `services:\n  filebrowser:\n    image: filebrowser/filebrowser:latest\n    ports: ["8443:443"]`;
    
    await this.safeWrite(composePath, dockerCompose);
  }

  private async copyToClipboard(content: string): Promise<void> {
    if (process.platform === 'darwin') {
      await $`echo ${content.trim()} | pbcopy`;
      console.log(chalk.cyan('[Clipboard] Content copied automatically.'));
    } else {
      console.log(chalk.gray('Auto-copy only supported on macOS. Manual copy required.'));
    }
  }

  private async gatherCommonConfiguration(): Promise<void> {
    const defaultWorkDir = path.join(os.homedir(), 'git');
    console.log(chalk.gray(`Default working directory: ${defaultWorkDir}`));
    const workDirChoice = await question(`Use default or enter new path: `);
    this.config.workDir = workDirChoice || defaultWorkDir;

    this.config.domain = await question('Domain (e.g. example.com): ');
    this.config.haSubdomain = await question('HA Subdomain: ') || 'ha';
  }

  private async scaffoldDirectories(): Promise<void> {
    await $`mkdir -p ${path.join(this.config.workDir, 'tunnel_cert')}`;
    await $`mkdir -p ${path.join(this.config.workDir, 'filebrowser', 'conf')}`;
    await $`mkdir -p ${path.join(this.config.workDir, 'filebrowser', 'srv')}`;
  }

  private printSummary(): void {
    console.log(chalk.bold.green('\n✅ Task Finished.'));
  }
}

new SecureAccessGenerator().run().catch(console.error);