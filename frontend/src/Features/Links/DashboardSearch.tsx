import { useState } from 'react';
import { ChevronRightIcon, ChevronDownIcon } from 'lucide-react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { SearchQuery, SearchSet, DEFAULT_QUERY } from '@/Features/Links/Types';
import { Organization } from '@/Features/Organizations/Types';
import { serverValidateNetId } from '@/Shared/Lib/ServerValidators';
import { Label } from '@/Shared/ui/label';
import { Checkbox } from '@/Shared/ui/checkbox';
import {
  type LinkSortKey,
  type LinkTextFilters,
} from '@/Shared/LinkFilterControls';
import LinkFilterPanel, {
  type LinkFilterState,
  useLinkFilterTransitions,
} from '@/Features/Links/LinkFilterPanel';

interface Props {
  query: SearchQuery;
  draft: LinkTextFilters;
  onDraftChange: (draft: LinkTextFilters) => void;
  setNewQuery: (query: SearchQuery) => void;
  userOrgs: Organization[] | null;
  userPrivileges: Set<string>;
  className?: string;
}

const dashboardLabelClass = 'text-sm font-semibold text-foreground';

export default function DashboardSearch({
  query,
  draft,
  onDraftChange,
  userOrgs,
  setNewQuery,
  userPrivileges,
  className,
}: Props) {
  const [orgsExpanded, setOrgsExpanded] = useState(false);
  const filterValue: LinkFilterState = {
    text: {
      title: query.title,
      alias: query.alias,
      owner: query.owner ?? '',
      url: query.url,
    },
    sortKey: query.sort.key as LinkSortKey,
    sortOrder: query.sort.order as 'ascending' | 'descending',
    beginDate: query.begin_time?.toDate(),
    endDate: query.end_time?.toDate(),
    showExpired: query.show_expired_links,
    showDeleted: query.show_deleted_links,
    showType: query.showType,
  };
  const defaultFilterValue: LinkFilterState = {
    text: { title: '', alias: '', owner: '', url: '' },
    sortKey: DEFAULT_QUERY.sort.key as LinkSortKey,
    sortOrder: DEFAULT_QUERY.sort.order as 'ascending' | 'descending',
    beginDate: undefined,
    endDate: undefined,
    showExpired: DEFAULT_QUERY.show_expired_links,
    showDeleted: DEFAULT_QUERY.show_deleted_links,
    showType: DEFAULT_QUERY.showType,
  };
  const transitions = useLinkFilterTransitions({
    value: filterValue,
    draft,
    defaults: defaultFilterValue,
    onDraftChange,
    onReset: () => setNewQuery(DEFAULT_QUERY),
    validateOwner: async (owner) => {
      if (!owner) return true;
      try {
        await serverValidateNetId(owner);
        return true;
      } catch {
        toast.warning('Invalid net ID!', {
          description: 'There are no users found with the entered net ID',
        });
        return false;
      }
    },
    onChange: (next) =>
      setNewQuery({
        ...query,
        ...next.text,
        sort: { key: next.sortKey, order: next.sortOrder },
        begin_time: next.beginDate ? dayjs(next.beginDate) : null,
        end_time: next.endDate ? dayjs(next.endDate) : null,
        show_expired_links: next.showExpired,
        show_deleted_links: next.showDeleted,
        showType: next.showType,
      }),
  });

  const treeItems: { key: string; label: string; value: string }[] = [
    { key: '0-0', label: 'My Links', value: 'user' },
    { key: '0-1', label: 'Shared with Me', value: 'shared' },
  ];
  if (userPrivileges.has('admin')) {
    treeItems.push({ key: '0-3', label: 'All Links', value: 'all' });
  }

  const orgChildren: { key: string; label: string; value: string }[] =
    !userOrgs || userOrgs.length === 0
      ? []
      : userOrgs.map((org, idx) => ({
          key: `0-2-${idx}`,
          label: org.name,
          value: `org_${org.id}`,
        }));

  const selectedSets = query.set.map((searchSet) =>
    searchSet.set === 'org' ? `org_${searchSet.org}` : searchSet.set,
  );
  const allOrgValues = orgChildren.map((child) => child.value);
  const allOrganizationsSelected =
    allOrgValues.length > 0 &&
    allOrgValues.every((value) => selectedSets.includes(value));

  const handleSetToggle = (value: string, checked: boolean) => {
    let newSelected: string[];

    if (value === 'organization') {
      if (checked) {
        newSelected = Array.from(new Set([...selectedSets, ...allOrgValues]));
      } else {
        newSelected = selectedSets.filter((v) => !v.startsWith('org_'));
      }
    } else if (checked) {
      newSelected =
        value === 'all'
          ? ['all']
          : [...selectedSets.filter((v) => v !== 'all'), value];
    } else {
      newSelected = selectedSets.filter((v) => v !== value);
    }

    const normalizedSets = newSelected.includes('all')
      ? [{ set: 'all' as const }]
      : newSelected.map((v) =>
          v.startsWith('org_')
            ? ({ set: 'org', org: v.slice(4) } as SearchSet)
            : ({ set: v as 'user' | 'shared' } as SearchSet),
        );

    setNewQuery({ ...query, set: normalizedSets });
  };

  return (
    <LinkFilterPanel
      className={className}
      draft={transitions.draft}
      applied={transitions.applied}
      searchDisabled={transitions.searchDisabled}
      ownerDisabled={selectedSets.includes('user')}
      ariaLabel="Open link filters"
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
        userPrivileges.has('admin')
          ? transitions.onShowDeletedChange
          : undefined
      }
      resetAriaLabel="Reset link filters"
      onReset={transitions.onReset}
    >
      <div className="space-y-2.5">
        <Label className={dashboardLabelClass}>Links</Label>

        <div className="space-y-2 pl-8">
          {treeItems.map((item) => (
            <label
              key={item.key}
              className="flex min-h-5 cursor-pointer items-center gap-3 text-sm leading-none font-semibold text-foreground"
            >
              <Checkbox
                aria-label={item.label}
                className="border-border data-[state=checked]:border-primary"
                checked={selectedSets.includes(item.value)}
                onCheckedChange={(checked) =>
                  handleSetToggle(item.value, checked === true)
                }
              />
              {item.label}
            </label>
          ))}

          {orgChildren.length > 0 ? (
            <div>
              <div className="-ml-5 flex min-h-5 items-center gap-1">
                <button
                  type="button"
                  aria-label={`${orgsExpanded ? 'Collapse' : 'Expand'} organization links`}
                  aria-expanded={orgsExpanded}
                  className="flex size-4 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
                  onClick={() => setOrgsExpanded(!orgsExpanded)}
                >
                  {orgsExpanded ? (
                    <ChevronDownIcon className="size-3" />
                  ) : (
                    <ChevronRightIcon className="size-3" />
                  )}
                </button>

                <label
                  htmlFor="dashboard-organization-links-filter"
                  className="flex cursor-pointer items-center gap-3 text-sm leading-none font-semibold text-foreground"
                >
                  <Checkbox
                    aria-label="Organization Links"
                    className="border-border data-[state=checked]:border-primary"
                    checked={allOrganizationsSelected}
                    onCheckedChange={(checked) =>
                      handleSetToggle('organization', checked === true)
                    }
                  />
                  Organization Links
                </label>
              </div>

              {orgsExpanded && (
                <div className="mt-2 space-y-2 pl-7">
                  {orgChildren.map((child) => (
                    <label
                      key={child.key}
                      className="flex min-h-5 cursor-pointer items-center gap-3 text-sm leading-none font-semibold text-foreground"
                    >
                      <Checkbox
                        aria-label={child.label}
                        className="border-border data-[state=checked]:border-primary"
                        checked={selectedSets.includes(child.value)}
                        onCheckedChange={(checked) =>
                          handleSetToggle(child.value, checked === true)
                        }
                      />
                      {child.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <span className="block text-sm font-semibold text-muted-foreground">
              Organization Links
            </span>
          )}
        </div>
      </div>
    </LinkFilterPanel>
  );
}
