import { cli } from '@sag/utils'
import { type GeneratorConfig, type Requirement } from '@sag/types'
import { select, Separator } from '@inquirer/prompts'

interface MenuOption {
  label: string
  value: string
  action: (config: GeneratorConfig) => Promise<void>
  description?: string
  disabledWhen?: () => boolean | string
  badge?: () => string // appended to label at render time, e.g. " [✓ token]"
}

export class Menu {
  private options: MenuOption[] = []
  private isSubMenu = false

  constructor(private title: string) {}

  addOption(
    label: string,
    value: string,
    action: (config: GeneratorConfig) => Promise<void>,
    config: GeneratorConfig,
    requirements: Requirement[] = [],
    description?: string,
    disabledWhen?: () => boolean | string,
    badge?: () => string,
  ) {
    const wrappedAction = async () => {
      for (const req of requirements) {
        const isSatisfied = req.check ? await req.check(config) : false
        if (!isSatisfied) {
          await req.action(config)
          const nowSatisfied = req.check ? await req.check(config) : true
          if (!nowSatisfied) {
            cli.printWarning('Setup incomplete — operation cancelled.')
            return
          }
        }
      }
      await action(config)
    }
    this.options.push({ label, value, action: wrappedAction, description, disabledWhen, badge })
  }

  addSeparator() {
    this.options.push({
      label: '---',
      value: '__separator__',
      action: async () => {},
    })
  }

  addBackOption() {
    this.isSubMenu = true
    this.options.push({ label: '← Back', value: 'exit', action: async () => {} })
  }

  createSubMenu(
    label: string,
    id: string,
    config: GeneratorConfig,
    description?: string,
    disabledWhen?: () => boolean | string,
    badge?: () => string,
  ): Menu {
    const sub = new Menu(label)
    this.addOption(
      label,
      id,
      (conf) => sub.show(conf),
      config,
      [],
      description,
      disabledWhen,
      badge,
    )
    return sub
  }

  async show(config: GeneratorConfig): Promise<void> {
    while (true) {
      const choices: (
        | { name: string; value: string; description?: string }
        | InstanceType<typeof Separator>
      )[] = []

      for (const opt of this.options) {
        if (opt.value === '__separator__') {
          choices.push(new Separator())
        } else {
          const disabled = opt.disabledWhen ? opt.disabledWhen() : false
          const name = opt.badge ? `${opt.label}${opt.badge()}` : opt.label
          choices.push({
            name,
            value: opt.value,
            description: opt.description,
            ...(disabled ? { disabled } : {}),
          })
        }
      }

      const selected = await select({
        message: this.title,
        choices,
      })

      if (selected === 'exit') {
        if (!this.isSubMenu) cli.printInfo('Exiting...')
        return
      }

      const option = this.options.find((o) => o.value === selected)
      if (option) {
        try {
          await option.action(config)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          cli.printError(`Error: ${msg}`)
          await cli.ask('Press Enter to return to menu')
        }
        console.log()
      }
    }
  }
}
