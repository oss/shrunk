import { afterEach, expect, it, vi } from 'vitest';
import {
  cn,
  daysBetween,
  downloadBlob,
  downloadCsv,
  getLinkFromAlias,
  getRedirectFromAlias,
  toCsv,
} from './Utils';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it('escapes CSV delimiters, quotes and line breaks, preserving empty cells', () => {
  expect(
    toCsv([
      [
        'plain',
        'a,b',
        'say "hello"',
        'line\nbreak',
        'return\rbreak',
        null,
        undefined,
        0,
        false,
      ],
      ['next'],
    ]),
  ).toBe(
    'plain,"a,b","say ""hello""","line\nbreak","return\rbreak",,,0,false\nnext',
  );
  expect(toCsv([])).toBe('');
});

it('merges conditional classes and resolves conflicting Tailwind utilities', () => {
  expect(cn('px-2', false, { 'font-bold': true }, ['px-4'])).toBe(
    'font-bold px-4',
  );
});

it.each([
  [0, 0],
  [1, 1],
  [25, 2],
  [-48, 2],
])('calculates days for an offset of %i hours', (hours, expected) => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-10T00:00:00Z'));
  expect(daysBetween(new Date(Date.now() + hours * 60 * 60 * 1000))).toBe(
    expected,
  );
});

it('uses the current host for regular and tracking pixel links', () => {
  expect(getLinkFromAlias('example')).toBe(`${document.location.host}/example`);
  expect(getLinkFromAlias('example', true)).toBe(
    `${document.location.host}/api/core/t/example`,
  );
});

it.each([true, false])(
  'builds redirect URLs for dev=%s and both link types',
  (dev) => {
    vi.stubEnv('DEV', dev);
    const protocol = dev ? 'http' : 'https';
    expect(getRedirectFromAlias('example')).toBe(
      `${protocol}://${document.location.host}/example`,
    );
    expect(getRedirectFromAlias('example', true)).toBe(
      `${protocol}://${document.location.host}/api/core/t/example`,
    );
  },
);

it('downloads CSV contents and cleans up the temporary URL and anchor', async () => {
  const createObjectURL = vi.fn((_blob: Blob) => 'blob:test');
  const revokeObjectURL = vi.fn();
  vi.stubGlobal(
    'URL',
    Object.assign(class extends URL {}, { createObjectURL, revokeObjectURL }),
  );
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('visits.csv');
      expect(this.href).toBe('blob:test');
      expect(document.body.contains(this)).toBe(true);
    });
  downloadCsv('visits.csv', 'alias,visits');
  expect(click).toHaveBeenCalledOnce();
  const blob = createObjectURL.mock.calls[0][0] as Blob;
  expect(await blob.text()).toBe('alias,visits');
  expect(blob.type).toBe('text/csv;charset=utf-8');
  expect(document.querySelector('a[download="visits.csv"]')).toBeNull();
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
});

it('keeps a downloaded blob URL alive until the next timer tick', () => {
  vi.useFakeTimers();
  const contents = new Blob(['visits']);
  const createObjectURL = vi.fn((_blob: Blob) => 'blob:test');
  const revokeObjectURL = vi.fn();
  vi.stubGlobal(
    'URL',
    Object.assign(class extends URL {}, { createObjectURL, revokeObjectURL }),
  );
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('visits.csv');
      expect(this.href).toBe('blob:test');
      expect(document.body.contains(this)).toBe(true);
    });
  downloadBlob('visits.csv', contents);
  expect(click).toHaveBeenCalledOnce();
  expect(document.querySelector('a[download="visits.csv"]')).toBeNull();
  expect(createObjectURL).toHaveBeenCalledWith(contents);
  expect(revokeObjectURL).not.toHaveBeenCalled();
  vi.runAllTimers();
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
});
