import React from 'react';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { Label } from '@/Shared/ui/label';
import { Checkbox } from '@/Shared/ui/checkbox';
import { type LinkTextFilters } from '@/Shared/LinkFilterControls';
import LinkFilterPanel from '@/Features/Links/LinkFilterPanel';
import {
  type LinkFilterState,
  useLinkFilterTransitions,
} from '@/Features/Links/LinkFilterPanel';

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
  draft: LinkTextFilters;
  onDraftChange: (draft: LinkTextFilters) => void;
  setQuery: React.Dispatch<React.SetStateAction<OrganizationLinkSearchQuery>>;
  className?: string;
}

const dashboardLabelClass = 'text-sm font-semibold text-foreground';

export default function OrganizationSearch({
  isAdmin,
  query,
  draft,
  onDraftChange,
  setQuery,
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

  const filterValue: LinkFilterState = {
    text: {
      title: query.title,
      alias: query.alias,
      owner: query.owner,
      url: query.url,
    },
    sortKey: query.sort.key,
    sortOrder: query.sort.order,
    beginDate: query.beginTime?.toDate(),
    endDate: query.endTime?.toDate(),
    showExpired: query.showExpiredLinks,
    showDeleted: query.showDeletedLinks,
    showType: query.showType,
  };
  const transitions = useLinkFilterTransitions({
    value: filterValue,
    draft,
    defaults: {
      text: { title: '', alias: '', owner: '', url: '' },
      sortKey: DEFAULT_ORGANIZATION_LINK_QUERY.sort.key,
      sortOrder: DEFAULT_ORGANIZATION_LINK_QUERY.sort.order,
      beginDate: undefined,
      endDate: undefined,
      showExpired: false,
      showDeleted: false,
      showType: 'links',
    },
    onDraftChange,
    onReset: () => setQuery(DEFAULT_ORGANIZATION_LINK_QUERY),
    onChange: (next) =>
      setQuery((current) => ({
        ...current,
        ...next.text,
        sort: { key: next.sortKey, order: next.sortOrder },
        beginTime: next.beginDate ? dayjs(next.beginDate).startOf('day') : null,
        endTime: next.endDate ? dayjs(next.endDate).endOf('day') : null,
        showExpiredLinks: next.showExpired,
        showDeletedLinks: next.showDeleted,
        showType: next.showType,
      })),
  });

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

  return (
    <LinkFilterPanel
      className={className}
      draft={transitions.draft}
      applied={transitions.applied}
      searchDisabled={transitions.searchDisabled}
      ownerDisabled={false}
      ariaLabel="Open organization link filters"
      onDraftChange={transitions.onDraftChange}
      onClear={transitions.onClear}
      onSearch={transitions.onSearch}
      sortKey={filterValue.sortKey}
      sortOrder={filterValue.sortOrder}
      onSortKeyChange={transitions.onSortKeyChange}
      onSortOrderChange={transitions.onSortOrderChange}
      beginDate={filterValue.beginDate}
      endDate={filterValue.endDate}
      onDateChange={transitions.onDateChange}
      showExpired={filterValue.showExpired}
      onShowExpiredChange={transitions.onShowExpiredChange}
      showType={filterValue.showType}
      onShowTypeChange={transitions.onShowTypeChange}
      showDeleted={filterValue.showDeleted}
      onShowDeletedChange={
        isAdmin ? transitions.onShowDeletedChange : undefined
      }
      resetAriaLabel="Reset organization link filters"
      onReset={transitions.onReset}
    >
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
    </LinkFilterPanel>
  );
}
