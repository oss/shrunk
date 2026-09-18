import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';

import { searchLinks } from '@/Features/Links/Api';
import Dashboard from '@/Features/Links/Dashboard';
import { Link } from '@/Features/Links/Types';

vi.mock('@/Features/Links/Api', () => ({ searchLinks: vi.fn() }));
vi.mock('@/Features/Organizations/Api', () => ({
  getOrganizations: async () => [],
}));
vi.mock('@/App/useSession', () => ({
  useSession: () => ({ netid: 'user', privileges: new Set() }),
}));
vi.mock('@/Features/Links/DashboardSearch', () => ({ default: () => null }));
vi.mock('@/Features/Links/CreateLinkDrawer', () => ({ default: () => null }));
vi.mock('@/Features/Links/BulkLinkActions', () => ({ default: () => null }));
vi.mock('@/Features/Links/LinkCard', () => ({
  default: ({ linkInfo }: { linkInfo: Link }) => <div>{linkInfo.title}</div>,
}));

afterEach(() => vi.unstubAllGlobals());

it('preserves loaded links after a page fails and retries the failed page', async () => {
  let loadMore: () => void = () => {};
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback) {
        loadMore = () =>
          callback(
            [{ isIntersecting: true } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          );
      }
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.mocked(searchLinks)
    .mockResolvedValueOnce({
      count: 2,
      results: [{ _id: '1', title: 'First link' }],
    })
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({
      count: 2,
      results: [{ _id: '2', title: 'Second link' }],
    });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect(await screen.findByText('First link')).toBeInTheDocument();
  act(() => loadMore());
  expect(
    await screen.findByText('Couldn’t load more links.'),
  ).toBeInTheDocument();
  expect(screen.getByText('First link')).toBeInTheDocument();
  expect(screen.queryByText('Unable to load links.')).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

  expect(await screen.findByText('Second link')).toBeInTheDocument();
  expect(screen.getByText('First link')).toBeInTheDocument();
  expect(searchLinks).toHaveBeenLastCalledWith(
    expect.objectContaining({
      pagination: { skip: 1, limit: 10 },
    }),
  );
});
