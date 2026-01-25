import { $ } from 'zx';
import { cli } from '@sag/utils/cli';

export const clipboard = {
  async copy(content: string): Promise<void> {
    if (process.platform === 'darwin') {
      await $`echo ${content.trim()} | pbcopy`;
      cli.printInfo('[Clipboard] Content copied automatically.');
    } else {
      cli.printInfo('Auto-copy only supported on macOS. Manual copy required.');
    }
  },
};
