export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type QueryParamValue = string | number | boolean | undefined;

export type QueryParams = Readonly<Record<string, QueryParamValue | readonly QueryParamValue[]>>;

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: readonly string[];
  correlationId?: string;
}

export interface ApiError {
  status?: number;
  statusText?: string;
  message: string;
  errors?: readonly string[];
  correlationId?: string;
  details?: unknown;
}

export interface RequestOptions {
  headers?: Readonly<Record<string, string>>;
  queryParams?: QueryParams;
}

export interface ApiClientRequestOptions extends RequestOptions {
  method: HttpMethod;
  body?: string;
}

export interface ApiHttpResponse {
  ok: boolean;
  status: number;
  statusText: string;
  text: () => Promise<string>;
}
