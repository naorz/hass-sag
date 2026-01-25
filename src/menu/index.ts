import { cli } from '@sag/utils';

export interface MenuOption {
  label: string;
  value: string;
  action: () => Promise<void>;
}

export class Menu {
  private options: MenuOption[] = [];

  constructor(private title: string) {}

  addOption(label: string, value: string, action: () => Promise<void>) {
    this.options.push({ label, value, action });
  }

  async show(): Promise<void> {
    cli.printSection(this.title);
    this.options.forEach((opt, i) => {
      console.log(`${i + 1}. ${opt.label}`);
    });

    const choice = await cli.ask(`Select option [1-${this.options.length}]`, '1');
    const index = parseInt(choice) - 1;

    if (this.options[index]) {
      await this.options[index].action();
    } else {
      cli.printError('Invalid selection.');
    }
  }
}
