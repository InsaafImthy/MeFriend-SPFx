import type { ComponentType } from 'react';
import { bcExtensionApplication } from '../../applications/bc-extension';
import type { IPortalApplicationProps } from '../../shared/models/IPortalApplicationProps';

export interface IPortalApplication {
  id: string;
  name: string;
  description?: string;
  iconName: string;
  route: string;
  defaultPath: string;
  enabled: boolean;
  legacyPathRoots?: readonly string[];
  component: ComponentType<IPortalApplicationProps>;
}

// Register future application modules here. The launcher and router consume the
// same registry, so neither needs a new application-specific branch.
export const applications: readonly IPortalApplication[] = [
  bcExtensionApplication
];
