import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BulkTransferModal from '@/Features/Links/BulkTransferModal';
import BulkLinkActions from '@/Features/Links/BulkLinkActions';
import { transferLinksBulk } from '@/Features/Links/Api';
import { serverValidateNetId } from '@/Shared/Lib/ServerValidators';
import { getOrganizations } from '@/Features/Organizations/Api';

vi.mock('@/Shared/Lib/ServerValidators', () => ({
  serverValidateNetId: vi.fn(),
}));
vi.mock('@/Features/Organizations/Api', () => ({
  getOrganizations: vi.fn(),
}));
vi.mock('@/Features/Links/Api', () => ({
  addCollaboratorBulk: vi.fn(),
  deleteLinkBulk: vi.fn(),
  transferLinksBulk: vi.fn(),
}));

const mockedServerValidateNetId = vi.mocked(serverValidateNetId);
const mockedGetOrganizations = vi.mocked(getOrganizations);
const mockedTransferLinksBulk = vi.mocked(transferLinksBulk);

describe('BulkTransferModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('validates the NetID and calls onOk with the selected owner on confirm', async () => {
    mockedServerValidateNetId.mockResolvedValue(undefined);
    const onOk = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={new QueryClient()}>
        <BulkTransferModal
          visible
          selectedCount={2}
          onOk={onOk}
          onCancel={vi.fn()}
          allowOrganizations={false}
        />
      </QueryClientProvider>,
    );

    await user.type(screen.getByLabelText('NetID'), 'jsmith');
    await user.click(screen.getByRole('button', { name: /confirm transfer/i }));
    await user.click(screen.getByRole('button', { name: /yes, transfer/i }));

    await waitFor(() => expect(onOk).toHaveBeenCalled());

    expect(mockedServerValidateNetId).toHaveBeenCalledWith('jsmith');
    expect(onOk).toHaveBeenCalledWith({ _id: 'jsmith', type: 'netid' });
  });

  it('shows a retry state when organizations fail to load', async () => {
    mockedGetOrganizations.mockRejectedValue(new Error('offline'));
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BulkTransferModal
          visible
          selectedCount={1}
          onOk={vi.fn()}
          onCancel={vi.fn()}
        />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole('tab', { name: 'Organization' }));

    expect(
      await screen.findByText('Unable to load your organizations.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('transfers the selected links through the bulk action', async () => {
    mockedServerValidateNetId.mockResolvedValue(undefined);
    mockedTransferLinksBulk.mockResolvedValue(undefined);
    const onClear = vi.fn();
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={new QueryClient()}>
        <BulkLinkActions
          selectedIds={['link-1', 'link-2']}
          actorId="owner"
          canCreate
          shareDisabled={false}
          transferDisabled={false}
          deleteDisabled={false}
          allVisibleSelected={false}
          someVisibleSelected
          visibleSelectedCount={2}
          totalVisible={2}
          onToggleVisible={vi.fn()}
          onClear={onClear}
          onRefresh={onRefresh}
        />
      </QueryClientProvider>,
    );

    await user.click(
      screen.getByRole('button', { name: 'Transfer selected links' }),
    );
    await user.type(
      screen.getByRole('textbox', { name: 'NetID' }),
      'new-owner',
    );
    await user.click(screen.getByRole('button', { name: /confirm transfer/i }));
    await user.click(screen.getByRole('button', { name: /yes, transfer/i }));

    await waitFor(() =>
      expect(mockedTransferLinksBulk).toHaveBeenCalledWith(
        ['link-1', 'link-2'],
        { _id: 'new-owner', type: 'netid' },
      ),
    );
    expect(onClear).toHaveBeenCalledOnce();
    expect(onRefresh).toHaveBeenCalledOnce();
  });
});
