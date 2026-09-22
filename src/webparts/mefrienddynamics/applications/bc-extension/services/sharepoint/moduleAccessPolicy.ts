import {
  mefriendModuleCapabilities,
  type MefriendModuleKey
} from '../../config/sharePointConfig';
import type { IAppUserPermission, IModuleAccess } from '../../models/settings/IAppAccessModels';

export const isAdministratorRole = (role: string): boolean => role.trim().toLowerCase() === 'administrator';

export const hasStoredModuleAccess = (
  permission: Pick<IAppUserPermission, 'isActive' | 'canView'>
): boolean => permission.isActive && permission.canView;

export const toModuleAccess = (moduleKey: MefriendModuleKey, hasAccess: boolean): IModuleAccess => {
  const capabilities = mefriendModuleCapabilities[moduleKey];

  return {
    moduleKey,
    canView: hasAccess,
    canCreate: hasAccess,
    canApprove: hasAccess && capabilities.canApprove,
    canPostToBC: hasAccess && capabilities.canPostToBC,
    canManage: hasAccess,
    isActive: hasAccess
  };
};
