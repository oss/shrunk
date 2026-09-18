import { ReactNode } from 'react';
import { Button } from '@/Shared/ui/button';
import {
  LinkBooleanFilter,
  LinkDateRange,
  LinkSortControls,
  LinkTextFilterPopover,
  LinkTypeFilter,
  type LinkSortKey,
  type LinkTextFilters,
} from '@/Shared/LinkFilterControls';

interface Props {
  children: ReactNode;
  draft: LinkTextFilters;
  applied: LinkTextFilters;
  searchDisabled: boolean;
  ownerDisabled: boolean;
  ariaLabel: string;
  onDraftChange: (filters: LinkTextFilters) => void;
  onClear: (key: keyof LinkTextFilters) => void;
  onSearch: () => boolean | Promise<boolean>;
  sortKey: LinkSortKey;
  sortOrder: 'ascending' | 'descending';
  onSortKeyChange: (key: LinkSortKey) => void;
  onSortOrderChange: () => void;
  beginDate?: Date;
  endDate?: Date;
  onDateChange: (start?: Date, end?: Date) => void;
  showExpired: boolean;
  onShowExpiredChange: (show: boolean) => void;
  showType: 'links' | 'tracking_pixels';
  onShowTypeChange: (type: 'links' | 'tracking_pixels') => void;
  showDeleted?: boolean;
  onShowDeletedChange?: (show: boolean) => void;
  resetAriaLabel: string;
  onReset: () => void;
  className?: string;
}

export interface LinkFilterState {
  text: LinkTextFilters;
  sortKey: LinkSortKey;
  sortOrder: 'ascending' | 'descending';
  beginDate?: Date;
  endDate?: Date;
  showExpired: boolean;
  showDeleted: boolean;
  showType: 'links' | 'tracking_pixels';
}

export function useLinkFilterTransitions({
  value,
  draft,
  defaults,
  onChange,
  onDraftChange,
  onReset,
  validateOwner,
}: {
  value: LinkFilterState;
  draft: LinkTextFilters;
  defaults: LinkFilterState;
  onChange: (value: LinkFilterState) => void;
  onDraftChange: (value: LinkTextFilters) => void;
  onReset: () => void;
  validateOwner?: (owner: string) => Promise<boolean>;
}) {
  const update = (change: Partial<LinkFilterState>) =>
    onChange({ ...value, ...change });

  return {
    draft,
    applied: value.text,
    searchDisabled: (Object.keys(draft) as Array<keyof LinkTextFilters>).every(
      (key) => draft[key] === value.text[key],
    ),
    onDraftChange,
    onClear: (key: keyof LinkTextFilters) => {
      const text = { ...value.text, [key]: '' };
      onDraftChange({ ...draft, [key]: '' });
      update({ text });
    },
    onSearch: async () => {
      const text = Object.fromEntries(
        Object.entries(draft).map(([key, textValue]) => [
          key,
          textValue.trim(),
        ]),
      ) as unknown as LinkTextFilters;
      if (validateOwner && !(await validateOwner(text.owner))) return false;
      onDraftChange(text);
      update({ text });
      return true;
    },
    onSortKeyChange: (sortKey: LinkSortKey) => update({ sortKey }),
    onSortOrderChange: () =>
      update({
        sortOrder: value.sortOrder === 'ascending' ? 'descending' : 'ascending',
      }),
    onDateChange: (beginDate?: Date, endDate?: Date) =>
      update({ beginDate, endDate }),
    onShowExpiredChange: (showExpired: boolean) => update({ showExpired }),
    onShowDeletedChange: (showDeleted: boolean) => update({ showDeleted }),
    onShowTypeChange: (showType: 'links' | 'tracking_pixels') =>
      update({ showType }),
    onReset: () => {
      onDraftChange(defaults.text);
      onReset();
    },
  };
}

export default function LinkFilterPanel({
  children,
  draft,
  applied,
  searchDisabled,
  ownerDisabled,
  ariaLabel,
  onDraftChange,
  onClear,
  onSearch,
  sortKey,
  sortOrder,
  onSortKeyChange,
  onSortOrderChange,
  beginDate,
  endDate,
  onDateChange,
  showExpired,
  onShowExpiredChange,
  showType,
  onShowTypeChange,
  showDeleted,
  onShowDeletedChange,
  resetAriaLabel,
  onReset,
  className,
}: Props) {
  return (
    <div className={className}>
      <LinkTextFilterPopover
        draft={draft}
        applied={applied}
        disabled={searchDisabled}
        ownerDisabled={ownerDisabled}
        ariaLabel={ariaLabel}
        onDraftChange={onDraftChange}
        onClear={onClear}
        onSearch={onSearch}
      />

      <div className="space-y-5">
        {children}
        <LinkSortControls
          sortKey={sortKey}
          sortOrder={sortOrder}
          onKeyChange={onSortKeyChange}
          onOrderChange={onSortOrderChange}
        />
        <LinkDateRange
          beginDate={beginDate}
          endDate={endDate}
          onChange={onDateChange}
        />
        <div className="flex flex-wrap gap-3">
          <LinkBooleanFilter
            label="Expired Links"
            value={showExpired}
            onChange={onShowExpiredChange}
          />
          <LinkTypeFilter value={showType} onChange={onShowTypeChange} />
        </div>
        {onShowDeletedChange && (
          <LinkBooleanFilter
            label="Deleted Links"
            value={showDeleted ?? false}
            onChange={onShowDeletedChange}
          />
        )}
        <Button
          variant="ghost"
          aria-label={resetAriaLabel}
          onClick={onReset}
          className="h-9 cursor-pointer bg-primary text-primary-foreground shadow-none hover:bg-primary/80"
        >
          Reset Filters
        </Button>
      </div>
    </div>
  );
}
