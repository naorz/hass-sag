import { GitHubSshGenerator } from './generator'

export const githubSshTopic = {
  id: 'github-ssh',
  name: 'GitHub SSH Onboarding',
  run: async (config: GeneratorConfig) => {
    const generator = new GitHubSshGenerator()
    await generator.run(config)
  },
}
