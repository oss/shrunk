import { expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CollaboratorModal from '@/Shared/CollaboratorModal';
import { serverValidateNetId } from '@/Shared/Lib/ServerValidators';

vi.mock('@/Shared/Lib/ServerValidators', () => ({
  serverValidateGuest: vi.fn(),
  serverValidateNetId: vi.fn(),
}));

it('retains collaborator input when the add mutation fails', async () => {
  vi.mocked(serverValidateNetId).mockResolvedValue(undefined);
  const onAddEntity = vi.fn().mockRejectedValue(new Error('offline'));
  const user = userEvent.setup();

  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <CollaboratorModal
          visible
          people={[]}
          _id="owner"
          roles={[
            { value: 'owner', label: 'Owner' },
            { value: 'viewer', label: 'Viewer' },
          ]}
          canCreate
          onlyActiveTab="netid"
          onAddEntity={onAddEntity}
          onChangeEntity={vi.fn()}
          onRemoveEntity={vi.fn()}
          onOk={vi.fn()}
          onCancel={vi.fn()}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  const input = screen.getByLabelText('Collaborator NetID');
  await user.type(input, 'jsmith');
  await user.click(screen.getByRole('button', { name: 'Add' }));

  await waitFor(() => expect(onAddEntity).toHaveBeenCalled());
  expect(input).toHaveValue('jsmith');
  expect(await screen.findByText('Unable to add collaborator.')).toBeVisible();
});
