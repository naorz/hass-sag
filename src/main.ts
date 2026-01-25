import { cli } from '@sag/utils';
import { Menu } from '@sag/menu';
import {
  registerGithubSshMenu,
  registerMtlsMenu,
  registerPortalMenu,
  mtlsTopic,
  portalTopic,
} from '@sag/topics';
import { type GeneratorConfig } from '@sag/types';
import { join as pathJoin } from 'node:path';
import { os } from 'zx';

async function main() {
  cli.printHeader('Secure Infrastructure Tool');

  const config: GeneratorConfig = {
    mode: 'FULL_SETUP',
    workDir: '',
    domain: '',
    haSubdomain: '',
    portalSubdomain: 'setup',
  };

  const menu = new Menu('Select Operation');

  // Topic registration
  registerGithubSshMenu(menu);

  // Common config for other topics
  const setupCommonConfig = async () => {
    const defaultWorkDir = pathJoin(os.homedir(), 'git');
    cli.printInfo(`Default working directory: ${defaultWorkDir}`);
    config.workDir = await cli.ask('Use default or enter new path', defaultWorkDir);
    config.domain = await cli.ask('Domain (e.g. example.com)');
    config.haSubdomain = await cli.ask('HA Subdomain', 'ha');
  };

  menu.addOption('Full Setup (mTLS + Portal)', 'full', async () => {
    await setupCommonConfig();
    await mtlsTopic.run(config);
    await portalTopic.run(config);
  });

  registerMtlsMenu(menu, config);
  registerPortalMenu(menu, config);
  menu.addOption('Exit', 'exit', async () => {
    cli.printInfo('Exiting...');
    process.exit(0);
  });

  await menu.show();

  cli.printSuccess('Task Finished.');
}

main().catch((err) => {
  cli.printError(err.message);
  process.exit(1);
});
