import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateLinkDrawer from '@/Features/Links/CreateLinkDrawer';
import { createLink } from '@/Features/Links/Api';
import { useFeatureFlags } from '@/App/FeatureFlagsContext';
import {
  serverValidateLongUrl,
  serverValidateDuplicateAlias,
  serverValidateReservedAlias,
} from '@/Shared/Lib/ServerValidators';

vi.mock('@/Features/Links/Api', () => ({
  createLink: vi.fn(),
}));
vi.mock('@/App/FeatureFlagsContext', () => ({
  useFeatureFlags: vi.fn(),
}));
vi.mock('@/Shared/Lib/ServerValidators', () => ({
  serverValidateLongUrl: vi.fn(),
  serverValidateDuplicateAlias: vi.fn(),
  serverValidateReservedAlias: vi.fn(),
}));

const mockedCreateLink = vi.mocked(createLink);
const mockedUseFeatureFlags = vi.mocked(useFeatureFlags);
const mockedServerValidateLongUrl = vi.mocked(serverValidateLongUrl);
const mockedServerValidateDuplicateAlias = vi.mocked(
  serverValidateDuplicateAlias,
);
const mockedServerValidateReservedAlias = vi.mocked(
  serverValidateReservedAlias,
);

const renderDrawer = (
  props: Partial<React.ComponentProps<typeof CreateLinkDrawer>> = {},
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <CreateLinkDrawer
          title="Create Link"
          visible
          onCancel={vi.fn()}
          userPrivileges={new Set()}
          onFinish={vi.fn().mockResolvedValue(undefined)}
          userOrgs={[]}
          {...props}
        />
      </QueryClientProvider>,
    ),
  };
};

describe('CreateLinkDrawer', () => {
  it('submits a plain link with the entered URL, calling createLink and onFinish', async () => {
    mockedUseFeatureFlags.mockReturnValue({
      devLogins: false,
      trackingPixel: false,
      domains: false,
      googleSafeBrowsing: false,
    });
    mockedServerValidateLongUrl.mockResolvedValue(undefined);
    mockedServerValidateDuplicateAlias.mockResolvedValue(undefined);
    mockedServerValidateReservedAlias.mockResolvedValue(undefined);
    mockedCreateLink.mockResolvedValue('new-link-id');

    const onFinish = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderDrawer({ onFinish });

    fireEvent.change(screen.getByLabelText('Original URL'), {
      target: { value: '  https://example.com  ' },
    });

    const createButton = screen.getByRole('button', { name: /create/i });
    // Wait for debounced live validation before submitting.
    await waitFor(() => expect(createButton).not.toBeDisabled());
    await user.click(createButton);

    await waitFor(() => expect(mockedCreateLink).toHaveBeenCalled());

    expect(mockedCreateLink).toHaveBeenCalledWith(
      false,
      'No title provided',
      'https://example.com',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );
    expect(onFinish).toHaveBeenCalled();
    expect(mockedServerValidateLongUrl).toHaveBeenLastCalledWith(
      'https://example.com',
    );
  });

  it('checks a custom alias for duplication once', async () => {
    mockedUseFeatureFlags.mockReturnValue({
      devLogins: false,
      trackingPixel: false,
      domains: false,
      googleSafeBrowsing: false,
    });
    mockedServerValidateLongUrl.mockResolvedValue(undefined);
    mockedServerValidateDuplicateAlias.mockResolvedValue(undefined);
    mockedServerValidateReservedAlias.mockResolvedValue(undefined);
    mockedCreateLink.mockResolvedValue('new-link-id');
    const user = userEvent.setup();

    renderDrawer({ userPrivileges: new Set(['power_user']) });

    fireEvent.change(screen.getByLabelText('Original URL'), {
      target: { value: 'https://example.com' },
    });
    const aliasInput = screen.getByLabelText('New Shortened URL');
    await user.type(aliasInput, 'abc');
    expect(aliasInput).toHaveAttribute('aria-invalid', 'true');
    expect(
      screen.getByText('Custom aliases must be at least 5 characters.'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: /create/i })).toBeDisabled();
    await user.clear(aliasInput);
    await user.type(aliasInput, 'custom');
    const createButton = screen.getByRole('button', { name: /create/i });
    await waitFor(() => expect(createButton).not.toBeDisabled());
    await user.click(createButton);
    await waitFor(() => expect(mockedCreateLink).toHaveBeenCalled());

    expect(mockedServerValidateDuplicateAlias).toHaveBeenCalledTimes(1);
  });

  it('cancels stale live URL validation requests', async () => {
    mockedUseFeatureFlags.mockReturnValue({
      devLogins: false,
      trackingPixel: false,
      domains: false,
      googleSafeBrowsing: false,
    });
    const signals: AbortSignal[] = [];
    mockedServerValidateLongUrl.mockImplementation((_value, signal) => {
      signals.push(signal!);
      return new Promise(() => undefined);
    });

    renderDrawer();
    const input = screen.getByLabelText('Original URL');
    fireEvent.change(input, { target: { value: 'https://first.example' } });
    await waitFor(() => expect(signals).toHaveLength(1));

    fireEvent.change(input, { target: { value: 'https://second.example' } });
    await waitFor(() => expect(signals).toHaveLength(2));

    expect(signals[0].aborted).toBe(true);
  });

  it('invalidates organization links after creating an organization link', async () => {
    mockedUseFeatureFlags.mockReturnValue({
      devLogins: false,
      trackingPixel: false,
      domains: false,
      googleSafeBrowsing: false,
    });
    mockedServerValidateLongUrl.mockResolvedValue(undefined);
    mockedCreateLink.mockResolvedValue('new-link-id');
    const user = userEvent.setup();
    const { queryClient } = renderDrawer({ org_id: 'org-1' });
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    fireEvent.change(screen.getByLabelText('Original URL'), {
      target: { value: 'https://example.com' },
    });
    const createButton = screen.getByRole('button', { name: /create/i });
    await waitFor(() => expect(createButton).not.toBeDisabled());
    await user.click(createButton);

    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['organization-links', 'org-1'],
      }),
    );
  });
});
