import { afterEach, describe, expect, it, vi } from 'vitest';
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

  it('rejects malformed security status responses', async () => {
    globalThis.fetch = vi.fn(
      async () => new Response('UNKNOWN', { status: 200 }),
    ) as unknown as typeof fetch;

    await expect(getStatus()).rejects.toThrow('Invalid security status');
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
});
