import { type Menu } from '@sag/menu';
import { portalTopic } from './topic';
import { type GeneratorConfig } from '@sag/types';

export const registerPortalMenu = (menu: Menu, config: GeneratorConfig) => {
  menu.addOption(portalTopic.name, portalTopic.id, () => portalTopic.run(config));
};
