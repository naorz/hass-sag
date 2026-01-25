import { fs } from 'zx';
import { cli } from '@sag/utils/cli';

export const fileSystem = {
  async safeWrite(filePath: string, content: string): Promise<void> {
    if (fs.existsSync(filePath)) {
      const existing = await fs.readFile(filePath, 'utf-8');
      if (existing.trim().length > 0) {
        cli.printWarning(`File exists with content: ${filePath}`);
        const ans = await cli.ask('Override (o) or keep & use existing (k)? [o/k]', 'k');
        if (ans.toLowerCase() === 'k') return;
      }
    }
    await fs.writeFile(filePath, content);
    cli.printSuccess(`Saved: ${filePath}`);
  },

  async ensureDir(dirPath: string): Promise<void> {
    await fs.mkdirp(dirPath);
  },
};
