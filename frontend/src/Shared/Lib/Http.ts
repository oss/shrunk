import { FetchError, ofetch } from 'ofetch';
import { toast } from 'sonner';

/** The `{ error: { code, message, fields? } }` envelope returned by every /api/core error response. */
interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    fields?: Record<string, unknown>;
  };
  message?: string;
  reason?: string;
  errors?: string[];
}

const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';

/** Header that opts a request out of the automatic error toast (see getFieldError callers). */
const SUPPRESS_TOAST_HEADER = 'X-Suppress-Toast';

function errorData(error: unknown): unknown {
  return error instanceof FetchError ? error.data : undefined;
}

function payloadMessage(data: unknown) {
  // Read the expected fields defensively; only validated strings leave this helper.
  const payload = data as ApiErrorPayload | null | undefined;
  const direct = [
    payload?.error?.message,
    payload?.message,
    payload?.reason,
  ].find((message) => typeof message === 'string');
  return (
    direct ??
    (Array.isArray(payload?.errors)
      ? payload.errors.find((message) => typeof message === 'string')
      : undefined)
  );
}

function isAbortError(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current = error;

  while (
    current !== null &&
    typeof current === 'object' &&
    !seen.has(current)
  ) {
    seen.add(current);
    if ('name' in current && current.name === 'AbortError') return true;
    current = 'cause' in current ? current.cause : undefined;
  }

  return false;
}

export function getErrorMessage(
  error: unknown,
  fallback = DEFAULT_ERROR_MESSAGE,
): string {
  return payloadMessage(errorData(error)) ?? fallback;
}

export function getFieldError(
  error: unknown,
  field: string,
): string | undefined {
  const payload = errorData(error) as ApiErrorPayload | null | undefined;
  const value = payload?.error?.fields?.[field];
  return typeof value === 'string' ? value : undefined;
}

export const api = ofetch.create({
  baseURL: '/api/core',
  retry: 0,
  onRequestError({ request, error, options }) {
    const suppressToast = new Headers(options.headers).has(
      SUPPRESS_TOAST_HEADER,
    );
    if (!suppressToast && !isAbortError(error)) {
      toast.error(DEFAULT_ERROR_MESSAGE, { id: `api:${String(request)}` });
    }
  },
  onResponseError({ request, response, options }) {
    if (new Headers(options.headers).get(SUPPRESS_TOAST_HEADER)) {
      return;
    }
    toast.error(
      payloadMessage(response._data) ??
        `Something went wrong. ${response.status}`,
      {
        id: `api:${options.method ?? 'GET'}:${String(request)}`,
      },
    );
  },
});

/** Passed as `headers` to suppress the automatic error toast for a single request. */
export const suppressToastHeader = { [SUPPRESS_TOAST_HEADER]: '1' };
