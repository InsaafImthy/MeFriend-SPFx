import {
  AadHttpClient,
  AadHttpClientFactory,
  HttpClient,
  type HttpClientResponse,
  type IHttpClientOptions
} from '@microsoft/sp-http';
import { appConfig } from '../../config/appConfig';
import type { ApiClientRequestOptions } from './apiTypes';

export interface IAuthClientSettings {
  baseUrl?: string;
  useAadHttpClient?: boolean;
  aadResourceUrl?: string;
}

export interface IAuthClientDependencies {
  aadHttpClientFactory?: AadHttpClientFactory;
  httpClient?: HttpClient;
  settings?: IAuthClientSettings;
}

export class AuthClient {
  private readonly aadHttpClientFactory?: AadHttpClientFactory;
  private readonly httpClient?: HttpClient;
  private readonly settings: IAuthClientSettings;
  private aadClient?: AadHttpClient;

  public constructor(dependencies: IAuthClientDependencies = {}) {
    this.aadHttpClientFactory = dependencies.aadHttpClientFactory;
    this.httpClient = dependencies.httpClient;
    this.settings = {
      baseUrl: appConfig.backendApi.baseUrl || appConfig.backendApiBaseUrl,
      useAadHttpClient: appConfig.backendApi.useAadHttpClient,
      aadResourceUrl: appConfig.backendApi.aadResourceUrl,
      ...dependencies.settings
    };
  }

  public getBaseUrl(): string {
    return this.settings.baseUrl || '';
  }

  public async request(url: string, options: ApiClientRequestOptions): Promise<HttpClientResponse> {
    const httpOptions = this.toHttpClientOptions(options);

    if (this.settings.useAadHttpClient) {
      const aadClient = await this.getAadClient();
      return aadClient.fetch(url, AadHttpClient.configurations.v1, httpOptions);
    }

    if (!this.httpClient) {
      throw new Error('HttpClient is not configured for local backend API calls.');
    }

    if (options.method === 'GET') {
      return this.httpClient.get(url, HttpClient.configurations.v1, httpOptions);
    }

    if (options.method === 'POST') {
      return this.httpClient.post(url, HttpClient.configurations.v1, httpOptions);
    }

    return this.httpClient.fetch(url, HttpClient.configurations.v1, httpOptions);
  }

  private async getAadClient(): Promise<AadHttpClient> {
    if (this.aadClient) {
      return this.aadClient;
    }

    if (!this.aadHttpClientFactory) {
      throw new Error('AadHttpClientFactory is not configured for secured backend API calls.');
    }

    if (!this.settings.aadResourceUrl) {
      throw new Error('Backend API AAD resource URL is not configured.');
    }

    this.aadClient = await this.aadHttpClientFactory.getClient(this.settings.aadResourceUrl);
    return this.aadClient;
  }

  private toHttpClientOptions(options: ApiClientRequestOptions): IHttpClientOptions {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...options.headers
    };

    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    return {
      method: options.method,
      headers,
      body: options.body
    };
  }
}
