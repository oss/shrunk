import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import ErrorPage from '@/Shared/ui/error-page';

it('retries a recoverable error', async () => {
  const onRetry = vi.fn();
  render(
    <ErrorPage
      title="Unable to load"
      description="Please try again later."
      onRetry={onRetry}
    />,
  );

  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

  expect(onRetry).toHaveBeenCalledOnce();
});
