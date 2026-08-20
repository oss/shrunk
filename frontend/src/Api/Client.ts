/**
 * Shared browser API client.
 *
 * All API modules use this layer so a non-2xx response is never treated as a
 * successful payload.  It understands both the current core API envelope and
 * older endpoint-specific error shapes while those endpoints are migrated.
 */

export type ApiFieldErrors = Record<string, string>;

interface ApiErrorOptions {
  message: string;
  status?: number;
  code?: string;
  fields?: ApiFieldErrors;
  requestId?: string | null;
  cause?: unknown;
}

export class ApiError extends Error {
  readonly status?: number;

  readonly code?: string;

  readonly fields: ApiFieldErrors;

  readonly requestId?: string | null;

  readonly cause?: unknown;

  constructor({
    message,
    status,
    code,
    fields,
    requestId,
    cause,
  }: ApiErrorOptions) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields ?? {};
    this.requestId = requestId;
    this.cause = cause;
  }
}

const statusMessages: Record<number, string> = {
  400: 'Check the submitted information and try again.',
  401: 'Your session has expired. Please sign in and try again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource could not be found.',
  405: 'This action is not available for this resource.',
  409: 'This request conflicts with existing data.',
  410: 'This resource is no longer available.',
  413: 'The submitted data is too large.',
  415: 'Use a supported content type and try again.',
  422: 'Check the submitted information and try again.',
  429: 'Too many requests were sent. Please try again shortly.',
};

const defaultErrorMessage = 'Something went wrong. Please try again.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringFromValue(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (Array.isArray(value)) {
    const messages = value
      .filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0,
      )
      .map((item) => item.trim());
    return messages.length > 0 ? messages.join(', ') : undefined;
  }
  return undefined;
}

function fieldErrorsFromValue(value: unknown): ApiFieldErrors | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const fields = Object.entries(value).reduce<ApiFieldErrors>(
    (result, [field, fieldError]) => {
      const message = stringFromValue(fieldError);
      if (message) {
        result[field] = message;
      }
      return result;
    },
    {},
  );

  return Object.keys(fields).length > 0 ? fields : undefined;
}

function fallbackMessage(status: number): string {
  if (status >= 500) {
    return 'The server could not complete this request. Please try again.';
  }
  return statusMessages[status] ?? defaultErrorMessage;
}

function parseErrorPayload(
  body: string,
  status: number,
): Pick<ApiErrorOptions, 'message' | 'code' | 'fields'> {
  let payload: unknown;
  try {
    payload = JSON.parse(body) as unknown;
  } catch {
    // Never display an arbitrary non-JSON response: it may be an HTML error
    // page, a proxy response, or an unhandled server error. Core API routes
    // provide safe JSON messages; older plain-text routes fall back by status.
    return { message: fallbackMessage(status) };
  }

  if (typeof payload === 'string') {
    return { message: payload.trim() || fallbackMessage(status) };
  }

  if (!isRecord(payload)) {
    return { message: fallbackMessage(status) };
  }

  if (isRecord(payload.error)) {
    return {
      message:
        stringFromValue(payload.error.message) ?? fallbackMessage(status),
      code: stringFromValue(payload.error.code),
      fields: fieldErrorsFromValue(payload.error.fields),
    };
  }

  return {
    message:
      stringFromValue(payload.error) ??
      stringFromValue(payload.errors) ??
      stringFromValue(payload.message) ??
      stringFromValue(payload.reason) ??
      fallbackMessage(status),
  };
}

async function requestResponse(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch (cause) {
    throw new ApiError({
      code: 'NETWORK_ERROR',
      message: 'Unable to reach Shrunk. Check your connection and try again.',
      cause,
    });
  }

  if (response.ok) {
    return response;
  }

  const body = await response.text();
  const parsed = parseErrorPayload(body, response.status);
  throw new ApiError({
    ...parsed,
    status: response.status,
    requestId: response.headers.get('X-Request-ID'),
  });
}

function invalidResponseError(response: Response, cause?: unknown): ApiError {
  return new ApiError({
    code: 'INVALID_RESPONSE',
    message: 'The server returned an unexpected response. Please try again.',
    status: response.status,
    requestId: response.headers.get('X-Request-ID'),
    cause,
  });
}

export async function requestJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const response = await requestResponse(input, init);
  const body = await response.text();
  if (!body.trim()) {
    throw invalidResponseError(response);
  }

  try {
    return JSON.parse(body) as T;
  } catch (cause) {
    throw invalidResponseError(response, cause);
  }
}

export async function requestText(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<string> {
  const response = await requestResponse(input, init);
  return response.text();
}

export async function requestBlob(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Blob> {
  const response = await requestResponse(input, init);
  return response.blob();
}

export async function requestVoid(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<void> {
  await requestResponse(input, init);
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function getErrorMessage(
  error: unknown,
  fallback = defaultErrorMessage,
): string {
  if (isApiError(error)) {
    return error.message;
  }
  return fallback;
}

export function getFieldError(
  error: unknown,
  field: string,
): string | undefined {
  if (!isApiError(error)) {
    return undefined;
  }
  return error.fields[field] ?? error.fields._form;
}
