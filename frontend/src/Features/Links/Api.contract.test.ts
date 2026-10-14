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
  const link = { _id: 'link-1', title: 'Original' };
  const fetch = respond(link);
  await expect(links.getLink('link-1')).resolves.toEqual(link);
  expectRequest(fetch, 'link/link-1', 'GET');
  const edits = { title: 'Updated', alias: 'updated', expiration_time: null };
  await links.editLink('link-1', edits);
  expectRequest(fetch, 'link/link-1', 'PATCH', edits, 1);
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
      'org-1',
      'go.example.com',
    ),
  ).resolves.toBe('created-id');
  const options = expectRequest(fetch, 'link', 'POST', {
    is_tracking_pixel_link: false,
    title: 'Research',
    long_url: 'https://example.com',
    alias: 'research',
    expiration_time: '2027-01-02T03:04:05.000Z',
    org_id: 'org-1',
    domain: 'go.example.com',
  });
  expect(new Headers(options.headers).get('X-Suppress-Toast')).toBe('1');
  expect(fetch).toHaveBeenCalledOnce();
});

it('deletes a single link, deletes a selected batch and reverts expiration', async () => {
  const fetch = respond();
  await links.deleteLink('link-1');
  await links.deleteLinkBulk(['link-1', 'link-2']);
  await links.reverLinkExpirationDate('link-2');
  expectRequest(fetch, 'link/link-1', 'DELETE');
  expectRequest(
    fetch,
    'link/delete_bulk',
    'POST',
    { link_ids: ['link-1', 'link-2'] },
    1,
  );
  expectRequest(fetch, 'link/link-2/revert', 'POST', undefined, 2);
  expect(fetch).toHaveBeenCalledTimes(3);
});

it.each(['editor', 'viewer'] as const)(
  'adds a %s to single and bulk link ACLs',
  async (role) => {
    const fetch = respond();
    const collaborator = {
      _id: 'org-1',
      type: 'org' as const,
      org_name: 'Research',
    };
    await links.addCollaborator('link-1', collaborator, role);
    await links.addCollaboratorBulk(['link-1', 'link-2'], collaborator, role);
    expectRequest(fetch, 'link/link-1/acl', 'PATCH', {
      acl: `${role}s`,
      action: 'add',
      entry: collaborator,
    });
    expectRequest(
      fetch,
      'link/acl_bulk',
      'POST',
      {
        link_ids: ['link-1', 'link-2'],
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
      _id: 'org-1',
      type: 'org' as const,
      org_name: 'Research',
    };
    const entry = { _id: 'org-1', type: 'org' };
    await links.removeCollaborator('link-1', collaborator, role);
    await links.removeCollaboratorBulk(
      ['link-1', 'link-2'],
      collaborator,
      role,
    );
    expectRequest(fetch, 'link/link-1/acl', 'PATCH', {
      acl: `${role}s`,
      action: 'remove',
      entry,
    });
    expectRequest(
      fetch,
      'link/acl_bulk',
      'POST',
      {
        link_ids: ['link-1', 'link-2'],
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
  await links.removeCollaboratorBulk(['link-1', 'link-2'], {
    _id: 'person',
    type: 'netid',
  });
  expectRequest(fetch, 'link/acl_bulk', 'POST', {
    link_ids: ['link-1', 'link-2'],
    acl: 'viewers',
    action: 'remove',
    entry: { _id: 'person', type: 'netid' },
  });
  expect(fetch).toHaveBeenCalledOnce();
});

it('removes both ACL roles for a single link when no role is selected', async () => {
  const fetch = respond();
  await links.removeCollaborator('link-1', { _id: 'person', type: 'netid' });
  expectRequest(fetch, 'link/link-1/acl', 'PATCH', {
    acl: 'viewers',
    action: 'remove',
    entry: { _id: 'person', type: 'netid' },
  });
  expectRequest(
    fetch,
    'link/link-1/acl',
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
  await links.transferLinksBulk(['link-1', 'link-2'], owner);
  await links.transferLink('link-3', owner);
  expectRequest(fetch, 'link/transfer_bulk', 'POST', {
    link_ids: ['link-1', 'link-2'],
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
    await expect(load('link-1')).resolves.toEqual(data);
    expectRequest(fetch, `link/link-1/${path}`, 'GET');
    await expect(load('link-1', 'newsletter & email')).resolves.toEqual(data);
    const url = new URL(String(fetch.mock.calls[1][0]), 'https://example.test');
    expect(url.pathname).toBe(`/api/core/link/link-1/${path}`);
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
  await expect(links.getLinkVisitsStats('link-1')).resolves.toEqual({
    visits: [],
  });
  expectRequest(fetch, 'link/link-1/stats/visits', 'GET');
  await links.getLinkVisitsStats('link-1', 'mail', start, end);
  const url = new URL(String(fetch.mock.calls[1][0]), 'https://example.test');
  expect(url.pathname).toBe('/api/core/link/link-1/stats/visits');
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
  const result = { count: 1, results: [{ _id: 'link-1' }] };
  const fetch = respond(result);
  const query = { query: 'research', pagination: { skip: 0, limit: 20 } };
  await expect(links.searchLinks(query)).resolves.toEqual(result);
  expectRequest(fetch, 'search', 'POST', query);
  expect(fetch).toHaveBeenCalledOnce();
});
