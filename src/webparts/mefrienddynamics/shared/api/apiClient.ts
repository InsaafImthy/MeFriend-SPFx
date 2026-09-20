import { normalizeError, parseApiError } from './apiErrorHandler';
import { AuthClient } from './authClient';
import type {
  ApiHttpResponse,
  ApiResponse,
  HttpMethod,
  QueryParams,
  QueryParamValue,
  RequestOptions
} from './apiTypes';

export type RequestHeaderProvider = () => Readonly<Record<string, string>> | undefined;

export interface IApiClientOptions {
  baseUrl?: string;
  headerProvider?: RequestHeaderProvider;
}

export class ApiClient {
  private readonly authClient: AuthClient;
  private readonly baseUrl: string;
  private readonly headerProvider?: RequestHeaderProvider;

  public constructor(authClient: AuthClient, options?: string | IApiClientOptions) {
    this.authClient = authClient;
    this.baseUrl = (typeof options === 'string' ? options : options?.baseUrl) || authClient.getBaseUrl();
    this.headerProvider = typeof options === 'string' ? undefined : options?.headerProvider;
  }

  public get<TResponse>(url: string, queryParams?: QueryParams): Promise<ApiResponse<TResponse>> {
    return this.request<undefined, TResponse>('GET', url, undefined, { queryParams });
  }

  public post<TRequest, TResponse>(url: string, body?: TRequest): Promise<ApiResponse<TResponse>> {
    return this.request<TRequest, TResponse>('POST', url, body);
  }

  public put<TRequest, TResponse>(url: string, body?: TRequest): Promise<ApiResponse<TResponse>> {
    return this.request<TRequest, TResponse>('PUT', url, body);
  }

  public patch<TRequest, TResponse>(url: string, body?: TRequest): Promise<ApiResponse<TResponse>> {
    return this.request<TRequest, TResponse>('PATCH', url, body);
  }

  public delete<TResponse>(url: string): Promise<ApiResponse<TResponse>> {
    return this.request<undefined, TResponse>('DELETE', url);
  }

  public buildQueryString(queryParams?: QueryParams): string {
    if (!queryParams) {
      return '';
    }

    const searchParts: string[] = [];

    Object.keys(queryParams).forEach(key => {
      const value = queryParams[key];

      if (this.isQueryParamArray(value)) {
        value.forEach(item => this.appendQueryValue(searchParts, key, item));
        return;
      }

      this.appendQueryValue(searchParts, key, value);
    });

    return searchParts.length > 0 ? `?${searchParts.join('&')}` : '';
  }

  public async handleResponse<TResponse>(response: ApiHttpResponse): Promise<ApiResponse<TResponse>> {
    if (!response.ok) {
      throw await parseApiError(response);
    }

    if (response.status === 204) {
      return {
        success: true
      };
    }

    const responseText = await response.text();

    if (!responseText) {
      return {
        success: true
      };
    }

    const parsedBody = JSON.parse(responseText) as ApiResponse<TResponse> | TResponse;

    if (this.isApiResponse<TResponse>(parsedBody)) {
      return parsedBody;
    }

    return {
      success: true,
      data: parsedBody as TResponse
    };
  }

  public handleError(error: unknown): never {
    throw normalizeError(error);
  }

  private async request<TRequest, TResponse>(
    method: HttpMethod,
    url: string,
    body?: TRequest,
    options: RequestOptions = {}
  ): Promise<ApiResponse<TResponse>> {
    try {
      const requestUrl = this.buildUrl(url, options.queryParams);
      const contextualHeaders = this.headerProvider?.();
      const response = await this.authClient.request(requestUrl, {
        method,
        headers: {
          ...contextualHeaders,
          ...options.headers
        },
        body: body === undefined ? undefined : JSON.stringify(body)
      });

      return await this.handleResponse<TResponse>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  private buildUrl(url: string, queryParams?: QueryParams): string {
    const trimmedBaseUrl = this.baseUrl.replace(/\/+$/, '');
    const trimmedUrl = url.replace(/^\/+/, '');
    const absoluteUrl = /^https?:\/\//i.test(url);
    const path = absoluteUrl || !trimmedBaseUrl ? url : `${trimmedBaseUrl}/${trimmedUrl}`;

    return `${path}${this.buildQueryString(queryParams)}`;
  }

  private appendQueryValue(searchParts: string[], key: string, value: QueryParamValue): void {
    if (value === undefined) {
      return;
    }

    searchParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }

  private isApiResponse<TResponse>(value: unknown): value is ApiResponse<TResponse> {
    return typeof value === 'object' && value !== null && 'success' in value;
  }

  private isQueryParamArray(value: QueryParamValue | readonly QueryParamValue[]): value is readonly QueryParamValue[] {
    return Array.isArray(value);
  }
}
