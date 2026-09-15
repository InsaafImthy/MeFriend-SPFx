import type { PageContext } from '@microsoft/sp-page-context';
import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { escapeODataString } from '../../utilities/odataUtils';

export interface ISharePointRestClientOptions {
  pageContext?: PageContext;
  spHttpClient?: SPHttpClient;
  webAbsoluteUrl?: string;
}

export interface IListReadOptions {
  select?: readonly string[];
  expand?: readonly string[];
  filter?: string;
  orderBy?: string;
  top?: number;
}

interface ISharePointItemsResponse<T> {
  value?: T[];
  '@odata.nextLink'?: string;
}

interface IEnsureUserResponse {
  Id?: number;
  Title?: string;
  Email?: string;
}

interface IChoiceFieldResponse {
  Choices?: readonly string[];
}

interface IPeoplePickerResponse {
  value?: string | IPeoplePickerEntity[];
}

interface IPeoplePickerEntity {
  Key?: string;
  DisplayText?: string;
  Description?: string;
  EntityData?: {
    Email?: string;
    SPUserID?: string;
  };
}

export interface ISharePointPeoplePickerUser {
  key: string;
  displayName: string;
  email: string;
  userId?: number;
}

export class SharePointRestError extends Error {
  public readonly status?: number;
  public readonly operation: string;
  public readonly listTitle?: string;

  public constructor(message: string, operation: string, listTitle?: string, status?: number) {
    super(message);
    this.name = 'SharePointRestError';
    this.operation = operation;
    this.listTitle = listTitle;
    this.status = status;
  }
}

export class SharePointRestClient {
  private readonly pageContext?: PageContext;
  private readonly spHttpClient?: SPHttpClient;
  private readonly webAbsoluteUrl?: string;

  public constructor(options: ISharePointRestClientOptions) {
    this.pageContext = options.pageContext;
    this.spHttpClient = options.spHttpClient;
    this.webAbsoluteUrl = options.webAbsoluteUrl;
  }

  public async readItems<T>(listTitle: string, options: IListReadOptions = {}): Promise<readonly T[]> {
    const items: T[] = [];
    let endpoint: string | undefined = `${this.getListItemsEndpoint(listTitle)}${this.buildQuery(options)}`;

    while (endpoint) {
      const response = await this.get(endpoint, 'read items', listTitle);
      const payload = (await response.json()) as ISharePointItemsResponse<T>;
      items.push(...(payload.value || []));
      endpoint = payload['@odata.nextLink'];
    }

    return items;
  }

  public async createItem<TPayload extends Record<string, unknown>, TResult = unknown>(listTitle: string, payload: TPayload): Promise<TResult> {
    const response = await this.post(this.getListItemsEndpoint(listTitle), payload, 'create item', listTitle);
    return response.json() as Promise<TResult>;
  }

  public async updateItem<TPayload extends Record<string, unknown>>(listTitle: string, id: number, payload: TPayload): Promise<void> {
    await this.post(`${this.getListItemsEndpoint(listTitle)}(${id})`, payload, 'update item', listTitle, {
      'IF-MATCH': '*',
      'X-HTTP-Method': 'MERGE'
    });
  }

  public async deleteItem(listTitle: string, id: number): Promise<void> {
    await this.post(`${this.getListItemsEndpoint(listTitle)}(${id})`, undefined, 'delete item', listTitle, {
      'IF-MATCH': '*',
      'X-HTTP-Method': 'DELETE'
    });
  }

  public async ensureUser(email: string): Promise<{ id: number; title: string; email: string }> {
    this.ensureContext();
    const response = await this.post(
      `${this.getWebAbsoluteUrl()}/_api/web/ensureuser`,
      { logonName: email },
      'ensure user'
    );
    const payload = (await response.json()) as IEnsureUserResponse;
    const id = payload.Id || 0;

    if (!id) {
      throw new SharePointRestError(`Unable to resolve SharePoint user ${email}.`, 'ensure user');
    }

    return {
      id,
      title: payload.Title || email,
      email: (payload.Email || email).toLowerCase()
    };
  }

  public async getChoiceFieldValues(listTitle: string, fieldInternalName: string): Promise<readonly string[]> {
    const endpoint = `${this.getWebAbsoluteUrl()}/_api/web/lists/getbytitle('${escapeODataString(listTitle)}')/fields/getbyinternalnameortitle('${escapeODataString(fieldInternalName)}')?$select=Choices`;
    const response = await this.get(endpoint, 'read choice field', listTitle);
    const payload = (await response.json()) as IChoiceFieldResponse;
    return (payload.Choices || []).filter(choice => !!choice);
  }

  public async searchPeople(query: string, maxResults: number = 20): Promise<readonly ISharePointPeoplePickerUser[]> {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return [];
    }

    const response = await this.post(
      `${this.getWebAbsoluteUrl()}/_api/SP.UI.ApplicationPages.ClientPeoplePickerWebServiceInterface.clientPeoplePickerSearchUser`,
      {
        queryParams: {
          AllowEmailAddresses: true,
          AllowMultipleEntities: false,
          AllUrlZones: false,
          MaximumEntitySuggestions: maxResults,
          PrincipalSource: 15,
          PrincipalType: 1,
          QueryString: trimmedQuery
        }
      },
      'search people'
    );
    const payload = (await response.json()) as IPeoplePickerResponse;
    let rawEntities: IPeoplePickerEntity[] = [];

    if (typeof payload.value === 'string' && payload.value) {
      rawEntities = JSON.parse(payload.value) as IPeoplePickerEntity[];
    } else if (Array.isArray(payload.value)) {
      rawEntities = payload.value;
    }

    return rawEntities
      .map(entity => {
        const email = (entity.EntityData && entity.EntityData.Email ? entity.EntityData.Email : entity.Description || '').trim().toLowerCase();
        const displayName = entity.DisplayText || email;
        const userIdText = entity.EntityData ? entity.EntityData.SPUserID : undefined;
        const userId = userIdText ? Number(userIdText) : undefined;

        return {
          key: entity.Key || email,
          displayName,
          email,
          userId: userId && !isNaN(userId) ? userId : undefined
        };
      })
      .filter(user => !!user.email && !!user.displayName);
  }

  public escapeODataString(value: string): string {
    return escapeODataString(value);
  }

  private async get(endpoint: string, operation: string, listTitle?: string): Promise<SPHttpClientResponse> {
    this.ensureContext();
    const response = await this.spHttpClient!.get(endpoint, SPHttpClient.configurations.v1, {
      headers: {
        Accept: 'application/json;odata=nometadata'
      }
    });
    await this.throwIfFailed(response, operation, listTitle);
    return response;
  }

  private async post<TPayload extends Record<string, unknown>>(
    endpoint: string,
    payload: TPayload | undefined,
    operation: string,
    listTitle?: string,
    extraHeaders: Record<string, string> = {}
  ): Promise<SPHttpClientResponse> {
    this.ensureContext();
    const response = await this.spHttpClient!.post(endpoint, SPHttpClient.configurations.v1, {
      headers: {
        Accept: 'application/json;odata=nometadata',
        'Content-Type': 'application/json;odata=nometadata',
        ...extraHeaders
      },
      body: payload ? JSON.stringify(payload) : undefined
    });
    await this.throwIfFailed(response, operation, listTitle);
    return response;
  }

  private async throwIfFailed(response: SPHttpClientResponse, operation: string, listTitle?: string): Promise<void> {
    if (response.ok) {
      return;
    }

    let message = `SharePoint ${operation} failed${listTitle ? ` for ${listTitle}` : ''}.`;

    try {
      const payload = await response.json();
      const errorMessage = payload && payload.error && payload.error.message ? payload.error.message : undefined;
      if (typeof errorMessage === 'string') {
        message = errorMessage;
      }
    } catch {
      const text = await response.text();
      if (text) {
        message = text;
      }
    }

    throw new SharePointRestError(message, operation, listTitle, response.status);
  }

  private buildQuery(options: IListReadOptions): string {
    const query: string[] = [];

    if (options.select && options.select.length) {
      query.push(`$select=${options.select.join(',')}`);
    }

    if (options.expand && options.expand.length) {
      query.push(`$expand=${options.expand.join(',')}`);
    }

    if (options.filter) {
      query.push(`$filter=${options.filter}`);
    }

    if (options.orderBy) {
      query.push(`$orderby=${options.orderBy}`);
    }

    query.push(`$top=${options.top || 5000}`);
    return query.length ? `?${query.join('&')}` : '';
  }

  private getListItemsEndpoint(listTitle: string): string {
    return `${this.getWebAbsoluteUrl()}/_api/web/lists/getbytitle('${escapeODataString(listTitle)}')/items`;
  }

  private getWebAbsoluteUrl(): string {
    this.ensureContext();
    return (this.webAbsoluteUrl || this.pageContext!.web.absoluteUrl).replace(/\/$/, '');
  }

  private ensureContext(): void {
    if (!this.pageContext || !this.spHttpClient) {
      throw new SharePointRestError('SharePoint context is not configured.', 'initialize');
    }
  }
}
