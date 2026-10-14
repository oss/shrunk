import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  serverValidateDuplicateAlias,
  serverValidateReservedAlias,
  serverValidateLongUrl,
  serverValidateNetId,
  serverValidateGuest,
  serverValidateOrgName,
} from './ServerValidators';

afterEach(() => vi.unstubAllGlobals());

const validators = [
  [
    'duplicate alias',
    serverValidateDuplicateAlias,
    'hello',
    '/api/core/link/validate_duplicate_alias/NBSWY3DP',
    undefined,
  ],
  [
    'reserved alias',
    serverValidateReservedAlias,
    'hello',
    '/api/core/link/validate_reserved_alias/NBSWY3DP',
    undefined,
  ],
  [
    'long URL',
    serverValidateLongUrl,
    'https://example.com',
    '/api/core/link/validate_long_url/NB2HI4DTHIXS6ZLYMFWXA3DFFZRW63I=',
    undefined,
  ],
  [
    'NetID',
    serverValidateNetId,
    'someone',
    '/api/core/org/validate_netid',
    { netid: 'someone' },
  ],
  [
    'guest',
    serverValidateGuest,
    'someone',
    '/api/core/org/validate_guest',
    { netid: 'someone' },
  ],
  [
    'organization',
    serverValidateOrgName,
    'Team',
    '/api/core/org/validate_name',
    { name: 'Team' },
  ],
] as const;

describe.each(validators)(
  '%s validation',
  (_, validate, value, endpoint, body) => {
    it('skips an empty value', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      await expect(validate('')).resolves.toBeUndefined();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each([true, false])(
      'handles valid=%s and sends the expected request',
      async (valid) => {
        const fetchMock = vi.fn(
          async () =>
            new Response(JSON.stringify({ valid, reason: 'Not allowed' }), {
              headers: { 'Content-Type': 'application/json' },
            }),
        );
        vi.stubGlobal('fetch', fetchMock);
        if (valid) await expect(validate(value)).resolves.toBeUndefined();
        else await expect(validate(value)).rejects.toThrow('Not allowed');
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, options] = fetchMock.mock.calls[0] as unknown as [
          string,
          RequestInit,
        ];
        expect(url).toBe(endpoint);
        expect(options.method ?? 'GET').toBe(body ? 'POST' : 'GET');
        if (body) expect(JSON.parse(options.body as string)).toEqual(body);
      },
    );
  },
);

it('leaves short duplicate-alias errors to client-side length validation', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify({ valid: false, reason: 'Duplicate' }), {
          headers: { 'Content-Type': 'application/json' },
        }),
    ),
  );
  await expect(serverValidateDuplicateAlias('abcd')).resolves.toBeUndefined();
});

it('passes cancellation through to the URL validation request', async () => {
  const controller = new AbortController();
  const fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify({ valid: true }), {
        headers: { 'Content-Type': 'application/json' },
      }),
  );
  vi.stubGlobal('fetch', fetchMock);
  await serverValidateLongUrl('https://example.com', controller.signal);
  expect(fetchMock).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({ signal: controller.signal }),
  );
});
