import type { PageContext } from '@microsoft/sp-page-context';
import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import type { IMasterCodeInput, IMasterCodeItem, MasterDataListKey } from '../../models/settings/IMasterDataModels';

interface IMasterDataListConfig {
  listTitle: string;
  label: string;
  codeFieldInternalName: string;
  nameFieldInternalName: string;
}

interface ISharePointMasterCodeItem {
  Id?: number;
  ID?: number;
  Title?: string;
  Code?: string;
  Description?: string;
  Name?: string;
}

interface ISharePointMasterCodeResponse {
  value?: readonly ISharePointMasterCodeItem[];
}

export interface IMasterDataServiceOptions {
  pageContext?: PageContext;
  spHttpClient?: SPHttpClient;
  webAbsoluteUrl?: string;
}

const listConfigs: Readonly<Record<MasterDataListKey, IMasterDataListConfig>> = {
  stateCodes: {
    listTitle: 'StateCode',
    label: 'State Code',
    codeFieldInternalName: 'Title',
    nameFieldInternalName: 'Description'
  },
  countryCodes: {
    listTitle: 'CountryCode',
    label: 'Country Code',
    codeFieldInternalName: 'Title',
    nameFieldInternalName: 'Name'
  }
};

export class MasterDataService {
  private readonly pageContext?: PageContext;
  private readonly spHttpClient?: SPHttpClient;
  private readonly webAbsoluteUrl?: string;

  public constructor(options: IMasterDataServiceOptions) {
    this.pageContext = options.pageContext;
    this.spHttpClient = options.spHttpClient;
    this.webAbsoluteUrl = options.webAbsoluteUrl;
  }

  public async getCodes(listKey: MasterDataListKey): Promise<readonly IMasterCodeItem[]> {
    this.ensureSharePointContext();

    const config = listConfigs[listKey];
    const endpoint =
      `${this.getListItemsEndpoint(config.listTitle)}` +
      `?$select=${this.getSelectFields(config).join(',')}` +
      `&$orderby=${config.codeFieldInternalName} asc`;
    const response = await this.spHttpClient!.get(endpoint, SPHttpClient.configurations.v1);

    if (!response.ok) {
      throw new Error(`Unable to load ${config.label} list.`);
    }

    return this.mapCodes(response, config);
  }

  public async saveCode(listKey: MasterDataListKey, item: IMasterCodeInput, id?: number): Promise<void> {
    this.ensureSharePointContext();

    const config = listConfigs[listKey];
    const normalizedCode = item.code.trim().toUpperCase();
    const normalizedName = item.name.trim();

    if (!normalizedCode || !normalizedName) {
      throw new Error(`${config.label} code and name are required.`);
    }

    const existingItem = await this.getCodeByValue(listKey, normalizedCode);

    if (existingItem && existingItem.id && existingItem.id !== id) {
      throw new Error(`${config.label} ${normalizedCode} already exists.`);
    }

    const payload: Record<string, string> = {
      Title: normalizedCode,
      [config.nameFieldInternalName]: normalizedName
    };

    if (config.codeFieldInternalName !== 'Title') {
      payload[config.codeFieldInternalName] = normalizedCode;
    }

    if (id) {
      const response = await this.spHttpClient!.post(`${this.getListItemsEndpoint(config.listTitle)}(${id})`, SPHttpClient.configurations.v1, {
        headers: {
          Accept: 'application/json;odata=nometadata',
          'Content-Type': 'application/json;odata=nometadata',
          'IF-MATCH': '*',
          'X-HTTP-Method': 'MERGE'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Unable to update ${config.label}.`);
      }

      return;
    }

    const response = await this.spHttpClient!.post(this.getListItemsEndpoint(config.listTitle), SPHttpClient.configurations.v1, {
      headers: {
        Accept: 'application/json;odata=nometadata',
        'Content-Type': 'application/json;odata=nometadata'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Unable to create ${config.label}.`);
    }
  }

  public async deleteCode(listKey: MasterDataListKey, id: number): Promise<void> {
    this.ensureSharePointContext();

    const config = listConfigs[listKey];
    const response = await this.spHttpClient!.post(`${this.getListItemsEndpoint(config.listTitle)}(${id})`, SPHttpClient.configurations.v1, {
      headers: {
        Accept: 'application/json;odata=nometadata',
        'IF-MATCH': '*',
        'X-HTTP-Method': 'DELETE'
      }
    });

    if (!response.ok) {
      throw new Error(`Unable to delete ${config.label}.`);
    }
  }

  public getListLabel(listKey: MasterDataListKey): string {
    return listConfigs[listKey].label;
  }

  private async getCodeByValue(listKey: MasterDataListKey, code: string): Promise<IMasterCodeItem | undefined> {
    const codes = await this.getCodes(listKey);
    return codes.filter(item => item.code.toUpperCase() === code.toUpperCase())[0];
  }

  private async mapCodes(
    response: SPHttpClientResponse,
    config: IMasterDataListConfig
  ): Promise<readonly IMasterCodeItem[]> {
    const payload = (await response.json()) as ISharePointMasterCodeResponse;

    return (payload.value || [])
      .map(item => {
        const nameValue = this.getStringField(item, config.nameFieldInternalName);
        const codeValue = this.getStringField(item, config.codeFieldInternalName);

        return {
          id: item.Id || item.ID,
          code: codeValue || item.Code || item.Title || '',
          name: nameValue || item.Description || item.Name || ''
        };
      })
      .filter(item => !!item.code);
  }

  private getStringField(item: ISharePointMasterCodeItem, fieldName: string): string {
    const value = item[fieldName as keyof ISharePointMasterCodeItem];
    return typeof value === 'string' ? value : '';
  }

  private getSelectFields(config: IMasterDataListConfig): readonly string[] {
    const fields = ['Id', 'ID', 'Title', config.codeFieldInternalName, config.nameFieldInternalName];

    return fields.filter((fieldName, index) => fields.indexOf(fieldName) === index);
  }

  private getListItemsEndpoint(listTitle: string): string {
    this.ensureSharePointContext();

    const escapedListTitle = listTitle.replace(/'/g, "''");
    return `${this.getWebAbsoluteUrl()}/_api/web/lists/getbytitle('${escapedListTitle}')/items`;
  }

  private getWebAbsoluteUrl(): string {
    return (this.webAbsoluteUrl || this.pageContext!.web.absoluteUrl).replace(/\/$/, '');
  }

  private ensureSharePointContext(): void {
    if (!this.pageContext || !this.spHttpClient) {
      throw new Error('SharePoint master data service is not configured.');
    }
  }
}
