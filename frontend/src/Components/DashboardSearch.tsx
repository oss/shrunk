import React, { useState } from 'react';
import { ChevronRightIcon, ChevronDownIcon } from 'lucide-react';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { SearchQuery, SearchSet, DEFAULT_QUERY } from '../Interfaces/Link';
import { Organization } from '../Interfaces/Organizations';
import { serverValidateNetId } from '../Api/Validators';
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
  type LinkSortKey,
} from '@/Components/LinkFilterControls';

type Filters = LinkTextFilters;

interface Props {
  query: SearchQuery;
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  setNewQuery: (query: SearchQuery) => void;
  userOrgs: Organization[] | null;
  userPrivileges: Set<string>;
  className?: string;
}

const dashboardLabelClass = 'text-sm font-semibold text-foreground';

export default function DashboardSearch({
  query,
  userOrgs,
  filters,
  setFilters,
  setNewQuery,
  userPrivileges,
  className,
}: Props) {
  const [orgsExpanded, setOrgsExpanded] = useState(false);

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

  const sortByType = (key: 'links' | 'tracking_pixels') =>
    setNewQuery({ ...query, showType: key });

  const handleSearch = async () => {
    if (filters.owner.length > 0) {
      try {
        await serverValidateNetId(filters.owner);
      } catch {
        toast.warning('Invalid net ID!', {
          description: 'There are no users found with the entered net ID',
        });
        return false;
      }
    }

    setNewQuery({
      ...query,
      title: filters.title,
      alias: filters.alias,
      url: filters.url,
      owner: filters.owner,
    });
    return true;
  };

  const showLinksInRange = (start: Date | undefined, end: Date | undefined) =>
    setNewQuery({
      ...query,
      begin_time: start ? dayjs(start) : null,
      end_time: end ? dayjs(end) : null,
    });

  const sortLinkOrder = () => {
    const order = query.sort.order === 'ascending' ? 'descending' : 'ascending';
    setNewQuery({ ...query, sort: { ...query.sort, order } });
  };

  const showExpiredLinks = (show: boolean) =>
    setNewQuery({ ...query, show_expired_links: show });

  const showDeletedLinks = (show: boolean) =>
    setNewQuery({ ...query, show_deleted_links: show });

  const clearFilter = (key: keyof Filters) => {
    setFilters((current) => ({ ...current, [key]: '' }));
    setNewQuery({ ...query, [key]: '' });
  };

  const sortLinksByKey = (key: string) =>
    setNewQuery({ ...query, sort: { ...query.sort, key } });

  const resetFilters = () => {
    setFilters({ title: '', alias: '', url: '', owner: '' });
    setNewQuery(DEFAULT_QUERY);
  };

  const beginDate = query.begin_time
    ? (query.begin_time as Dayjs).toDate()
    : undefined;
  const endDate = query.end_time
    ? (query.end_time as Dayjs).toDate()
    : undefined;

  return (
    <div className={className}>
      <LinkTextFilterPopover
        draft={filters}
        applied={filters}
        disabled={Object.values(filters).every((value) => value.length === 0)}
        ownerDisabled={selectedSets.includes('user')}
        ariaLabel="Open link filters"
        onDraftChange={setFilters}
        onClear={clearFilter}
        onSearch={handleSearch}
      />

      <div className="space-y-5">
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

        <LinkSortControls
          sortKey={query.sort.key as LinkSortKey}
          sortOrder={query.sort.order as 'ascending' | 'descending'}
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
            value={query.show_expired_links}
            onChange={showExpiredLinks}
          />
          <LinkTypeFilter value={query.showType} onChange={sortByType} />
        </div>

        {userPrivileges.has('admin') && (
          <LinkBooleanFilter
            label="Deleted Links"
            value={query.show_deleted_links}
            onChange={showDeletedLinks}
          />
        )}

        <Button
          variant="ghost"
          aria-label="Reset link filters"
          onClick={resetFilters}
          className="h-9 bg-primary text-primary-foreground shadow-none hover:bg-primary/80"
        >
          Reset Filters
        </Button>
      </div>
    </div>
  );
}
