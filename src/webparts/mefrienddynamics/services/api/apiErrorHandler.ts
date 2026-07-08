import type { ApiError, ApiHttpResponse, ApiResponse } from './apiTypes';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const asStringArray = (value: unknown): readonly string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const values = value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  return values.length > 0 ? values : undefined;
};

const tryParseJson = (value: string): unknown => {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export const parseApiError = async (response: ApiHttpResponse): Promise<ApiError> => {
  const responseText = await response.text();
  const parsedBody = tryParseJson(responseText);
  const baseError: ApiError = {
    status: response.status,
    statusText: response.statusText,
    message: response.statusText || 'Request failed'
  };

  if (!isRecord(parsedBody)) {
    return {
      ...baseError,
      message: asString(parsedBody) || baseError.message,
      details: parsedBody
    };
  }

  const apiResponse = parsedBody as Partial<ApiResponse<unknown>>;
  const message = asString(parsedBody.message) || baseError.message;
  const errors = asStringArray(parsedBody.errors);
  const correlationId = asString(parsedBody.correlationId);

  return {
    ...baseError,
    message,
    errors: errors || apiResponse.errors,
    correlationId: correlationId || apiResponse.correlationId,
    details: parsedBody
  };
};

export const normalizeError = (error: unknown): ApiError => {
  if (isRecord(error)) {
    const message = asString(error.message);

    return {
      status: typeof error.status === 'number' ? error.status : undefined,
      statusText: asString(error.statusText),
      message: message || 'An unexpected error occurred.',
      errors: asStringArray(error.errors),
      correlationId: asString(error.correlationId),
      details: error.details || error
    };
  }

  if (typeof error === 'string') {
    return {
      message: error
    };
  }

  return {
    message: 'An unexpected error occurred.',
    details: error
  };
};

export const getUserFriendlyError = (error: unknown): string => {
  const normalizedError = normalizeError(error);
  const message = normalizedError.message.toLowerCase();

  if (normalizedError.errors && normalizedError.errors.length > 0) {
    return normalizedError.errors.join(' ');
  }

  if (normalizedError.status === 401 || normalizedError.status === 403) {
    return 'Access denied. You are not authorized to perform this action.';
  }

  if (normalizedError.status === 400 || normalizedError.status === 422) {
    return normalizedError.message || 'Validation failed. Please review the highlighted fields.';
  }

  if (normalizedError.status === 404) {
    return 'The requested record was not found.';
  }

  if (normalizedError.status === 405 || normalizedError.status === 501) {
    return 'This API contract is not configured yet.';
  }

  if (
    normalizedError.status === 0 ||
    message.indexOf('failed to fetch') !== -1 ||
    message.indexOf('network') !== -1
  ) {
    return 'Network failure. Please check your connection and try again.';
  }

  if (normalizedError.status && normalizedError.status >= 500) {
    return 'The service is currently unavailable. Please try again later.';
  }

  return normalizedError.message;
};
