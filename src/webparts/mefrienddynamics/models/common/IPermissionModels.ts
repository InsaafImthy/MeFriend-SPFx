export type PermissionAction = 'view' | 'create';

export type PermissionKey =
  | 'customers.view'
  | 'customers.create'
  | 'events.view'
  | 'salespersons.view'
  | 'invoices.view'
  | 'salesOrders.view'
  | 'salesOrders.create'
  | 'settings.manage';

export interface IUserPermissionContext {
  displayName: string;
  email?: string;
  loginName?: string;
  sharePointGroupNames: readonly string[];
}

export interface IPermissionRule {
  key: PermissionKey;
  moduleKey: string;
  action: PermissionAction;
  enabled: boolean;
  title?: string;
  description?: string;
  allowedSharePointGroupNames?: readonly string[];
}

export interface IPermissionConfig {
  rules: readonly IPermissionRule[];
  settingsListTitle?: string;
}

export interface IPermissionResult {
  key: PermissionKey;
  moduleKey: string;
  action: PermissionAction;
  allowed: boolean;
  source: 'configuration' | 'sharePointList' | 'sharePointGroup' | 'disabled';
}

export interface IPermissionState {
  loading: boolean;
  error?: string;
  userContext: IUserPermissionContext;
  results: readonly IPermissionResult[];
}

export interface ISharePointPermissionSetting {
  id?: number;
  permissionKey: PermissionKey;
  enabled: boolean;
  allowedSharePointGroupNames: readonly string[];
}

export interface IEditablePermissionSetting extends ISharePointPermissionSetting {
  moduleKey: string;
  action: PermissionAction;
  title: string;
  description: string;
  source: 'configuration' | 'sharePointList';
}
