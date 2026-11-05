import base32 from 'hi-base32';
import { afterEach, expect, it, vi } from 'vitest';
import * as links from './Api';
import * as orgs from '@/Features/Organizations/Api';

const id = 'abcdef0123456789abcdef01';
afterEach(() => vi.unstubAllGlobals());
function respond(body: unknown = {}) {
  const fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

it.each(['/', '?', '#', '%2F', '%3F', '%23', 'Research & Teaching'])(
  'encodes organization name %s exactly once',
  async (name) => {
    const fetch = respond();
    await orgs.renameOrganization(id, name);
    expect(fetch.mock.calls[0][0]).toBe(
      `/api/core/org/${id}/rename/${encodeURIComponent(name)}`,
    );
  },
);
it.each(['/', '?', '#', '%2F', '[', 'ordinary.alias'])(
  'preserves alias %s through base32 and one path encoding',
  async (alias) => {
    const fetch = respond({ valid: true });
    await expect(links.isValidAlias(alias)).resolves.toBe(true);
    expect(fetch.mock.calls[0][0]).toBe(
      `/api/core/link/validate_duplicate_alias/${encodeURIComponent(base32.encode(alias))}`,
    );
  },
);
it.each([
  '/',
  '?',
  '#',
  '%2F',
  '../other',
  'alias',
  '',
  'a'.repeat(23),
  'g'.repeat(24),
])('rejects malformed object ID %s before HTTP', async (value) => {
  const fetch = respond();
  await expect(links.getLink(value)).rejects.toThrow('Invalid object ID');
  await expect(links.editLink(value, {})).rejects.toThrow('Invalid object ID');
  await expect(orgs.getOrganization(value)).rejects.toThrow(
    'Invalid object ID',
  );
  await expect(orgs.renameOrganization(value, 'Ordinary')).rejects.toThrow(
    'Invalid object ID',
  );
  await expect(orgs.addMemberToOrganization(value, 'abc123')).rejects.toThrow(
    'Invalid object ID',
  );
  expect(fetch).not.toHaveBeenCalled();
});
it.each(['/', '?', '#', '%2F', '../other', 'user name', ''])(
  'rejects malformed NetID %s before HTTP',
  async (netid) => {
    const fetch = respond();
    await expect(orgs.addMemberToOrganization(id, netid)).rejects.toThrow(
      'Invalid NetID',
    );
    expect(fetch).not.toHaveBeenCalled();
  },
);
it.each(['abc123', 'DEV_user'])(
  'allows ordinary NetID %s without ObjectId validation',
  async (netid) => {
    const fetch = respond();
    await orgs.addMemberToOrganization(id, netid);
    expect(fetch.mock.calls[0][0]).toBe(`/api/core/org/${id}/member/${netid}`);
  },
);
it('preserves valid link IDs and rejects empty and oversized aliases', async () => {
  const fetch = respond({ _id: id });
  await expect(links.getLink(id)).resolves.toEqual({ _id: id });
  expect(fetch.mock.calls[0][0]).toBe(`/api/core/link/${id}`);
  await expect(links.isValidAlias('')).rejects.toThrow('Alias must contain');
  await expect(links.isValidAlias('a'.repeat(257))).rejects.toThrow(
    'Alias must contain',
  );
  expect(fetch).toHaveBeenCalledOnce();
});
