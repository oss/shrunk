import dayjs from 'dayjs';
import { afterEach, expect, it, vi } from 'vitest';
import * as links from './Api';

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

it('fetches and edits the requested link', async () => {
  const link = { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', title: 'Original' };
  const fetch = respond(link);
  await expect(links.getLink('aaaaaaaaaaaaaaaaaaaaaaaa')).resolves.toEqual(
    link,
  );
  expectRequest(fetch, 'link/aaaaaaaaaaaaaaaaaaaaaaaa', 'GET');
  const edits = { title: 'Updated', alias: 'updated', expiration_time: null };
  await links.editLink('aaaaaaaaaaaaaaaaaaaaaaaa', edits);
  expectRequest(fetch, 'link/aaaaaaaaaaaaaaaaaaaaaaaa', 'PATCH', edits, 1);
  expect(fetch).toHaveBeenCalledTimes(2);
});

it('creates a link with an alias, expiration and organization', async () => {
  const fetch = respond({ id: 'created-id' });
  const expiry = dayjs('2027-01-02T03:04:05Z');
  await expect(
    links.createLink(
      false,
      'Research',
      ' https://example.com ',
      'research',
      expiry,
      undefined,
      'cccccccccccccccccccccccc',
      'go.example.com',
    ),
  ).resolves.toBe('created-id');
  const options = expectRequest(fetch, 'link', 'POST', {
    is_tracking_pixel_link: false,
    title: 'Research',
    long_url: 'https://example.com',
    alias: 'research',
    expiration_time: '2027-01-02T03:04:05.000Z',
    org_id: 'cccccccccccccccccccccccc',
    domain: 'go.example.com',
  });
  expect(new Headers(options.headers).get('X-Suppress-Toast')).toBe('1');
  expect(fetch).toHaveBeenCalledOnce();
});

it('deletes a single link, deletes a selected batch and reverts expiration', async () => {
  const fetch = respond();
  await links.deleteLink('aaaaaaaaaaaaaaaaaaaaaaaa');
  await links.deleteLinkBulk([
    'aaaaaaaaaaaaaaaaaaaaaaaa',
    'bbbbbbbbbbbbbbbbbbbbbbbb',
  ]);
  await links.reverLinkExpirationDate('bbbbbbbbbbbbbbbbbbbbbbbb');
  expectRequest(fetch, 'link/aaaaaaaaaaaaaaaaaaaaaaaa', 'DELETE');
  expectRequest(
    fetch,
    'link/delete_bulk',
    'POST',
    { link_ids: ['aaaaaaaaaaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbbbbbbbbbb'] },
    1,
  );
  expectRequest(
    fetch,
    'link/bbbbbbbbbbbbbbbbbbbbbbbb/revert',
    'POST',
    undefined,
    2,
  );
  expect(fetch).toHaveBeenCalledTimes(3);
});

it.each(['editor', 'viewer'] as const)(
  'adds a %s to single and bulk link ACLs',
  async (role) => {
    const fetch = respond();
    const collaborator = {
      _id: 'cccccccccccccccccccccccc',
      type: 'org' as const,
      org_name: 'Research',
    };
    await links.addCollaborator('aaaaaaaaaaaaaaaaaaaaaaaa', collaborator, role);
    await links.addCollaboratorBulk(
      ['aaaaaaaaaaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbbbbbbbbbb'],
      collaborator,
      role,
    );
    expectRequest(fetch, 'link/aaaaaaaaaaaaaaaaaaaaaaaa/acl', 'PATCH', {
      acl: `${role}s`,
      action: 'add',
      entry: collaborator,
    });
    expectRequest(
      fetch,
      'link/acl_bulk',
      'POST',
      {
        link_ids: ['aaaaaaaaaaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbbbbbbbbbb'],
        acl: `${role}s`,
        action: 'add',
        entry: collaborator,
      },
      1,
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  },
);

it.each(['editor', 'viewer'] as const)(
  'removes only the selected %s ACL',
  async (role) => {
    const fetch = respond();
    const collaborator = {
      _id: 'cccccccccccccccccccccccc',
      type: 'org' as const,
      org_name: 'Research',
    };
    const entry = { _id: 'cccccccccccccccccccccccc', type: 'org' };
    await links.removeCollaborator(
      'aaaaaaaaaaaaaaaaaaaaaaaa',
      collaborator,
      role,
    );
    await links.removeCollaboratorBulk(
      ['aaaaaaaaaaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbbbbbbbbbb'],
      collaborator,
      role,
    );
    expectRequest(fetch, 'link/aaaaaaaaaaaaaaaaaaaaaaaa/acl', 'PATCH', {
      acl: `${role}s`,
      action: 'remove',
      entry,
    });
    expectRequest(
      fetch,
      'link/acl_bulk',
      'POST',
      {
        link_ids: ['aaaaaaaaaaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbbbbbbbbbb'],
        acl: `${role}s`,
        action: 'remove',
        entry,
      },
      1,
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  },
);

it('defaults bulk collaborator removal to the viewer ACL', async () => {
  const fetch = respond();
  await links.removeCollaboratorBulk(
    ['aaaaaaaaaaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbbbbbbbbbb'],
    {
      _id: 'person',
      type: 'netid',
    },
  );
  expectRequest(fetch, 'link/acl_bulk', 'POST', {
    link_ids: ['aaaaaaaaaaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbbbbbbbbbb'],
    acl: 'viewers',
    action: 'remove',
    entry: { _id: 'person', type: 'netid' },
  });
  expect(fetch).toHaveBeenCalledOnce();
});

it('removes both ACL roles for a single link when no role is selected', async () => {
  const fetch = respond();
  await links.removeCollaborator('aaaaaaaaaaaaaaaaaaaaaaaa', {
    _id: 'person',
    type: 'netid',
  });
  expectRequest(fetch, 'link/aaaaaaaaaaaaaaaaaaaaaaaa/acl', 'PATCH', {
    acl: 'viewers',
    action: 'remove',
    entry: { _id: 'person', type: 'netid' },
  });
  expectRequest(
    fetch,
    'link/aaaaaaaaaaaaaaaaaaaaaaaa/acl',
    'PATCH',
    {
      acl: 'editors',
      action: 'remove',
      entry: { _id: 'person', type: 'netid' },
    },
    1,
  );
  expect(fetch).toHaveBeenCalledTimes(2);
});

it('transfers exactly the selected links to the chosen owner', async () => {
  const fetch = respond();
  const owner = { _id: 'new-owner', type: 'netid' as const };
  await links.transferLinksBulk(
    ['aaaaaaaaaaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbbbbbbbbbb'],
    owner,
  );
  await links.transferLink('link-3', owner);
  expectRequest(fetch, 'link/transfer_bulk', 'POST', {
    link_ids: ['aaaaaaaaaaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbbbbbbbbbb'],
    owner,
  });
  expectRequest(
    fetch,
    'link/transfer_bulk',
    'POST',
    { link_ids: ['link-3'], owner },
    1,
  );
  expect(fetch).toHaveBeenCalledTimes(2);
});

it.each([true, false])(
  'returns alias validity=%s from the encoded alias endpoint',
  async (valid) => {
    const fetch = respond({ valid });
    await expect(links.isValidAlias('hello')).resolves.toBe(valid);
    expectRequest(fetch, 'link/validate_duplicate_alias/NBSWY3DP', 'GET');
  },
);

it.each([
  ['overall', links.getLinkStats, 'stats'],
  ['geography', links.getLinkGeoIpStats, 'stats/geoip'],
  ['browsers', links.getLinkBrowserStats, 'stats/browser'],
] as const)(
  'requests %s stats with and without a source filter',
  async (_, load, path) => {
    const data = { visits: 7 };
    const fetch = respond(data);
    await expect(load('aaaaaaaaaaaaaaaaaaaaaaaa')).resolves.toEqual(data);
    expectRequest(fetch, `link/aaaaaaaaaaaaaaaaaaaaaaaa/${path}`, 'GET');
    await expect(
      load('aaaaaaaaaaaaaaaaaaaaaaaa', 'newsletter & email'),
    ).resolves.toEqual(data);
    const url = new URL(String(fetch.mock.calls[1][0]), 'https://example.test');
    expect(url.pathname).toBe(
      `/api/core/link/aaaaaaaaaaaaaaaaaaaaaaaa/${path}`,
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      source: 'newsletter & email',
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  },
);

it('passes optional visit date bounds and source without inventing defaults', async () => {
  const fetch = respond({ visits: [] });
  const start = dayjs('2026-01-01T12:00:00Z');
  const end = dayjs('2026-02-01T12:00:00Z');
  await expect(
    links.getLinkVisitsStats('aaaaaaaaaaaaaaaaaaaaaaaa'),
  ).resolves.toEqual({
    visits: [],
  });
  expectRequest(fetch, 'link/aaaaaaaaaaaaaaaaaaaaaaaa/stats/visits', 'GET');
  await links.getLinkVisitsStats(
    'aaaaaaaaaaaaaaaaaaaaaaaa',
    'mail',
    start,
    end,
  );
  const url = new URL(String(fetch.mock.calls[1][0]), 'https://example.test');
  expect(url.pathname).toBe(
    '/api/core/link/aaaaaaaaaaaaaaaaaaaaaaaa/stats/visits',
  );
  expect([...url.searchParams.keys()].sort()).toEqual([
    'end_date',
    'source',
    'start_date',
  ]);
  expect(new Date(url.searchParams.get('start_date')!).valueOf()).toBe(
    start.valueOf(),
  );
  expect(new Date(url.searchParams.get('end_date')!).valueOf()).toBe(
    end.valueOf(),
  );
  expect(url.searchParams.get('source')).toBe('mail');
});

it('posts the full search query and returns the result envelope', async () => {
  const result = { count: 1, results: [{ _id: 'aaaaaaaaaaaaaaaaaaaaaaaa' }] };
  const fetch = respond(result);
  const query = { query: 'research', pagination: { skip: 0, limit: 20 } };
  await expect(links.searchLinks(query)).resolves.toEqual(result);
  expectRequest(fetch, 'search', 'POST', query);
  expect(fetch).toHaveBeenCalledOnce();
});
