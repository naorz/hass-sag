import { type Menu } from '@sag/menu';
import { mtlsTopic } from './topic';
import { type GeneratorConfig } from '@sag/types';

export const registerMtlsMenu = (menu: Menu, config: GeneratorConfig) => {
  menu.addOption(mtlsTopic.name, mtlsTopic.id, () => mtlsTopic.run(config));
};
