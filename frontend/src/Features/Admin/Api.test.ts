import { afterEach, describe, expect, it, vi } from 'vitest';
import * as http from '@/Shared/Lib/Http';
import {
  getPendingLinks,
  getPendingLinksCount,
  getStatus,
} from '@/Features/Admin/Api';

function mockResponse(body: unknown) {
  globalThis.fetch = vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  ) as unknown as typeof fetch;
}

describe('admin API response validation', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each(['ON', 'OFF'] as const)(
    'accepts security status %s with whitespace',
    async (status) => {
      globalThis.fetch = vi.fn(
        async () => new Response(` ${status}\n`),
      ) as unknown as typeof fetch;
      await expect(getStatus()).resolves.toBe(status);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/core/security/status',
        expect.any(Object),
      );
    },
  );

  it.each([
    { pendingLinks: [] },
    {
      pendingLinks: [
        {
          _id: 'pending-id',
          title: 'Review me',
          long_url: 'https://example.com',
          owner: { _id: 'owner', type: 'netid' },
        },
      ],
    },
  ])('accepts valid pending links: %j', async ({ pendingLinks }) => {
    mockResponse({ pendingLinks });
    await expect(getPendingLinks()).resolves.toEqual(pendingLinks);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/core/security/pending_links',
      expect.any(Object),
    );
  });

  it.each(['_id', 'title', 'long_url', 'owner'])(
    'rejects a pending link with invalid %s',
    async (field) => {
      mockResponse({
        pendingLinks: [
          {
            _id: 'id',
            title: 'Title',
            long_url: 'https://example.com',
            owner: { _id: 'owner', type: 'netid' },
            [field]: 42,
          },
        ],
      });
      await expect(getPendingLinks()).rejects.toThrow(
        'Invalid pending links response',
      );
    },
  );

  it.each(['netid', 'org'])('accepts a %s owner', async (type) => {
    const pendingLinks = [
      {
        _id: 'id',
        title: 'Title',
        long_url: 'https://example.com',
        owner: { _id: 'owner-id', type },
      },
    ];
    mockResponse({ pendingLinks });
    await expect(getPendingLinks()).resolves.toEqual(pendingLinks);
  });

  it.each([
    null,
    {},
    { _id: 42, type: 'netid' },
    { _id: 'id' },
    { _id: 'id', type: 'admin' },
  ])('rejects an invalid pending-link owner: %j', async (owner) => {
    mockResponse({
      pendingLinks: [
        {
          _id: 'id',
          title: 'Title',
          long_url: 'https://example.com',
          netid: 'legacy',
          owner,
        },
      ],
    });
    await expect(getPendingLinks()).rejects.toThrow(
      'Invalid pending links response',
    );
  });

  it.each([0, 3])('accepts a numeric pending-link count: %i', async (count) => {
    mockResponse({ pending_links_count: count });
    await expect(getPendingLinksCount()).resolves.toBe(count);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/core/security/pending_links/count',
      expect.any(Object),
    );
  });

  it('rejects malformed security status responses', async () => {
    globalThis.fetch = vi.fn(
      async () => new Response('UNKNOWN', { status: 200 }),
    ) as unknown as typeof fetch;

    await expect(getStatus()).rejects.toThrow('Invalid security status');
  });

  it('rejects a JSON-encoded status instead of accepting it as the plain-text contract', async () => {
    mockResponse('ON');
    await expect(getStatus()).rejects.toThrow('Invalid security status');
  });

  it('accepts the owner-based pending-link response produced by the backend', async () => {
    const pendingLinks = [
      {
        _id: 'pending-id',
        title: 'Review me',
        long_url: 'http://malware.testing.google.test/testing/malware/*',
        owner: { _id: 'DEV_USER', type: 'netid' },
        status: 'pending',
      },
    ];
    mockResponse({ pendingLinks });
    await expect(getPendingLinks()).resolves.toEqual(pendingLinks);
  });

  it.each([
    null,
    { pendingLinks: {} },
    { pendingLinks: [null] },
    { pendingLinks: [{}] },
  ])('rejects a malformed pending-links response: %j', async (body) => {
    mockResponse(body);

    await expect(getPendingLinks()).rejects.toThrow(
      'Invalid pending links response',
    );
  });

  it('rejects a malformed pending-link count', async () => {
    mockResponse({ pending_links_count: '1' });

    await expect(getPendingLinksCount()).rejects.toThrow(
      'Invalid pending links count response',
    );
  });

  it('rejects undefined pending-link entries with the validation error', async () => {
    // Exercise the adapter boundary directly: JSON fixtures turn undefined entries into null.
    vi.spyOn(http, 'api').mockResolvedValue({ pendingLinks: [undefined] });
    await expect(getPendingLinks()).rejects.toThrow(
      'Invalid pending links response',
    );
  });
});
