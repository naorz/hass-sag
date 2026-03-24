import { type Menu } from '@sag/menu'
import { githubSshTopic } from './topic'
import { type GeneratorConfig } from '@sag/types'

export const registerGithubSshMenu = (menu: Menu, config: GeneratorConfig) => {
  menu.addOption(githubSshTopic.name, githubSshTopic.id, githubSshTopic.run, config)
}
