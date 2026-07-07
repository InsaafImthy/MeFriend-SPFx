export interface IApiResponse<TData> {
  success: boolean;
  data?: TData;
  message?: string;
  errors?: readonly string[];
  correlationId?: string;
}
