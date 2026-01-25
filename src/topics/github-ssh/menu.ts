import { type Menu } from '@sag/menu';
import { githubSshTopic } from './topic';

export const registerGithubSshMenu = (menu: Menu) => {
  menu.addOption(githubSshTopic.name, githubSshTopic.id, githubSshTopic.run);
};
