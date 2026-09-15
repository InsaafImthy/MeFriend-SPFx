import * as React from 'react';
import type { MefriendModuleKey } from '../config/sharePointConfig';
import type { IAppUser, ICurrentAppAccess, IModuleAccess } from '../models/settings/IAppAccessModels';
import type { AppAccessService } from '../services/sharepoint/appAccessService';

const emptyModuleAccess = (moduleKey: MefriendModuleKey): IModuleAccess => ({
  moduleKey,
  canView: false,
  canCreate: false,
  canApprove: false,
  canPostToBC: false,
  canManage: false,
  isActive: false
});

export interface IUseAppAccessResult {
  loading: boolean;
  accessError?: string;
  currentAppUser?: IAppUser;
  signedInEmail: string;
  isAuthorized: boolean;
  hasModuleAccess: (moduleKey: string) => boolean;
  canView: (moduleKey: string) => boolean;
  canCreate: (moduleKey: string) => boolean;
  canApprove: (moduleKey: string) => boolean;
  canPostToBC: (moduleKey: string) => boolean;
  canManage: (moduleKey: string) => boolean;
  refreshAccess: () => Promise<void>;
}

export const useAppAccess = (appAccessService: AppAccessService): IUseAppAccessResult => {
  const [loading, setLoading] = React.useState<boolean>(true);
  const [access, setAccess] = React.useState<ICurrentAppAccess>({
    signedInEmail: '',
    permissions: {},
    isAuthorized: false
  });
  const mountedRef = React.useRef<boolean>(true);

  const refreshAccess = React.useCallback(async (): Promise<void> => {
    setLoading(true);

    try {
      const currentAccess = await appAccessService.getCurrentAccess(true);

      if (mountedRef.current) {
        setAccess(currentAccess);
      }
    } catch (error) {
      if (mountedRef.current) {
        setAccess({
          signedInEmail: '',
          permissions: {},
          isAuthorized: false,
          accessError: error instanceof Error ? error.message : 'Unable to verify application access.'
        });
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [appAccessService]);

  React.useEffect(() => {
    mountedRef.current = true;
    refreshAccess().catch(() => undefined);

    return () => {
      mountedRef.current = false;
    };
  }, [refreshAccess]);

  const getModuleAccess = React.useCallback(
    (moduleKey: string): IModuleAccess => access.permissions[moduleKey] || emptyModuleAccess(moduleKey as MefriendModuleKey),
    [access.permissions]
  );

  return {
    loading,
    accessError: access.accessError,
    currentAppUser: access.currentAppUser,
    signedInEmail: access.signedInEmail,
    isAuthorized: access.isAuthorized,
    hasModuleAccess: (moduleKey: string): boolean => getModuleAccess(moduleKey).canView,
    canView: (moduleKey: string): boolean => getModuleAccess(moduleKey).canView,
    canCreate: (moduleKey: string): boolean => getModuleAccess(moduleKey).canCreate,
    canApprove: (moduleKey: string): boolean => getModuleAccess(moduleKey).canApprove,
    canPostToBC: (moduleKey: string): boolean => getModuleAccess(moduleKey).canPostToBC,
    canManage: (moduleKey: string): boolean => getModuleAccess(moduleKey).canManage,
    refreshAccess
  };
};
