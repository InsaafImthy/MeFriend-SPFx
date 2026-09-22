import { mefriendModuleKeys } from '../../config/sharePointConfig';
import { hasStoredModuleAccess, isAdministratorRole, toModuleAccess } from './moduleAccessPolicy';

describe('module access policy', () => {
  it('derives legacy module access only from IsActive and CanView', () => {
    expect(hasStoredModuleAccess({ isActive: true, canView: true })).toBe(true);
    expect(hasStoredModuleAccess({ isActive: false, canView: true })).toBe(false);
    expect(hasStoredModuleAccess({ isActive: true, canView: false })).toBe(false);
  });

  it('recognizes the Administrator role without case or surrounding-space sensitivity', () => {
    expect(isAdministratorRole(' Administrator ')).toBe(true);
    expect(isAdministratorRole('user')).toBe(false);
  });

  it('fully enables supported legacy columns when module access is on', () => {
    expect(toModuleAccess('customers', true)).toEqual({
      moduleKey: 'customers',
      isActive: true,
      canView: true,
      canCreate: true,
      canApprove: true,
      canPostToBC: true,
      canManage: true
    });
    expect(toModuleAccess('invoices', true)).toEqual({
      moduleKey: 'invoices',
      isActive: true,
      canView: true,
      canCreate: true,
      canApprove: false,
      canPostToBC: false,
      canManage: true
    });
  });

  it('clears every legacy access column when module access is off', () => {
    mefriendModuleKeys.forEach(moduleKey => {
      expect(toModuleAccess(moduleKey, false)).toEqual({
        moduleKey,
        isActive: false,
        canView: false,
        canCreate: false,
        canApprove: false,
        canPostToBC: false,
        canManage: false
      });
    });
  });
});
