import { GitHubSshGenerator } from './generator';

export const githubSshTopic = {
  id: 'github-ssh',
  name: 'GitHub SSH Onboarding',
  run: async () => {
    const generator = new GitHubSshGenerator();
    await generator.run();
  },
};
