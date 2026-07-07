import type { AppRouteKey } from './AppRoute';

export type ModuleStatus = 'ready' | 'pendingContract';

export interface IModuleDefinition {
  key: string;
  title: string;
  description: string;
  defaultRouteKey: AppRouteKey;
  status: ModuleStatus;
}
