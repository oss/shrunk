import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import { EditLinkDrawer } from './EditLinkDrawer';
import { isValidAlias, reverLinkExpirationDate } from './Api';
import { Link } from './Types';
import { serverValidateLongUrl } from '@/Shared/Lib/ServerValidators';

vi.mock('./Api', () => ({
  deleteLink: vi.fn(),
  isValidAlias: vi.fn(),
  reverLinkExpirationDate: vi.fn(),
}));
vi.mock('@/Shared/Lib/ServerValidators', () => ({
  serverValidateLongUrl: vi.fn().mockResolvedValue(undefined),
}));

const expiredLink: Link = {
  _id: 'expired-link',
  alias: 'expired-link',
  title: 'An expired event',
  long_url: 'https://example.com/',
  domain: '',
  owner: { _id: 'owner', type: 'netid' },
  created_time: new Date('2025-01-01T00:00:00Z'),
  expiration_time: new Date('2025-02-01T00:00:00Z'),
  is_expired: true,
  deletion_info: null,
  visits: 0,
  unique_visits: 0,
  may_edit: true,
  is_tracking_pixel_link: false,
  editors: [],
  viewers: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isValidAlias).mockResolvedValue(false);
});

function openDrawer() {
  const onOk = vi.fn().mockResolvedValue(undefined);
  const onRestored = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <EditLinkDrawer
          visible
          netid="owner"
          userPrivileges={new Set(['power_user'])}
          linkInfo={expiredLink}
          onOk={onOk}
          onRestored={onRestored}
          onCancel={vi.fn()}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { onOk, onRestored };
}

it('clears the restored expiry without discarding edits, so Save cannot expire it again', async () => {
  vi.mocked(reverLinkExpirationDate).mockResolvedValue(undefined);
  const { onOk, onRestored } = openDrawer();
  fireEvent.change(screen.getByLabelText('Title'), {
    target: { value: 'Updated event' },
  });
  await userEvent.click(screen.getByRole('button', { name: 'Restore' }));
  await waitFor(() => expect(onRestored).toHaveBeenCalledOnce());
  expect(
    screen.getByLabelText('Expiration time', { selector: 'button' }),
  ).toHaveTextContent('Pick a date');
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() =>
    expect(onOk).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Updated event',
        expiration_time: null,
      }),
    ),
  );
});

it('blocks Save during restore and preserves the expiry when restore fails', async () => {
  let rejectRestore: (error: Error) => void = () => {};
  vi.mocked(reverLinkExpirationDate).mockReturnValue(
    new Promise((_resolve, reject) => {
      rejectRestore = reject;
    }),
  );
  const { onOk, onRestored } = openDrawer();
  const expiry = screen.getByLabelText('Expiration time', {
    selector: 'button',
  }).textContent;
  await userEvent.click(screen.getByRole('button', { name: 'Restore' }));
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Restoring…' })).toBeDisabled();
  rejectRestore(new Error('offline'));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled(),
  );
  expect(onRestored).not.toHaveBeenCalled();
  expect(
    screen.getByLabelText('Expiration time', { selector: 'button' }),
  ).toHaveTextContent(expiry!);
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(onOk).toHaveBeenCalled());
  expect(onOk.mock.calls[0][0].expiration_time.toISOString()).toBe(
    expiredLink.expiration_time!.toISOString(),
  );
});

it('blocks Restore while a save is validating its URL', async () => {
  let resolveValidation: () => void = () => {};
  vi.mocked(serverValidateLongUrl).mockReturnValueOnce(
    new Promise<void>((resolve) => {
      resolveValidation = resolve;
    }),
  );
  const { onOk } = openDrawer();
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByRole('button', { name: 'Restore' })).toBeDisabled();
  resolveValidation();
  await waitFor(() => expect(onOk).toHaveBeenCalled());
});
