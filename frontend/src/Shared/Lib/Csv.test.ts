import { afterEach, expect, it, vi } from 'vitest';
import { downloadVisits } from './Csv';
import { downloadBlob } from './Utils';

vi.mock('./Utils', () => ({ downloadBlob: vi.fn() }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it('downloads the visits CSV as a blob with a link-specific filename', async () => {
  const contents = 'alias,visits\nexample,3\n';
  const fetchMock = vi.fn(
    async () =>
      new Response(contents, { headers: { 'Content-Type': 'text/csv' } }),
  );
  vi.stubGlobal('fetch', fetchMock);
  await downloadVisits('link-id');
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/core/link/link-id/visits',
    expect.any(Object),
  );
  expect(downloadBlob).toHaveBeenCalledWith('link-id.csv', expect.any(Blob));
  const blob = vi.mocked(downloadBlob).mock.calls[0][1];
  expect(await blob.text()).toBe(contents);
});
