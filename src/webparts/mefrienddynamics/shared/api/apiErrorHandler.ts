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

const getNestedRecord = (value: Record<string, unknown>, key: string): Record<string, unknown> | undefined => {
  const nestedValue = value[key];
  return isRecord(nestedValue) ? nestedValue : undefined;
};

const extractBalancedJsonObject = (value: string, startIndex: number): string | undefined => {
  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let index = startIndex; index < value.length; index++) {
    const character = value[index];

    if (escaping) {
      escaping = false;
      continue;
    }

    if (character === '\\') {
      escaping = true;
      continue;
    }

    if (character === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (character === '{') {
      depth++;
    }

    if (character === '}') {
      depth--;
      if (depth === 0) {
        return value.substring(startIndex, index + 1);
      }
    }
  }

  return undefined;
};

const tryParseEmbeddedJson = (value: string): unknown => {
  const responseIndex = value.indexOf('Response:');
  const searchStart = responseIndex === -1 ? 0 : responseIndex + 'Response:'.length;
  const jsonStart = value.indexOf('{', searchStart);

  if (jsonStart === -1) {
    return undefined;
  }

  const jsonText = extractBalancedJsonObject(value, jsonStart);
  if (!jsonText) {
    return undefined;
  }

  const parsedJson = tryParseJson(jsonText);
  if (parsedJson !== jsonText) {
    return parsedJson;
  }

  const unescapedJsonText = jsonText.replace(/\\"/g, '"');
  const parsedUnescapedJson = tryParseJson(unescapedJsonText);
  return parsedUnescapedJson !== unescapedJsonText ? parsedUnescapedJson : undefined;
};

const getResponseErrorMessage = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const parsedValue = tryParseJson(value);
    if (parsedValue !== value) {
      return getResponseErrorMessage(parsedValue);
    }

    const embeddedJson = tryParseEmbeddedJson(value);
    return embeddedJson === undefined ? undefined : getResponseErrorMessage(embeddedJson);
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const errorRecord = getNestedRecord(value, 'error');
  if (errorRecord) {
    const nestedMessage = asString(errorRecord.message);
    if (nestedMessage) {
      return nestedMessage;
    }

    const nestedErrorMessage = getResponseErrorMessage(errorRecord);
    if (nestedErrorMessage) {
      return nestedErrorMessage;
    }
  }

  const responseRecord = getNestedRecord(value, 'response') || getNestedRecord(value, 'Response');
  if (responseRecord) {
    const responseMessage = getResponseErrorMessage(responseRecord);
    if (responseMessage) {
      return responseMessage;
    }
  }

  const detailsRecord = getNestedRecord(value, 'details');
  if (detailsRecord) {
    const detailsMessage = getResponseErrorMessage(detailsRecord);
    if (detailsMessage) {
      return detailsMessage;
    }
  }

  const message = asString(value.message);
  if (message) {
    return getResponseErrorMessage(tryParseEmbeddedJson(message));
  }

  return undefined;
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
  const message = getResponseErrorMessage(parsedBody) || asString(parsedBody.message) || baseError.message;
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
    const message = getResponseErrorMessage(error.details) || getResponseErrorMessage(error) || asString(error.message);

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
  const responseErrorMessage = getResponseErrorMessage(normalizedError.details) || getResponseErrorMessage(normalizedError.message);

  if (normalizedError.errors && normalizedError.errors.length > 0) {
    return normalizedError.errors.join(' ');
  }

  if (responseErrorMessage) {
    return responseErrorMessage;
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
