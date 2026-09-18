import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ProtectedRoute } from '@/App/ProtectedRoute';
import { useSession } from '@/App/useSession';

vi.mock('@/App/useSession', () => ({
  useSession: vi.fn(),
}));

const mockedUseSession = vi.mocked(useSession);

describe('ProtectedRoute', () => {
  it('renders a fallback while the session is loading', () => {
    mockedUseSession.mockReturnValue({
      netid: '',
      privileges: new Set(),
      isLoading: true,
      motd: '',
      refreshSession: vi.fn(),
      logout: vi.fn(),
    });

    const { container } = render(
      <ProtectedRoute requires="admin">
        <div>secret</div>
      </ProtectedRoute>,
    );

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('redirects when the session lacks the required privilege', () => {
    mockedUseSession.mockReturnValue({
      netid: 'netid',
      privileges: new Set(),
      isLoading: false,
      motd: '',
      refreshSession: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute requires="admin">
          <div>secret</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.queryByText('secret')).not.toBeInTheDocument();
    expect(screen.queryByText('Huh..')).not.toBeInTheDocument();
  });

  it('renders the protected content when the session has the required privilege', () => {
    mockedUseSession.mockReturnValue({
      netid: 'netid',
      privileges: new Set(['admin']),
      isLoading: false,
      motd: '',
      refreshSession: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <ProtectedRoute requires="admin">
        <div>secret</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('secret')).toBeInTheDocument();
  });
});
