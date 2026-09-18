import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EndpointCard } from '@/Features/ApiReference/EndpointCard';
import { getEndpoints } from '@/Features/ApiReference/Endpoints';

const endpoints = getEndpoints(
  'https://example.test/api/v1',
  'https://example.test/api/core/link',
);
const usersGet = endpoints.find((endpoint) => endpoint.key === 'users-get')!;
const bulkShare = endpoints.find(
  (endpoint) => endpoint.key === 'links-bulk-share',
)!;

describe('EndpointCard', () => {
  it('renders a simple GET endpoint: heading, summary, request/response code, and parameters', () => {
    render(<EndpointCard endpoint={usersGet} />);

    expect(
      screen.getByRole('heading', { name: 'List all Users' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Returns all the Users registered on Shrunk'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/curl https:\/\/example\.test\/api\/v1\/users/),
    ).toBeInTheDocument();
    expect(screen.getByText('roles')).toBeInTheDocument();
    expect(screen.getByText('filter')).toBeInTheDocument();
  });

  it('renders the bulk-share endpoint: success/error examples and per-action parameters', () => {
    render(<EndpointCard endpoint={bulkShare} />);

    expect(
      screen.getByRole('heading', { name: 'Share Links in Bulk' }),
    ).toBeInTheDocument();
    expect(screen.getByText('204 No Content')).toBeInTheDocument();
    expect(screen.getByText(/HTTP 403/)).toBeInTheDocument();
    // "link_ids" legitimately appears twice: the parameter row and the
    // trailing "malformed requests" note both reference it.
    expect(screen.getAllByText('link_ids').length).toBeGreaterThan(0);
    expect(screen.getByText('entry')).toBeInTheDocument();
  });
});
