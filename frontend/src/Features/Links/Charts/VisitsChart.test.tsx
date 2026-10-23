import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import { expect, it, vi } from 'vitest';
import VisitsChart from './VisitsChart';

vi.mock('@/Shared/ui/chart', () => ({
  ChartContainer: () => null,
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));

const dateRange = {
  start: dayjs('2026-10-01').startOf('day'),
  end: dayjs('2026-10-19').endOf('day'),
};

it('uses the requested dates when mounted again instead of resetting its own range', () => {
  const props = {
    dateRange,
    visitStats: { visits: [] },
    onRangeChange: vi.fn(),
  };
  const first = render(<VisitsChart {...props} />);
  expect(
    screen.getByRole('button', { name: '2026-10-01' }),
  ).toBeInTheDocument();
  first.unmount();
  render(<VisitsChart {...props} />);
  expect(
    screen.getByRole('button', { name: '2026-10-01' }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: '2026-10-19' }),
  ).toBeInTheDocument();
});

it('requests whole calendar days when a preset is selected', async () => {
  const onRangeChange = vi.fn();
  render(
    <VisitsChart
      dateRange={dateRange}
      visitStats={{ visits: [] }}
      onRangeChange={onRangeChange}
    />,
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Set date range to Last week' }),
  );
  const range = onRangeChange.mock.calls[0][0];
  expect(range.start.format('HH:mm:ss.SSS')).toBe('00:00:00.000');
  expect(range.end.format('HH:mm:ss.SSS')).toBe('23:59:59.999');
});

it('exposes dates and both series as table data without shifting UTC bucket dates', () => {
  render(
    <VisitsChart
      dateRange={dateRange}
      onRangeChange={vi.fn()}
      visitStats={{
        visits: [
          {
            _id: { year: 2026, month: 10, day: 4 },
            all_visits: 65,
            first_time_visits: 18,
          },
        ],
      }}
    />,
  );
  const table = screen.getByRole('table', { name: 'Daily link visits' });
  const row = within(table).getByRole('row', { name: 'Oct 4, 2026 65 18' });
  expect(within(row).getByRole('rowheader')).toHaveTextContent('Oct 4, 2026');
});

it('announces an empty date range', () => {
  render(
    <VisitsChart
      dateRange={dateRange}
      onRangeChange={vi.fn()}
      visitStats={{ visits: [] }}
    />,
  );
  expect(screen.getByRole('table')).toHaveTextContent(
    'No visit data in the selected date range.',
  );
});
