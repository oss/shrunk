import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { LinkTextFilterPopover } from '@/Shared/LinkFilterControls';

const filters = { title: '', alias: '', owner: '', url: '' };

it('connects the filter trigger to its popover content', () => {
  render(
    <LinkTextFilterPopover
      draft={filters}
      applied={filters}
      disabled={false}
      ownerDisabled={false}
      ariaLabel="Open link filters"
      onDraftChange={vi.fn()}
      onClear={vi.fn()}
      onSearch={vi.fn()}
    />,
  );

  const trigger = screen.getByRole('button', { name: 'Open link filters' });
  fireEvent.click(trigger);

  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  expect(trigger).not.toHaveAttribute('aria-controls');
  expect(
    document.querySelector('[aria-label="Link search filters"]'),
  ).toBeInTheDocument();
});
