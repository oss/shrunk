import { describe, it, expect, vi, afterEach } from 'vitest';
import { toast } from 'sonner';
import { FetchError } from 'ofetch';
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

  it.each([
    null,
    undefined,
    'text',
    42,
    { data: { error: { message: 'untrusted' } } },
    new Error('private'),
  ])('does not treat an arbitrary value as a parsed API error: %j', (error) => {
    expect(getErrorMessage(error, 'Safe fallback')).toBe('Safe fallback');
    expect(getFieldError(error, 'alias')).toBeUndefined();
  });

  it.each([
    { body: null, expected: 'fallback' },
    {
      body: { errors: [42, null, 'First real message', 'Second message'] },
      expected: 'First real message',
    },
    {
      body: {
        error: { message: 'Core message' },
        message: 'Legacy message',
        reason: 'Reason',
      },
      expected: 'Core message',
    },
    {
      body: { error: { message: 42 }, message: 'Legacy message' },
      expected: 'Legacy message',
    },
    { body: { errors: { message: 'Not an array' } }, expected: 'fallback' },
  ])(
    'extracts the first valid error message without trusting malformed bodies: %j',
    async ({ body, expected }) => {
      mockFetchOnce(400, body);
      let caught: unknown;
      try {
        await api('ping', { headers: suppressToastHeader });
      } catch (error) {
        caught = error;
      }
      expect(getErrorMessage(caught, 'fallback')).toBe(expected);
      expect(getFieldError(caught, 'alias')).toBeUndefined();
    },
  );

  it('handles a cyclic non-abort cause without hanging or suppressing the network error', async () => {
    const cycle = new Error('offline') as Error & { cause: unknown };
    cycle.cause = cycle;
    globalThis.fetch = vi.fn(async () => {
      throw cycle;
    });
    const notify = vi.spyOn(toast, 'error');
    await expect(api('ping')).rejects.toThrow('offline');
    expect(notify).toHaveBeenCalledOnce();
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

    expect(toastErrorSpy).toHaveBeenCalledWith('bad request', {
      id: 'api:GET:/api/core/ping',
    });
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

  it.each([
    ['Choose a different alias.', 'Choose a different alias.'],
    ['', ''],
    [undefined, undefined],
    [42, undefined],
    [false, undefined],
    [null, undefined],
    [{ message: 'Not a string' }, undefined],
    [['Not a string'], undefined],
  ])(
    'returns only string field errors for value %j',
    async (value, expected) => {
      mockFetchOnce(400, { error: { fields: { alias: value } } });
      let caught: unknown;
      try {
        await api('ping', { headers: suppressToastHeader });
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(FetchError);
      expect(getFieldError(caught, 'alias')).toBe(expected);
      expect(getFieldError(caught, 'missing')).toBeUndefined();
    },
  );

  it.each([undefined, null])(
    'surfaces network failures with cause=%s',
    async (cause) => {
      globalThis.fetch = vi.fn(async () => {
        const error = new TypeError('offline') as TypeError & {
          cause: unknown;
        };
        error.cause = cause;
        throw error;
      }) as unknown as typeof fetch;
      const toastErrorSpy = vi.spyOn(toast, 'error');

      await expect(api('ping')).rejects.toThrow('offline');

      expect(toastErrorSpy).toHaveBeenCalledWith(
        'Something went wrong. Please try again.',
        { id: 'api:/api/core/ping' },
      );
    },
  );

  it('keeps error toast identities distinct across request methods and paths', async () => {
    mockFetchOnce(400, {});
    const notify = vi.spyOn(toast, 'error');

    await expect(api('link/one', { method: 'PATCH' })).rejects.toThrow();
    await expect(api('link/two', { method: 'DELETE' })).rejects.toThrow();

    expect(notify.mock.calls).toEqual([
      ['Something went wrong. 400', { id: 'api:PATCH:/api/core/link/one' }],
      ['Something went wrong. 400', { id: 'api:DELETE:/api/core/link/two' }],
    ]);
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
