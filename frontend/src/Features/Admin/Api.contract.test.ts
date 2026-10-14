import dayjs from 'dayjs';
import { afterEach, expect, it, vi } from 'vitest';
import * as admin from './Api';

afterEach(() => vi.unstubAllGlobals());

function respond(body: unknown = {}) {
  const fetch = vi.fn<typeof globalThis.fetch>(
    async () =>
      new Response(JSON.stringify(body), {
        headers: { 'Content-Type': 'application/json' },
      }),
  );
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

function expectRequest(
  fetch: ReturnType<typeof respond>,
  path: string,
  method: string,
  body?: unknown,
  index = 0,
) {
  const [url, options = {}] = fetch.mock.calls[index];
  expect(url).toBe(`/api/core/${path}`);
  expect(options.method ?? 'GET').toBe(method);
  if (body !== undefined)
    expect(JSON.parse(String(options.body))).toEqual(body);
  return options;
}

it.each(['promote', 'reject'] as const)(
  'sends the %s security action for the selected link',
  async (action) => {
    const fetch = respond();
    await admin.updateLinkSecurity('pending-1', action);
    const options = expectRequest(
      fetch,
      `security/${action}/pending-1`,
      'PATCH',
    );
    expect(new Headers(options.headers).get('X-Suppress-Toast')).toBe('1');
    expect(fetch).toHaveBeenCalledOnce();
  },
);

it('unwraps endpoint statistics, users and user options', async () => {
  const stats = [{ endpoint: 'create', total_visits: 5, unique_visits: 2 }];
  const fetch = respond({ stats });
  await expect(admin.getEndpointData()).resolves.toEqual(stats);
  expectRequest(fetch, 'admin/stats/endpoint', 'GET');

  const users = [
    { netid: 'person', organizations: [], roles: ['user'], linksCreated: 3 },
  ];
  fetch.mockImplementation(
    async () =>
      new Response(JSON.stringify({ users }), {
        headers: { 'Content-Type': 'application/json' },
      }),
  );
  const operations = [
    {
      type: 'filter',
      field: 'netid',
      specification: 'contains',
      filterString: 'person',
    },
  ];
  await expect(admin.getAllUsers(operations)).resolves.toEqual(users);
  expectRequest(fetch, 'user/all', 'POST', { operations }, 1);

  const options = { roles: ['user', 'admin'] };
  fetch.mockImplementation(
    async () =>
      new Response(JSON.stringify({ options }), {
        headers: { 'Content-Type': 'application/json' },
      }),
  );
  await expect(admin.getUserOptions()).resolves.toEqual(options);
  expectRequest(fetch, 'user/options', 'GET', undefined, 2);
  expect(fetch).toHaveBeenCalledTimes(3);
});

it.each(['neither', 'begin only', 'end only'] as const)(
  'omits a partial stats range: %s',
  async (bounds) => {
    const stats = { links: 2, visits: 5, users: 1 };
    const fetch = respond(stats);
    const date = dayjs('2026-01-01');
    await expect(
      admin.getAppStats(
        bounds === 'begin only' ? date : undefined,
        bounds === 'end only' ? date : undefined,
      ),
    ).resolves.toEqual(stats);
    expectRequest(fetch, 'admin/stats/overview', 'POST', {});
  },
);

it('sends both bounds of a complete admin stats range', async () => {
  const fetch = respond({ links: 2, visits: 5, users: 1 });
  const begin = dayjs('2026-01-01T12:00:00Z');
  const end = dayjs('2026-02-01T12:00:00Z');
  await admin.getAppStats(begin, end);
  const options = fetch.mock.calls[0][1] ?? {};
  const body = JSON.parse(String(options.body));
  expectRequest(fetch, 'admin/stats/overview', 'POST');
  expect(Object.keys(body)).toEqual(['range']);
  expect(Object.keys(body.range).sort()).toEqual(['begin', 'end']);
  expect(new Date(body.range.begin).valueOf()).toBe(begin.valueOf());
  expect(new Date(body.range.end).valueOf()).toBe(end.valueOf());
});

it('blocks, lists and unblocks the encoded URL', async () => {
  const entities = [{ _id: 'https://example.com' }];
  const fetch = respond({ entities });
  const path = 'role/blocked_url/entity/NB2HI4DTHIXS6ZLYMFWXA3DFFZRW63I=';
  await admin.blockLink('https://example.com', 'Reported by security');
  expectRequest(fetch, path, 'PUT', { comment: 'Reported by security' });
  await expect(admin.getBlockedLinks()).resolves.toEqual({ entities });
  expectRequest(fetch, 'role/blocked_url/entity', 'GET', undefined, 1);
  await admin.unBlockLink('https://example.com');
  const options = expectRequest(fetch, path, 'DELETE', undefined, 2);
  expect(new Headers(options.headers).get('X-Suppress-Toast')).toBe('1');
  expect(fetch).toHaveBeenCalledTimes(3);
});

it.each([undefined, ''])(
  'supplies a default audit comment when given %j',
  async (comment) => {
    const fetch = respond();
    await admin.blockLink('https://example.com', comment);
    const body = JSON.parse(String(fetch.mock.calls[0][1]?.body));
    expect(typeof body.comment).toBe('string');
    expect(body.comment.length).toBeGreaterThan(0);
  },
);

it('creates users and updates the intended user roles', async () => {
  const fetch = respond();
  await admin.createUser('person', ['user', 'power_user'], 'Approved');
  const options = expectRequest(fetch, 'user', 'POST', {
    netid: 'person',
    roles: ['user', 'power_user'],
    comment: 'Approved',
  });
  expect(new Headers(options.headers).get('X-Suppress-Toast')).toBe('1');
  await admin.addRoleToUser('person', 'admin', 'Promoted');
  expectRequest(
    fetch,
    'user/roles',
    'PATCH',
    { netid: 'person', role: 'admin', comment: 'Promoted' },
    1,
  );
  await admin.removeRoleFromUser('person', 'admin');
  expectRequest(
    fetch,
    'user/roles',
    'DELETE',
    { netid: 'person', role: 'admin' },
    2,
  );
  expect(fetch).toHaveBeenCalledTimes(3);
});
