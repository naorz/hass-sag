import { chalk, question } from 'zx';

export const cli = {
  printHeader(text: string) {
    console.log(chalk.bold.magenta(`\n--- ${text} ---`));
  },
  printSection(text: string) {
    console.log(chalk.blue(`\n--- ${text} ---`));
  },
  printSuccess(text: string) {
    console.log(chalk.green(`[✓] ${text}`));
  },
  printWarning(text: string) {
    console.log(chalk.yellow(`[!] ${text}`));
  },
  printError(text: string) {
    console.log(chalk.red(`[✖] ${text}`));
  },
  printInfo(text: string) {
    console.log(chalk.gray(text));
  },
  async ask(label: string, defaultValue?: string): Promise<string> {
    const hint = defaultValue ? ` (default: ${defaultValue})` : '';
    const ans = await question(chalk.cyan(`${label}${hint}: `));
    return ans || defaultValue || '';
  },
  async askChoice(label: string, options: string[]): Promise<string> {
    options.forEach((opt, i) => console.log(`${i + 1}. ${opt}`));
    const choice = (await question(chalk.cyan(`${label} [1-${options.length}]: `))) || '1';
    return choice;
  },
};
