import { cli, clipboard } from '@sag/utils';
import { $, fs, os } from 'zx';
import { join as pathJoin } from 'node:path';

export class GitHubSshGenerator {
  async run(): Promise<void> {
    cli.printSection('GitHub SSH Onboarding');

    // 1. Path selection
    const defaultSshDir = pathJoin(os.homedir(), '.ssh');
    cli.printInfo(`Default SSH directory: ${defaultSshDir}`);
    const sshDirChoice = await cli.ask('Use default or enter new path', defaultSshDir);
    const sshDir = sshDirChoice;

    // 2. Key name selection
    const defaultKeyName = 'github-key';
    const keyName = await cli.ask('Key name', defaultKeyName);

    const privateKeyPath = pathJoin(sshDir, keyName);
    const publicKeyPath = `${privateKeyPath}.pub`;

    // 3. Email for identifier
    const defaultEmail = 'naorz@example.com';
    const email = await cli.ask('Identifier email', defaultEmail);

    // 4. Generate Key Pair
    if (fs.existsSync(privateKeyPath)) {
      cli.printWarning(`File exists: ${privateKeyPath}`);
      const ans = await cli.ask('Override existing key (o) or keep/use (k)? [o/k]', 'k');
      if (ans.toLowerCase() === 'o') {
        await $`ssh-keygen -t rsa -b 2048 -f ${privateKeyPath} -C ${email} -N ""`;
      }
    } else {
      await $`ssh-keygen -t rsa -b 2048 -f ${privateKeyPath} -C ${email} -N ""`;
    }

    // 5. Copy to Clipboard
    if (fs.existsSync(publicKeyPath)) {
      const pubContent = await fs.readFile(publicKeyPath, 'utf-8');
      await clipboard.copy(pubContent);
      cli.printInfo(`\n1. Go to: https://github.com/settings/keys`);
      cli.printInfo(`2. Click 'New SSH Key' and paste the content now in your clipboard.`);
      await cli.ask('Press Enter once added to GitHub');
    }

    // 6. Add to Agent
    cli.printInfo('Adding key to SSH agent...');
    if (process.platform === 'darwin') {
      await $`ssh-add --apple-use-keychain ${privateKeyPath}`;
    } else {
      await $`ssh-add ${privateKeyPath}`;
    }

    // 7. Remote Machine Sync
    cli.printSection('[Optional] Copy Identity to Remote Machine');
    cli.printInfo(
      'Aim: Allows password-less login to a remote server (e.g., RPI, Cloud Instance).',
    );
    const remote = await cli.ask('Enter MACHINE_USER_NAME@MACHINE_IP (or leave blank to skip)');

    if (remote.trim()) {
      try {
        await $`ssh-copy-id -i ${privateKeyPath} ${remote}`;
      } catch (_err) {
        cli.printError('Failed to copy key to remote machine. Check IP/Username.');
        console.log(_err);
      }
    } else {
      cli.printInfo('Skipping remote machine sync.');
    }
  }
}
