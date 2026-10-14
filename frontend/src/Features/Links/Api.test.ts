import { afterEach, expect, it, vi } from 'vitest';
import { createLink } from './Api';

afterEach(() => vi.unstubAllGlobals());

it.each(['.png', '.gif'] as const)(
  'omits blank UI fields for a %s pixel',
  async (extension) => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'pixel' }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await createLink(true, '   ', '', undefined, undefined, extension);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      is_tracking_pixel_link: true,
      tracking_pixel_extension: extension,
    });
  },
);

it('sends the selected domain and a trimmed URL', async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ id: 'link' }), {
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
  const id = await createLink(
    false,
    'Title',
    ' https://example.com ',
    undefined,
    undefined,
    undefined,
    undefined,
    'go.example.com',
  );
  expect(id).toBe('link');
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/core/link',
    expect.objectContaining({ method: 'POST' }),
  );
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
    title: 'Title',
    long_url: 'https://example.com',
    domain: 'go.example.com',
  });
});

it('rejects a tracking pixel extension for an ordinary link before sending a request', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  await expect(
    createLink(
      false,
      'Title',
      'https://example.com',
      undefined,
      undefined,
      '.png',
    ),
  ).rejects.toThrow(
    'trackingPixelImageType should be set only for tracking pixel links',
  );
  expect(fetchMock).not.toHaveBeenCalled();
});
