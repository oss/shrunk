import { describe, it, expect, vi, afterEach } from 'vitest';
import { toast } from 'sonner';
import {
  api,
  getErrorMessage,
  getFieldError,
  suppressToastHeader,
} from '@/Shared/Lib/Http';

function mockFetchOnce(status: number, body: unknown) {
  globalThis.fetch = vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
  ) as unknown as typeof fetch;
}

describe('api (Shared/Lib/Http ofetch client)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns parsed JSON on a 2xx response', async () => {
    mockFetchOnce(200, { hello: 'world' });

    const data = await api<{ hello: string }>('ping');

    expect(data).toEqual({ hello: 'world' });
  });

  it('throws on a non-2xx response', async () => {
    mockFetchOnce(400, { error: { code: 'BAD_REQUEST', message: 'nope' } });

    await expect(api('ping')).rejects.toThrow();
  });

  it('invokes onResponseError (surfacing a toast) on failure', async () => {
    mockFetchOnce(400, {
      error: { code: 'BAD_REQUEST', message: 'bad request' },
    });
    const toastErrorSpy = vi.spyOn(toast, 'error');

    await expect(api('ping')).rejects.toThrow();

    expect(toastErrorSpy).toHaveBeenCalledWith(
      'bad request',
      expect.objectContaining({ id: expect.any(String) }),
    );
  });

  it('extracts field errors via getFieldError, without duplicating the toast when suppressed', async () => {
    mockFetchOnce(400, {
      error: {
        code: 'INVALID_ALIAS',
        message: 'That custom alias cannot be used.',
        fields: { alias: 'Choose a different alias.' },
      },
    });
    const toastErrorSpy = vi.spyOn(toast, 'error');

    let caught: unknown;
    try {
      await api('ping', { headers: suppressToastHeader });
    } catch (error) {
      caught = error;
    }

    expect(getErrorMessage(caught)).toBe('That custom alias cannot be used.');
    expect(getFieldError(caught, 'alias')).toBe('Choose a different alias.');
    expect(toastErrorSpy).not.toHaveBeenCalled();
  });

  it('surfaces network failures', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('offline');
    }) as unknown as typeof fetch;
    const toastErrorSpy = vi.spyOn(toast, 'error');

    await expect(api('ping')).rejects.toThrow('offline');

    expect(toastErrorSpy).toHaveBeenCalledWith(
      'Something went wrong. Please try again.',
      expect.objectContaining({ id: expect.any(String) }),
    );
  });

  it('suppresses network failure toasts when the caller handles them', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('offline');
    }) as unknown as typeof fetch;
    const toastErrorSpy = vi.spyOn(toast, 'error');

    await expect(api('ping', { headers: suppressToastHeader })).rejects.toThrow(
      'offline',
    );

    expect(toastErrorSpy).not.toHaveBeenCalled();
  });

  it('does not retry and preserves legacy error messages', async () => {
    mockFetchOnce(500, { message: 'Duplicate link exists' });

    let caught: unknown;
    try {
      await api('ping');
    } catch (error) {
      caught = error;
    }

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(getErrorMessage(caught)).toBe('Duplicate link exists');
  });

  it.each([
    [{ reason: 'Legacy reason' }, 'Legacy reason'],
    [{ errors: ['Legacy list error'] }, 'Legacy list error'],
    ['upstream proxy text', 'fallback'],
  ])('handles legacy and untrusted error bodies', async (body, expected) => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(typeof body === 'string' ? body : JSON.stringify(body), {
          status: 500,
          headers:
            typeof body === 'string'
              ? undefined
              : { 'Content-Type': 'application/json' },
        }),
    ) as unknown as typeof fetch;

    let caught: unknown;
    try {
      await api('ping');
    } catch (error) {
      caught = error;
    }

    expect(getErrorMessage(caught, 'fallback')).toBe(expected);
  });

  it('does not toast intentional cancellation, including wrapped aborts', async () => {
    const abort = new DOMException('cancelled', 'AbortError');
    globalThis.fetch = vi.fn(async () => {
      const wrapped = new Error('wrapped') as Error & { cause: unknown };
      wrapped.cause = abort;
      throw wrapped;
    }) as unknown as typeof fetch;
    const toastErrorSpy = vi.spyOn(toast, 'error');

    await expect(api('ping')).rejects.toThrow();

    expect(toastErrorSpy).not.toHaveBeenCalled();
  });
});
