import { expect, it } from 'vitest';
import { shouldRetryQuery } from '@/App/App';

it('does not retry client errors and bounds other retries', () => {
  expect(shouldRetryQuery(0, { response: { status: 404 } })).toBe(false);
  expect(shouldRetryQuery(0, { response: { status: 500 } })).toBe(true);
  expect(shouldRetryQuery(2, new Error('offline'))).toBe(false);
});
