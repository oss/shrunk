import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, it, vi } from 'vitest';
import { useSession } from '@/App/useSession';
import { Routes } from '@/App/Routes';

vi.mock('@/App/useSession', () => ({ useSession: vi.fn() }));
vi.mock('@/Features/Links/Dashboard', () => ({
  default: () => <div>dashboard</div>,
}));
vi.mock('@/App/Pages/LoginPage', () => ({
  default: () => <div>login</div>,
}));
vi.mock('@/Shared/ui/error-page', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

it('waits for the session before rendering a route', () => {
  vi.mocked(useSession).mockReturnValue({
    netid: '',
    privileges: new Set(),
    isLoading: true,
    motd: '',
    refreshSession: vi.fn(),
    logout: vi.fn(),
  });

  const { container } = render(
    <MemoryRouter initialEntries={['/app/dash']}>
      <Routes />
    </MemoryRouter>,
  );

  expect(screen.queryByText('dashboard')).not.toBeInTheDocument();
  expect(container.querySelector('.animate-spin')).toBeInTheDocument();
});

it('redirects before mounting a protected route', async () => {
  vi.mocked(useSession).mockReturnValue({
    netid: '',
    privileges: new Set(),
    isLoading: false,
    motd: '',
    refreshSession: vi.fn(),
    logout: vi.fn(),
  });

  render(
    <MemoryRouter initialEntries={['/app/dash']}>
      <Routes />
    </MemoryRouter>,
  );

  expect(await screen.findByText('login')).toBeInTheDocument();
  expect(screen.queryByText('dashboard')).not.toBeInTheDocument();
});

it('renders not-found for the removed ticket route', async () => {
  vi.mocked(useSession).mockReturnValue({
    netid: 'admin',
    privileges: new Set(['admin']),
    isLoading: false,
    motd: '',
    refreshSession: vi.fn(),
    logout: vi.fn(),
  });

  render(
    <MemoryRouter initialEntries={['/app/tickets/123']}>
      <Routes />
    </MemoryRouter>,
  );

  expect(await screen.findByText('Ooops!')).toBeInTheDocument();
});
