import { cli, fileSystem } from '@sag/utils';
import { join as pathJoin } from 'node:path';
import { dockerComposeTemplate, settingsJsonTemplate } from './templates';
import { type GeneratorConfig } from '@sag/types';

export class PortalGenerator {
  async run(config: GeneratorConfig): Promise<void> {
    cli.printSection('Portal Configuration');
    const fbDir = pathJoin(config.workDir, 'filebrowser', 'conf');
    const srvDir = pathJoin(config.workDir, 'filebrowser', 'srv');

    await fileSystem.ensureDir(fbDir);
    await fileSystem.ensureDir(srvDir);

    const composePath = pathJoin(fbDir, 'docker-compose.yml');
    const settingsPath = pathJoin(fbDir, 'settings.json');

    const certDir = pathJoin(config.workDir, 'tunnel_cert');

    const dockerCompose = dockerComposeTemplate(srvDir, certDir);
    const settingsJson = settingsJsonTemplate();

    await fileSystem.safeWrite(composePath, dockerCompose);
    await fileSystem.safeWrite(settingsPath, settingsJson);

    cli.printSuccess('Portal configuration files generated in filebrowser/conf/');
  }
}
