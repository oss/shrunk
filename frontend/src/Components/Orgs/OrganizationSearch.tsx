import React from 'react';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { Button } from '@/Components/ui/button';
import { Label } from '@/Components/ui/label';
import { Checkbox } from '@/Components/ui/checkbox';
import {
  LinkBooleanFilter,
  LinkDateRange,
  LinkSortControls,
  LinkTypeFilter,
  LinkTextFilterPopover,
  type LinkTextFilters,
} from '@/Components/LinkFilterControls';

export type OrganizationLinkFilters = LinkTextFilters;

export interface OrganizationLinkSearchQuery extends OrganizationLinkFilters {
  roles: Array<'owner' | 'editor' | 'viewer'>;
  showExpiredLinks: boolean;
  showDeletedLinks: boolean;
  showType: 'links' | 'tracking_pixels';
  sort: {
    key: 'relevance' | 'created_time' | 'title' | 'visits';
    order: 'ascending' | 'descending';
  };
  beginTime: Dayjs | null;
  endTime: Dayjs | null;
}

export const DEFAULT_ORGANIZATION_LINK_QUERY: OrganizationLinkSearchQuery = {
  title: '',
  alias: '',
  owner: '',
  url: '',
  roles: ['owner', 'editor', 'viewer'],
  showExpiredLinks: false,
  showDeletedLinks: false,
  showType: 'links',
  sort: { key: 'relevance', order: 'descending' },
  beginTime: null,
  endTime: null,
};

interface Props {
  isAdmin: boolean | undefined;
  query: OrganizationLinkSearchQuery;
  setQuery: React.Dispatch<React.SetStateAction<OrganizationLinkSearchQuery>>;
  filters: OrganizationLinkFilters;
  setFilters: React.Dispatch<React.SetStateAction<OrganizationLinkFilters>>;
  className?: string;
}

const filterKeys: Array<keyof OrganizationLinkFilters> = [
  'title',
  'alias',
  'owner',
  'url',
];
const dashboardLabelClass = 'text-sm font-semibold text-foreground';

export default function OrganizationSearch({
  isAdmin,
  query,
  setQuery,
  filters,
  setFilters,
  className,
}: Props) {
  const roleItems: Array<{
    label: string;
    value: 'owner' | 'editor' | 'viewer';
  }> = [
    { label: 'Owner', value: 'owner' },
    { label: 'Editor', value: 'editor' },
    { label: 'Viewer', value: 'viewer' },
  ];

  const clearFilter = (key: keyof OrganizationLinkFilters) => {
    setFilters((current) => ({ ...current, [key]: '' }));
    setQuery((current) => ({ ...current, [key]: '' }));
  };

  const handleSearch = () => {
    const appliedFilters = {
      title: filters.title.trim(),
      alias: filters.alias.trim(),
      url: filters.url.trim(),
      owner: filters.owner.trim(),
    };
    setFilters(appliedFilters);
    setQuery((current) => ({ ...current, ...appliedFilters }));
    return true;
  };

  const handleRoleToggle = (
    role: 'owner' | 'editor' | 'viewer',
    checked: boolean,
  ) =>
    setQuery((current) => ({
      ...current,
      roles: checked
        ? Array.from(new Set([...current.roles, role]))
        : current.roles.filter((item) => item !== role),
    }));

  const sortLinksByKey = (key: OrganizationLinkSearchQuery['sort']['key']) =>
    setQuery((current) => ({
      ...current,
      sort: { ...current.sort, key },
    }));

  const sortLinkOrder = () => {
    setQuery((current) => ({
      ...current,
      sort: {
        ...current.sort,
        order: current.sort.order === 'ascending' ? 'descending' : 'ascending',
      },
    }));
  };

  const showLinksInRange = (start: Date | undefined, end: Date | undefined) =>
    setQuery((current) => ({
      ...current,
      beginTime: start ? dayjs(start).startOf('day') : null,
      endTime: end ? dayjs(end).endOf('day') : null,
    }));

  const resetFilters = () => {
    setFilters({ title: '', alias: '', owner: '', url: '' });
    setQuery(DEFAULT_ORGANIZATION_LINK_QUERY);
  };

  const beginDate = query.beginTime?.toDate();
  const endDate = query.endTime?.toDate();
  const textFiltersChanged = filterKeys.some(
    (key) => filters[key] !== query[key],
  );

  return (
    <div className={className}>
      <LinkTextFilterPopover
        draft={filters}
        applied={query}
        disabled={!textFiltersChanged}
        ariaLabel="Open organization link filters"
        onDraftChange={setFilters}
        onClear={clearFilter}
        onSearch={handleSearch}
      />

      <div className="space-y-5">
        <div className="space-y-2.5">
          <Label className={dashboardLabelClass}>Links</Label>

          <div className="space-y-2 pl-8">
            {roleItems.map((item) => (
              <label
                key={item.value}
                className="flex min-h-5 cursor-pointer items-center gap-3 text-sm leading-none font-semibold text-foreground"
              >
                <Checkbox
                  aria-label={item.label}
                  className="border-border data-[state=checked]:border-primary"
                  checked={query.roles.includes(item.value)}
                  onCheckedChange={(checked) =>
                    handleRoleToggle(item.value, checked === true)
                  }
                />
                {item.label}
              </label>
            ))}
          </div>
        </div>

        <LinkSortControls
          sortKey={query.sort.key}
          sortOrder={query.sort.order}
          onKeyChange={sortLinksByKey}
          onOrderChange={sortLinkOrder}
        />
        <LinkDateRange
          beginDate={beginDate}
          endDate={endDate}
          onChange={showLinksInRange}
        />

        <div className="flex flex-wrap gap-3">
          <LinkBooleanFilter
            label="Expired Links"
            value={query.showExpiredLinks}
            onChange={(value) =>
              setQuery((current) => ({ ...current, showExpiredLinks: value }))
            }
          />
          <LinkTypeFilter
            value={query.showType}
            onChange={(value) =>
              setQuery((current) => ({ ...current, showType: value }))
            }
          />
        </div>

        {isAdmin && (
          <LinkBooleanFilter
            label="Deleted Links"
            value={query.showDeletedLinks}
            onChange={(value) =>
              setQuery((current) => ({ ...current, showDeletedLinks: value }))
            }
          />
        )}

        <Button
          variant="ghost"
          aria-label="Reset organization link filters"
          onClick={resetFilters}
          className="h-9 bg-primary text-primary-foreground shadow-none hover:bg-primary/80"
        >
          Reset Filters
        </Button>
      </div>
    </div>
  );
}
