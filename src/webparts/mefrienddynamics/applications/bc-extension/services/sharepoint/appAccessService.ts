import type { PageContext } from '@microsoft/sp-page-context';
import type { SPHttpClient } from '@microsoft/sp-http';
import {
  mefriendFields,
  mefriendListTitles,
  mefriendModuleKeys,
  normalizeEmail,
  type MefriendModuleKey
} from '../../config/sharePointConfig';
import type { ILookupOption } from '../../../../shared/models/ILookupOption';
import type {
  IAppUser,
  IAppUserInput,
  IAppUserPermission,
  ICurrentAppAccess,
  IModuleAccess
} from '../../models/settings/IAppAccessModels';
import { SharePointRestClient, type ISharePointPeoplePickerUser } from '../../../../shared/services/sharepoint/sharePointRestClient';
import { normalizeSalespersonCode } from '../../utils/salespersonDataScope';

interface IAppUserListItem {
  Id?: number;
  ID?: number;
  Title?: string;
  UserId?: number;
  User?: {
    Title?: string;
    EMail?: string;
    Email?: string;
  };
  Email?: string;
  Role?: string;
  CanAccessApp?: boolean;
  IsActive?: boolean;
  IsSalesperson?: boolean;
  SalespersonCode?: string | number;
}

interface IAppUserPermissionListItem {
  Id?: number;
  ID?: number;
  Title?: string;
  AppUserId?: number;
  ModuleKey?: string;
  CanView?: boolean;
  CanCreate?: boolean;
  CanApprove?: boolean;
  CanPostToBC?: boolean;
  CanManage?: boolean;
  IsActive?: boolean;
}

export interface IAppAccessServiceOptions {
  pageContext?: PageContext;
  spHttpClient?: SPHttpClient;
  webAbsoluteUrl?: string;
}

const appUserSelect = [
  'Id',
  'ID',
  'Title',
  'UserId',
  'User/Title',
  'User/EMail',
  'Email',
  'Role',
  'CanAccessApp',
  'IsActive',
  'IsSalesperson',
  'SalespersonCode'
];

const permissionSelect = [
  'Id',
  'ID',
  'Title',
  'AppUserId',
  'ModuleKey',
  'CanView',
  'CanCreate',
  'CanApprove',
  'CanPostToBC',
  'CanManage',
  'IsActive'
];

const emptyModuleAccess = (moduleKey: MefriendModuleKey): IModuleAccess => ({
  moduleKey,
  canView: false,
  canCreate: false,
  canApprove: false,
  canPostToBC: false,
  canManage: false,
  isActive: false
});

const fullModuleAccess = (moduleKey: MefriendModuleKey): IModuleAccess => ({
  moduleKey,
  canView: true,
  canCreate: true,
  canApprove: true,
  canPostToBC: true,
  canManage: true,
  isActive: true
});

const isAdministratorRole = (role: string): boolean => role.trim().toLowerCase() === 'administrator';

const normalizePermission = (permission: IAppUserPermission): IModuleAccess => {
  const canView = permission.isActive && permission.canView;
  const canManage = canView && permission.canManage;

  return {
    moduleKey: permission.moduleKey,
    canView,
    canCreate: canView && permission.canCreate,
    canApprove: canView && permission.canApprove,
    canPostToBC: canView && permission.canPostToBC,
    canManage,
    isActive: permission.isActive
  };
};

export class AppAccessService {
  private readonly pageContext?: PageContext;
  private readonly restClient: SharePointRestClient;
  private cachedAccess?: ICurrentAppAccess;

  public constructor(options: IAppAccessServiceOptions) {
    this.pageContext = options.pageContext;
    this.restClient = new SharePointRestClient(options);
  }

  public async getCurrentAccess(forceRefresh: boolean = false): Promise<ICurrentAppAccess> {
    if (this.cachedAccess && !forceRefresh) {
      return this.cachedAccess;
    }

    const signedInEmail = normalizeEmail(this.pageContext && this.pageContext.user ? this.pageContext.user.email : '');

    if (!signedInEmail) {
      return this.setCache({
        signedInEmail: '',
        permissions: this.getEmptyAccessMap(),
        isAuthorized: false,
        accessError: 'The signed-in SharePoint user does not have an email address.'
      });
    }

    const appUser = await this.getActiveUserByEmail(signedInEmail);

    if (!appUser) {
      return this.setCache({
        signedInEmail,
        permissions: this.getEmptyAccessMap(),
        isAuthorized: false,
        accessError: `No active app-user record exists for ${signedInEmail}.`
      });
    }

    if (!appUser.isActive || !appUser.canAccessApp || appUser.email !== signedInEmail) {
      return this.setCache({
        currentAppUser: appUser,
        signedInEmail,
        permissions: this.getEmptyAccessMap(),
        isAuthorized: false,
        accessError: `The app-user record for ${signedInEmail} is inactive or blocked.`
      });
    }

    if (isAdministratorRole(appUser.role)) {
      return this.setCache({
        currentAppUser: appUser,
        signedInEmail,
        permissions: this.getFullAccessMap(),
        isAuthorized: true
      });
    }

    const permissions = await this.getPermissionsForUser(appUser.id);
    const accessMap = this.getEmptyAccessMap();

    permissions
      .filter(permission => permission.isActive)
      .forEach(permission => {
        accessMap[permission.moduleKey] = normalizePermission(permission);
      });

    return this.setCache({
      currentAppUser: appUser,
      signedInEmail,
      permissions: accessMap,
      isAuthorized: true
    });
  }

  public clearCache(): void {
    this.cachedAccess = undefined;
  }

  public async getUsers(): Promise<readonly IAppUser[]> {
    const items = await this.restClient.readItems<IAppUserListItem>(mefriendListTitles.appUsers, {
      select: appUserSelect,
      expand: ['User'],
      orderBy: 'Title asc'
    });

    return items.map(this.mapAppUser).filter(user => !!user.email);
  }

  public async getRoleOptions(): Promise<readonly ILookupOption<string>[]> {
    const choices = await this.restClient.getChoiceFieldValues(mefriendListTitles.appUsers, mefriendFields.appUsers.role);

    return choices.map(choice => ({
      key: choice,
      text: choice,
      value: choice
    }));
  }

  public async searchUsers(query: string): Promise<readonly ISharePointPeoplePickerUser[]> {
    return this.restClient.searchPeople(query);
  }

  public async saveUser(input: IAppUserInput): Promise<IAppUser> {
    const email = normalizeEmail(input.email);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Enter a valid email address.');
    }

    const users = await this.getUsers();
    const duplicate = users.filter(user => user.email === email && user.id !== input.id)[0];

    if (duplicate) {
      throw new Error(`An app user already exists for ${email}.`);
    }

    const isSalesperson = input.isSalesperson === true;
    const salespersonCode = normalizeSalespersonCode(input.salespersonCode);

    if (isSalesperson && !salespersonCode) {
      throw new Error('Salesperson Code is required when Is Salesperson is selected.');
    }

    const ensuredUser = await this.restClient.ensureUser(email);
    const payload = {
      [mefriendFields.appUsers.title]: input.title.trim() || ensuredUser.title,
      [mefriendFields.appUsers.email]: email,
      [mefriendFields.appUsers.role]: input.role.trim(),
      [mefriendFields.appUsers.canAccessApp]: input.canAccessApp,
      [mefriendFields.appUsers.isActive]: input.isActive,
      [mefriendFields.appUsers.isSalesperson]: isSalesperson,
      [mefriendFields.appUsers.salespersonCode]: isSalesperson ? salespersonCode : '',
      [mefriendFields.appUsers.userId]: ensuredUser.id
    };

    if (input.id) {
      await this.restClient.updateItem(mefriendListTitles.appUsers, input.id, payload);
      return {
        id: input.id,
        title: String(payload.Title),
        email,
        role: String(payload.Role),
        canAccessApp: Boolean(payload.CanAccessApp),
        isActive: Boolean(payload.IsActive),
        isSalesperson: Boolean(payload.IsSalesperson),
        salespersonCode: String(payload.SalespersonCode || ''),
        userId: ensuredUser.id,
        userTitle: ensuredUser.title,
        userEmail: ensuredUser.email
      };
    }

    const created = await this.restClient.createItem<typeof payload, IAppUserListItem>(mefriendListTitles.appUsers, payload);
    return this.mapAppUser(created);
  }

  public async setUserActive(id: number, isActive: boolean): Promise<void> {
    await this.restClient.updateItem(mefriendListTitles.appUsers, id, { [mefriendFields.appUsers.isActive]: isActive });
    this.clearCache();
  }

  public async getPermissionsForUser(appUserId: number): Promise<readonly IAppUserPermission[]> {
    const items = await this.restClient.readItems<IAppUserPermissionListItem>(mefriendListTitles.appUserPermissions, {
      select: permissionSelect,
      filter: `AppUserId eq ${appUserId}`,
      orderBy: 'ModuleKey asc'
    });

    return items
      .map(this.mapPermission)
      .filter((permission): permission is IAppUserPermission => !!permission);
  }

  public async savePermissions(appUser: IAppUser, permissions: readonly IAppUserPermission[]): Promise<void> {
    const existingPermissions = await this.getPermissionsForUser(appUser.id);

    for (const permission of permissions) {
      const normalizedPermission = this.applyPermissionRules(permission);
      const existing = existingPermissions.filter(item => item.moduleKey === normalizedPermission.moduleKey)[0];
      const payload = {
        Title: `${appUser.email}-${normalizedPermission.moduleKey}`,
        AppUserId: appUser.id,
        ModuleKey: normalizedPermission.moduleKey,
        CanView: normalizedPermission.canView,
        CanCreate: normalizedPermission.canCreate,
        CanApprove: normalizedPermission.canApprove,
        CanPostToBC: normalizedPermission.canPostToBC,
        CanManage: normalizedPermission.canManage,
        IsActive: normalizedPermission.isActive
      };

      if (existing && existing.id) {
        await this.restClient.updateItem(mefriendListTitles.appUserPermissions, existing.id, payload);
      } else {
        await this.restClient.createItem(mefriendListTitles.appUserPermissions, payload);
      }
    }

    this.clearCache();
  }

  public toPermissionMatrix(appUser: IAppUser, permissions: readonly IAppUserPermission[]): readonly IAppUserPermission[] {
    return mefriendModuleKeys.map(moduleKey => {
      if (isAdministratorRole(appUser.role)) {
        return {
          title: `${appUser.email}-${moduleKey}`,
          appUserId: appUser.id,
          moduleKey,
          canView: true,
          canCreate: true,
          canApprove: true,
          canPostToBC: true,
          canManage: true,
          isActive: true
        };
      }

      const existing = permissions.filter(permission => permission.moduleKey === moduleKey)[0];
      return existing || {
        title: `${appUser.email}-${moduleKey}`,
        appUserId: appUser.id,
        moduleKey,
        canView: false,
        canCreate: false,
        canApprove: false,
        canPostToBC: false,
        canManage: false,
        isActive: true
      };
    });
  }

  private async getActiveUserByEmail(email: string): Promise<IAppUser | undefined> {
    const escapedEmail = this.restClient.escapeODataString(email);
    const items = await this.restClient.readItems<IAppUserListItem>(mefriendListTitles.appUsers, {
      select: appUserSelect,
      expand: ['User'],
      filter: `Email eq '${escapedEmail}'`,
      top: 10
    });

    return items.map(this.mapAppUser).filter(user => user.email === email)[0];
  }

  private applyPermissionRules(permission: IAppUserPermission): IAppUserPermission {
    const canView = permission.canView || permission.canManage;

    return {
      ...permission,
      canView,
      canCreate: canView && permission.canCreate,
      canApprove: canView && permission.canApprove,
      canPostToBC: canView && permission.canPostToBC,
      canManage: canView && permission.canManage
    };
  }

  private getEmptyAccessMap(): Record<string, IModuleAccess> {
    return mefriendModuleKeys.reduce<Record<string, IModuleAccess>>((map, moduleKey) => {
      map[moduleKey] = emptyModuleAccess(moduleKey);
      return map;
    }, {});
  }

  private getFullAccessMap(): Record<string, IModuleAccess> {
    return mefriendModuleKeys.reduce<Record<string, IModuleAccess>>((map, moduleKey) => {
      map[moduleKey] = fullModuleAccess(moduleKey);
      return map;
    }, {});
  }

  private setCache(access: ICurrentAppAccess): ICurrentAppAccess {
    this.cachedAccess = access;
    return access;
  }

  private mapAppUser(item: IAppUserListItem): IAppUser {
    return {
      id: item.Id || item.ID || 0,
      title: item.Title || '',
      email: normalizeEmail(item.Email),
      role: item.Role || '',
      canAccessApp: item.CanAccessApp === true,
      isActive: item.IsActive !== false,
      isSalesperson: item.IsSalesperson === true,
      salespersonCode: normalizeSalespersonCode(item.SalespersonCode),
      userId: item.UserId,
      userTitle: item.User ? item.User.Title : undefined,
      userEmail: item.User ? normalizeEmail(item.User.EMail || item.User.Email) : undefined
    };
  }

  private mapPermission(item: IAppUserPermissionListItem): IAppUserPermission | undefined {
    const moduleKey = item.ModuleKey as MefriendModuleKey;

    if (mefriendModuleKeys.indexOf(moduleKey) === -1 || !item.AppUserId) {
      return undefined;
    }

    return {
      id: item.Id || item.ID,
      title: item.Title || '',
      appUserId: item.AppUserId,
      moduleKey,
      canView: item.CanView === true,
      canCreate: item.CanCreate === true,
      canApprove: item.CanApprove === true,
      canPostToBC: item.CanPostToBC === true,
      canManage: item.CanManage === true,
      isActive: item.IsActive !== false
    };
  }
}
