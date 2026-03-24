import { chalk } from 'zx'
import { input, select, confirm, checkbox, password } from '@inquirer/prompts'

export interface SelectChoice<T = string> {
  name: string
  value: T
  description?: string
}

export const cli = {
  printHeader(text: string) {
    console.log(chalk.bold.magenta(`\n--- ${text} ---`))
  },

  printSection(text: string) {
    console.log(chalk.blue(`\n--- ${text} ---`))
  },

  printSuccess(text: string) {
    console.log(chalk.green(`[✓] ${text}`))
  },

  printWarning(text: string) {
    console.log(chalk.yellow(`[!] ${text}`))
  },

  printError(text: string) {
    console.log(chalk.red(`[✖] ${text}`))
  },

  printInfo(text: string) {
    console.log(chalk.gray(text))
  },

  async ask(label: string, defaultValue?: string): Promise<string> {
    return input({
      message: label,
      default: defaultValue,
    })
  },

  async askChoice<T extends string>(label: string, choices: SelectChoice<T>[]): Promise<T> {
    return select<T>({
      message: label,
      choices,
    })
  },

  async confirm(label: string, defaultValue = false): Promise<boolean> {
    return confirm({
      message: label,
      default: defaultValue,
    })
  },

  async multiSelect<T extends string>(label: string, choices: SelectChoice<T>[]): Promise<T[]> {
    return checkbox<T>({
      message: label,
      choices,
    })
  },

  async password(label: string): Promise<string> {
    return password({
      message: label,
      mask: '*',
    })
  },
}
