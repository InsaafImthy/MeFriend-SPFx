import type { PageContext } from '@microsoft/sp-page-context';
import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { permissionConfig } from '../../config/permissionConfig';
import type {
  IEditablePermissionSetting,
  IPermissionConfig,
  IPermissionResult,
  IPermissionRule,
  ISharePointPermissionSetting,
  IUserPermissionContext,
  PermissionKey
} from '../../models/common/IPermissionModels';

interface ICurrentUserGroupResponse {
  value?: readonly {
    Title?: string;
  }[];
}

interface IPermissionSettingsResponse {
  value?: readonly ISharePointPermissionSettingListItem[];
}

interface ISharePointPermissionSettingListItem {
  Id?: number;
  ID?: number;
  PermissionKey?: string;
  Title?: string;
  Enabled?: boolean;
  IsEnabled?: boolean;
  SharePointGroups?: string;
  AllowedSharePointGroups?: string;
}

export interface IPermissionServiceOptions {
  pageContext?: PageContext;
  spHttpClient?: SPHttpClient;
  webAbsoluteUrl?: string;
  config?: IPermissionConfig;
}

export class PermissionService {
  private readonly pageContext?: PageContext;
  private readonly spHttpClient?: SPHttpClient;
  private readonly webAbsoluteUrl?: string;
  private readonly config: IPermissionConfig;

  public constructor(options: IPermissionServiceOptions) {
    this.pageContext = options.pageContext;
    this.spHttpClient = options.spHttpClient;
    this.webAbsoluteUrl = options.webAbsoluteUrl;
    this.config = options.config || permissionConfig;
  }

  public async getUserContext(): Promise<IUserPermissionContext> {
    const user = this.pageContext ? this.pageContext.user : undefined;
    const sharePointGroupNames = await this.getCurrentUserSharePointGroups();

    return {
      displayName: user ? user.displayName : '',
      email: user ? user.email : undefined,
      loginName: user ? user.loginName : undefined,
      sharePointGroupNames
    };
  }

  public async getPermissions(): Promise<readonly IPermissionResult[]> {
    const userContext = await this.getUserContext();
    const sharePointSettings = await this.getSharePointPermissionSettings();

    return this.config.rules.map(rule => this.resolveRule(rule, userContext, sharePointSettings));
  }

  public async getEditablePermissionSettings(): Promise<readonly IEditablePermissionSetting[]> {
    const sharePointSettings = await this.getSharePointPermissionSettings();

    return this.config.rules.map(rule => {
      const sharePointRule = sharePointSettings.filter(setting => setting.permissionKey === rule.key)[0];
      const activeSetting = sharePointRule || rule;

      return {
        id: sharePointRule ? sharePointRule.id : undefined,
        permissionKey: rule.key,
        moduleKey: rule.moduleKey,
        action: rule.action,
        enabled: activeSetting.enabled,
        title: rule.title || rule.key,
        description: rule.description || '',
        allowedSharePointGroupNames: activeSetting.allowedSharePointGroupNames || [],
        source: sharePointRule ? 'sharePointList' : 'configuration'
      };
    });
  }

  public async savePermissionSetting(setting: ISharePointPermissionSetting): Promise<void> {
    if (!this.pageContext || !this.spHttpClient || !this.config.settingsListTitle) {
      throw new Error('SharePoint permission settings list is not configured.');
    }

    const existingSetting = await this.getSharePointPermissionSetting(setting.permissionKey);
    const payload = {
      Title: setting.permissionKey,
      PermissionKey: setting.permissionKey,
      Enabled: setting.enabled,
      AllowedSharePointGroups: setting.allowedSharePointGroupNames.join('; ')
    };

    if (existingSetting && existingSetting.id) {
      const endpoint = `${this.getSettingsListItemsEndpoint()}(${existingSetting.id})`;
      const response = await this.spHttpClient.post(endpoint, SPHttpClient.configurations.v1, {
        headers: {
          Accept: 'application/json;odata=nometadata',
          'Content-Type': 'application/json;odata=nometadata',
          'IF-MATCH': '*',
          'X-HTTP-Method': 'MERGE'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Unable to update permission setting.');
      }

      return;
    }

    const response = await this.spHttpClient.post(this.getSettingsListItemsEndpoint(), SPHttpClient.configurations.v1, {
      headers: {
        Accept: 'application/json;odata=nometadata',
        'Content-Type': 'application/json;odata=nometadata'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('Unable to create permission setting.');
    }
  }

  public async deletePermissionSetting(permissionKey: PermissionKey): Promise<void> {
    if (!this.pageContext || !this.spHttpClient || !this.config.settingsListTitle) {
      throw new Error('SharePoint permission settings list is not configured.');
    }

    const existingSetting = await this.getSharePointPermissionSetting(permissionKey);

    if (!existingSetting || !existingSetting.id) {
      return;
    }

    const endpoint = `${this.getSettingsListItemsEndpoint()}(${existingSetting.id})`;
    const response = await this.spHttpClient.post(endpoint, SPHttpClient.configurations.v1, {
      headers: {
        Accept: 'application/json;odata=nometadata',
        'IF-MATCH': '*',
        'X-HTTP-Method': 'DELETE'
      }
    });

    if (!response.ok) {
      throw new Error('Unable to remove permission setting.');
    }
  }

  private resolveRule(
    rule: IPermissionRule,
    userContext: IUserPermissionContext,
    sharePointSettings: readonly ISharePointPermissionSetting[]
  ): IPermissionResult {
    const sharePointRule = sharePointSettings.filter(setting => setting.permissionKey === rule.key)[0];
    const enabled = sharePointRule ? sharePointRule.enabled : rule.enabled;
    const allowedSharePointGroupNames = sharePointRule
      ? sharePointRule.allowedSharePointGroupNames
      : rule.allowedSharePointGroupNames || [];

    if (!enabled) {
      return {
        key: rule.key,
        moduleKey: rule.moduleKey,
        action: rule.action,
        allowed: false,
        source: 'disabled'
      };
    }

    if (!allowedSharePointGroupNames.length) {
      return {
        key: rule.key,
        moduleKey: rule.moduleKey,
        action: rule.action,
        allowed: true,
        source: sharePointRule ? 'sharePointList' : 'configuration'
      };
    }

    return {
      key: rule.key,
      moduleKey: rule.moduleKey,
      action: rule.action,
      allowed: this.isUserInAnyGroup(userContext.sharePointGroupNames, allowedSharePointGroupNames),
      source: 'sharePointGroup'
    };
  }

  private async getCurrentUserSharePointGroups(): Promise<readonly string[]> {
    if (!this.pageContext || !this.spHttpClient) {
      return [];
    }

    try {
      const endpoint = `${this.getWebAbsoluteUrl()}/_api/web/currentuser/groups?$select=Title`;
      const response = await this.spHttpClient.get(endpoint, SPHttpClient.configurations.v1);

      if (!response.ok) {
        return [];
      }

      const payload = (await response.json()) as ICurrentUserGroupResponse;
      return (payload.value || [])
        .map(group => group.Title || '')
        .filter(groupName => !!groupName);
    } catch {
      return [];
    }
  }

  private async getSharePointPermissionSettings(): Promise<readonly ISharePointPermissionSetting[]> {
    if (!this.pageContext || !this.spHttpClient || !this.config.settingsListTitle) {
      return [];
    }

    try {
      const endpoint =
        `${this.getSettingsListItemsEndpoint()}` +
        '?$select=Id,ID,Title,PermissionKey,Enabled,IsEnabled,SharePointGroups,AllowedSharePointGroups';
      const response = await this.spHttpClient.get(endpoint, SPHttpClient.configurations.v1);

      if (!response.ok) {
        return [];
      }

      return this.mapSharePointSettings(response);
    } catch {
      return [];
    }
  }

  private async getSharePointPermissionSetting(permissionKey: PermissionKey): Promise<ISharePointPermissionSetting | undefined> {
    const settings = await this.getSharePointPermissionSettings();
    return settings.filter(setting => setting.permissionKey === permissionKey)[0];
  }

  private async mapSharePointSettings(response: SPHttpClientResponse): Promise<readonly ISharePointPermissionSetting[]> {
    const payload = (await response.json()) as IPermissionSettingsResponse;

    return (payload.value || [])
      .map(item => {
        const permissionKey = (item.PermissionKey || item.Title || '') as PermissionKey;

        return {
          id: item.Id || item.ID,
          permissionKey,
          enabled: item.Enabled !== undefined ? item.Enabled : item.IsEnabled !== false,
          allowedSharePointGroupNames: this.splitGroupNames(item.AllowedSharePointGroups || item.SharePointGroups || '')
        };
      })
      .filter(setting => !!setting.permissionKey);
  }

  private getSettingsListItemsEndpoint(): string {
    if (!this.pageContext || !this.config.settingsListTitle) {
      return '';
    }

    const escapedListTitle = this.config.settingsListTitle.replace(/'/g, "''");
    return `${this.getWebAbsoluteUrl()}/_api/web/lists/getbytitle('${escapedListTitle}')/items`;
  }

  private getWebAbsoluteUrl(): string {
    if (!this.pageContext) {
      return '';
    }

    return (this.webAbsoluteUrl || this.pageContext.web.absoluteUrl).replace(/\/$/, '');
  }

  private splitGroupNames(value: string): readonly string[] {
    return value
      .split(';')
      .map(groupName => groupName.trim())
      .filter(groupName => !!groupName);
  }

  private isUserInAnyGroup(userGroupNames: readonly string[], allowedGroupNames: readonly string[]): boolean {
    const normalizedUserGroupNames = userGroupNames.map(groupName => groupName.toLowerCase());

    return allowedGroupNames.some(groupName => normalizedUserGroupNames.indexOf(groupName.toLowerCase()) !== -1);
  }
}
