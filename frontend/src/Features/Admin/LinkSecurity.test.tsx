import { afterEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LinkSecurity from '@/Features/Admin/LinkSecurity';

afterEach(() => vi.restoreAllMocks());

it.each([
  ['netid', 'DEV_USER', 'Owner NetID', 'Approve', 'promote'],
  ['org', 'organization-id', 'Owner organization', 'Deny', 'reject'],
])(
  'displays a %s owner and completes review',
  async (type, id, label, action, endpoint) => {
    let reviewed = false;
    const fetch = vi.fn(
      async (input: RequestInfo | URL, options?: RequestInit) => {
        const url = String(input);
        if (url.endsWith('/security/status')) return new Response('ON');
        if (url.endsWith(`/security/${endpoint}/pending-id`)) {
          expect(options?.method).toBe('PATCH');
          reviewed = true;
          return Response.json({});
        }
        if (url.endsWith('/security/pending_links')) {
          return Response.json({
            pendingLinks: reviewed
              ? []
              : [
                  {
                    _id: 'pending-id',
                    title: 'Review this link',
                    long_url: 'https://unsafe.example.test',
                    owner: { _id: id, type },
                  },
                ],
          });
        }
        throw new Error(`Unexpected request: ${url}`);
      },
    );
    vi.stubGlobal('fetch', fetch);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={queryClient}>
        <LinkSecurity />
      </QueryClientProvider>,
    );
    expect(await screen.findByText(`${label}: ${id}`)).toBeVisible();
    expect(
      screen.queryByText('Unable to load pending links.'),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: action }));
    await user.click(screen.getByRole('button', { name: action }));
    await waitFor(() =>
      expect(screen.queryByText('Review this link')).not.toBeInTheDocument(),
    );
    expect(fetch).toHaveBeenCalledWith(
      `/api/core/security/${endpoint}/pending-id`,
      expect.objectContaining({ method: 'PATCH' }),
    );
    queryClient.clear();
    vi.unstubAllGlobals();
  },
);
