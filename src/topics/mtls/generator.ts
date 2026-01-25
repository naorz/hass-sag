import { cli, clipboard, ssl, fileSystem } from '@sag/utils';
import { fs, $ } from 'zx';
import { join as pathJoin } from 'node:path';
import { randomUUID } from 'node:crypto';
import { appleProfileTemplate } from './templates';
import { type GeneratorConfig } from '@sag/types';

export class MtlsGenerator {
  async generateCertificates(config: GeneratorConfig): Promise<void> {
    cli.printSection('mTLS Identity');
    const certDir = pathJoin(config.workDir, 'tunnel_cert');
    await fileSystem.ensureDir(certDir);

    const keyPath = pathJoin(certDir, 'client.key');
    const csrPath = pathJoin(certDir, 'client.csr');

    if (fs.existsSync(keyPath)) {
      cli.printWarning(`File exists: ${keyPath}`);
      const ans = await cli.ask('Override key (o) or keep (k)?', 'k');
      if (ans.toLowerCase() === 'o') await ssl.generateKey(keyPath);
    } else {
      await ssl.generateKey(keyPath);
    }

    await ssl.generateCsr(keyPath, csrPath, `${config.haSubdomain}.${config.domain}`);

    const csrContent = await fs.readFile(csrPath, 'utf-8');
    await clipboard.copy(csrContent);

    cli.printSuccess('CSR copied. Paste into Cloudflare and save client.pem in tunnel_cert/.');
    await cli.ask('Press Enter once client.pem is saved');
  }

  async generateAppleProfile(config: GeneratorConfig): Promise<void> {
    cli.printSection('Apple Profile');
    const certDir = pathJoin(config.workDir, 'tunnel_cert');
    const p12Path = pathJoin(certDir, 'device-cert.p12');
    const profilePath = pathJoin(certDir, 'apple-secure.mobileconfig');
    const keyPath = pathJoin(certDir, 'client.key');
    const pemPath = pathJoin(certDir, 'client.pem');

    if (!fs.existsSync(pemPath)) {
      cli.printError(`client.pem not found at ${pemPath}. Please generate/save it first.`);
      return;
    }

    if (fs.existsSync(p12Path)) {
      const ans = await cli.ask(`device-cert.p12 exists. Override? (y/n)`, 'n');
      if (ans.toLowerCase() === 'y') {
        await ssl.generateP12(p12Path, keyPath, pemPath);
      }
    } else {
      await ssl.generateP12(p12Path, keyPath, pemPath);
    }

    const b64Data = (await $`cat ${p12Path} | base64`).toString().trim();
    const identifier = `${config.domain.split('.').reverse().join('.')}.mtls`;

    const profileXml = appleProfileTemplate({
      haSubdomain: config.haSubdomain,
      b64Data,
      identifier,
      uuid1: randomUUID(),
      uuid2: randomUUID(),
    });

    await fileSystem.safeWrite(profilePath, profileXml);
  }
}
