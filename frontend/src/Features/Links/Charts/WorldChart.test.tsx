import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import GeoipChart from './WorldChart';

vi.mock('@/Shared/ui/chart', () => ({ ChartContainer: () => null }));

const scrollIntoView = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'scrollIntoView',
);
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
});
afterAll(() => {
  if (scrollIntoView)
    Object.defineProperty(
      HTMLElement.prototype,
      'scrollIntoView',
      scrollIntoView,
    );
  else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
});

it('exposes state and country names with counts for the selected map', async () => {
  render(
    <GeoipChart
      data={{
        us: [{ code: 'NJ', value: 38 }],
        world: [
          { code: 'US', value: 62 },
          { code: 'ZZ', value: 3 },
        ],
      }}
    />,
  );
  const states = screen.getByRole('table', { name: 'Visits by US state' });
  expect(
    within(states).getByRole('row', { name: 'New Jersey 38' }),
  ).toBeInTheDocument();
  screen.getByRole('combobox', { name: 'Map region' }).focus();
  await userEvent.keyboard(' ');
  screen.getByRole('option', { name: 'World' }).focus();
  await userEvent.keyboard('{Enter}');
  const countries = screen.getByRole('table', { name: 'Visits by country' });
  expect(
    within(countries).getByRole('row', { name: /United States.*62/ }),
  ).toBeInTheDocument();
  expect(
    within(countries).getByRole('row', { name: 'ZZ 3' }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('table', { name: 'Visits by US state' }),
  ).not.toBeInTheDocument();
});

it('announces an empty map', () => {
  render(<GeoipChart data={{ us: [], world: [] }} />);
  expect(screen.getByRole('table')).toHaveTextContent('No visit data.');
});
