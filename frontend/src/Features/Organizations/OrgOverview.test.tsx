import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';

import { getOrganizationStats } from '@/Features/Organizations/Api';
import OrgOverview from '@/Features/Organizations/OrgOverview';

vi.mock('@/Features/Organizations/Api', () => ({
  getOrganizationStats: vi.fn(),
}));

it('shows an error instead of zero counts and reloads statistics on retry', async () => {
  vi.mocked(getOrganizationStats)
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({
      total_links: 12,
      total_visits: 34,
      unique_visits: 5,
    });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <OrgOverview orgId="org-1" totalMembers={2} />
    </QueryClientProvider>,
  );

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Unable to load organization statistics.',
  );
  expect(screen.queryByText('0')).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

  expect(await screen.findByText('12')).toBeInTheDocument();
  expect(screen.getByText('34')).toBeInTheDocument();
  expect(screen.getByText('5')).toBeInTheDocument();
  await waitFor(() =>
    expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
  );
  expect(getOrganizationStats).toHaveBeenCalledTimes(2);
  expect(getOrganizationStats).toHaveBeenLastCalledWith('org-1');
});
