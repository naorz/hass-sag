import { cli, clipboard, fileSystem } from '@sag/utils'
import { $, fs, os } from 'zx'
import { join as pathJoin } from 'node:path'
import { type GeneratorConfig } from '@sag/types'

export class GitHubSshGenerator {
  async run(config: GeneratorConfig): Promise<void> {
    cli.printSection('GitHub SSH Onboarding')

    // 1. Path selection
    const defaultSshDir = pathJoin(config.workDir, 'ssh')
    cli.printInfo(`Default SSH directory: ${defaultSshDir}`)
    const sshDirChoice = await cli.ask('Use default or enter new path', defaultSshDir)
    const sshDir = sshDirChoice
    await fileSystem.ensureDir(sshDir)

    // 2. Key name selection
    const defaultKeyName = 'github-key'
    const keyName = await cli.ask('Key name', defaultKeyName)

    const privateKeyPath = pathJoin(sshDir, keyName)
    const publicKeyPath = `${privateKeyPath}.pub`

    // 3. Email for identifier
    const defaultEmail = 'naorz@example.com'
    const email = await cli.ask('Identifier email', defaultEmail)

    // 4. Generate Key Pair
    if (fs.existsSync(privateKeyPath)) {
      cli.printWarning(`File exists: ${privateKeyPath}`)
      const override = await cli.confirm('Override existing key?')
      if (override) {
        await $`ssh-keygen -t rsa -b 2048 -f ${privateKeyPath} -C ${email} -N ""`
      }
    } else {
      await $`ssh-keygen -t rsa -b 2048 -f ${privateKeyPath} -C ${email} -N ""`
    }

    // 5. Copy to Clipboard
    if (fs.existsSync(publicKeyPath)) {
      const pubContent = await fs.readFile(publicKeyPath, 'utf-8')
      await clipboard.copy(pubContent)
      cli.printInfo(`\n1. Go to: https://github.com/settings/keys`)
      cli.printInfo(`2. Click 'New SSH Key' and paste the content now in your clipboard.`)
      await cli.ask('Press Enter once added to GitHub')
    }

    // 6. Global Copy Option
    cli.printSection('Global SSH Installation')
    const globalDir = pathJoin(os.homedir(), '.ssh')
    const copyGlobal = await cli.confirm(`Copy key to global directory (${globalDir})?`)

    let activeKeyPath = privateKeyPath
    if (copyGlobal) {
      await fileSystem.ensureDir(globalDir)
      const globalPrivatePath = pathJoin(globalDir, keyName)
      const globalPublicPath = `${globalPrivatePath}.pub`

      // Check for collision
      if (fs.existsSync(globalPrivatePath)) {
        const overwrite = await cli.confirm(`Key ${keyName} already exists in ~/.ssh. Overwrite?`)
        if (overwrite) {
          await fs.copy(privateKeyPath, globalPrivatePath)
          await fs.copy(publicKeyPath, globalPublicPath)
          cli.printSuccess(`Copied to ${globalDir}`)
          activeKeyPath = globalPrivatePath
        } else {
          cli.printInfo('Skipping global copy, using local dist/ key.')
        }
      } else {
        await fs.copy(privateKeyPath, globalPrivatePath)
        await fs.copy(publicKeyPath, globalPublicPath)
        // Set proper permissions for global SSH key
        await $`chmod 600 ${globalPrivatePath}`
        cli.printSuccess(`Copied to ${globalDir}`)
        activeKeyPath = globalPrivatePath
      }
    }

    // 7. Add to Agent & Keychain
    cli.printSection('SSH Agent & Service')
    const addToAgent = await cli.confirm('Add key to SSH agent?', true)
    if (addToAgent) {
      cli.printInfo('Adding key...')
      if (process.platform === 'darwin') {
        const useKeychain = await cli.confirm('Add key to macOS Keychain?', true)
        if (useKeychain) {
          await $`ssh-add --apple-use-keychain ${activeKeyPath}`
          cli.printSuccess('Added to agent and Keychain.')
        } else {
          await $`ssh-add ${activeKeyPath}`
          cli.printSuccess('Added to agent (session only).')
        }
      } else {
        await $`ssh-add ${activeKeyPath}`
        cli.printSuccess('Added to agent.')
      }
    }

    // 8. Remote Machine Sync
    cli.printSection('[Optional] Copy Identity to Remote Machine')
    cli.printInfo('Aim: Allows password-less login to a remote server (e.g., RPI, Cloud Instance).')
    const remote = await cli.ask('Enter MACHINE_USER_NAME@MACHINE_IP (or leave blank to skip)')

    if (remote.trim()) {
      try {
        await $`ssh-copy-id -i ${activeKeyPath} ${remote}`
      } catch (_err) {
        cli.printError('Failed to copy key to remote machine. Check IP/Username.')
        console.log(_err)
      }
    } else {
      cli.printInfo('Skipping remote machine sync.')
    }
  }
}
