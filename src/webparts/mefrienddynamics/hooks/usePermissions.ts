import * as React from 'react';
import type { IPermissionResult, IPermissionState, PermissionKey } from '../models/common/IPermissionModels';
import type { PermissionService } from '../services/sharepoint/permissionService';

const emptyUserContext = {
  displayName: '',
  sharePointGroupNames: []
};

const hasPermission = (results: readonly IPermissionResult[], permissionKey: PermissionKey): boolean => {
  const result = results.filter(item => item.key === permissionKey)[0];
  return result ? result.allowed : false;
};

export interface IUsePermissionsResult extends IPermissionState {
  canAccessModule: (moduleKey: string) => boolean;
  canCreateCustomer: boolean;
  canCreateSalesOrder: boolean;
  canManageSettings: boolean;
  canViewInvoices: boolean;
  canViewEvents: boolean;
  canViewSalespersons: boolean;
  hasPermission: (permissionKey: PermissionKey) => boolean;
  refresh: () => Promise<void>;
}

export const usePermissions = (permissionService: PermissionService): IUsePermissionsResult => {
  const [state, setState] = React.useState<IPermissionState>({
    loading: true,
    userContext: emptyUserContext,
    results: []
  });

  const isMountedRef = React.useRef<boolean>(true);

  const refresh = React.useCallback(async (): Promise<void> => {
    setState(current => ({
      ...current,
      loading: true,
      error: undefined
    }));

    try {
      const userContext = await permissionService.getUserContext();
      const results = await permissionService.getPermissions();

      if (isMountedRef.current) {
        setState({
          loading: false,
          userContext,
          results
        });
      }
    } catch {
      if (isMountedRef.current) {
        setState(current => ({
          ...current,
          loading: false,
          error: 'Unable to load permission settings.'
        }));
      }
    }
  }, [permissionService]);

  React.useEffect(() => {
    isMountedRef.current = true;
    refresh().catch(() => undefined);

    return () => {
      isMountedRef.current = false;
    };
  }, [refresh]);

  const canAccessModule = React.useCallback(
    (moduleKey: string): boolean => {
      const modulePermission = state.results.filter(result => result.moduleKey === moduleKey && result.action === 'view')[0];
      return modulePermission ? modulePermission.allowed : false;
    },
    [state.results]
  );

  const checkPermission = React.useCallback(
    (permissionKey: PermissionKey): boolean => hasPermission(state.results, permissionKey),
    [state.results]
  );

  return {
    ...state,
    canAccessModule,
    canCreateCustomer: checkPermission('customers.create'),
    canCreateSalesOrder: checkPermission('salesOrders.create'),
    canManageSettings: checkPermission('settings.manage'),
    canViewInvoices: checkPermission('invoices.view'),
    canViewEvents: checkPermission('events.view'),
    canViewSalespersons: checkPermission('salespersons.view'),
    hasPermission: checkPermission,
    refresh
  };
};
