import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  XIcon,
  SearchIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CalendarIcon,
} from 'lucide-react';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { SearchQuery, SearchSet, DEFAULT_QUERY } from '../interfaces/link';
import { Organization } from '../interfaces/organizations';
import { serverValidateNetId } from '../api/validators';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Filters {
  title: string;
  alias: string;
  owner: string;
  url: string;
}

interface Props {
  query: SearchQuery;
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  setNewQuery: (query: SearchQuery) => void;
  userOrgs: Organization[] | null;
  userPrivileges: Set<string>;
  className?: string;
}

const filterKeys: Array<keyof Filters> = ['title', 'alias', 'owner', 'url'];
const dashboardControlBorderClass =
  'border border-border bg-muted text-foreground shadow-none hover:bg-accent hover:text-foreground';
const inactiveDashboardButtonClass =
  'border border-border bg-muted text-foreground shadow-none hover:bg-accent hover:text-foreground';
const activeDashboardButtonClass =
  'border border-primary bg-primary text-primary-foreground shadow-none hover:bg-primary/90 hover:text-primary-foreground';
const dashboardSegmentButtonClass = 'h-8 min-w-fit px-3 text-sm font-semibold';
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
  const [sortOrder, setSortOrder] = useState<'ascending' | 'descending'>(
    'descending',
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const [orgsExpanded, setOrgsExpanded] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const aliasInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const ownerInputRef = useRef<HTMLInputElement>(null);

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

  const handleSetToggle = useCallback(
    (value: string, checked: boolean) => {
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
    },
    [allOrgValues, query, selectedSets, setNewQuery],
  );

  const sortByType = useCallback(
    (key: 'links' | 'tracking_pixels') => {
      setNewQuery({ ...query, showType: key });
    },
    [query, setNewQuery],
  );

  const handleSearch = useCallback(async () => {
    if (filters.owner.length > 0) {
      try {
        await serverValidateNetId({}, filters.owner);
      } catch {
        toast.warning('Invalid net ID!', {
          description: 'There are no users found with the entered net ID',
        });
        return;
      }
    }

    setNewQuery({
      ...query,
      title: filters.title,
      alias: filters.alias,
      url: filters.url,
      owner: filters.owner,
    });
  }, [query, filters, setNewQuery]);

  const showLinksInRange = useCallback(
    (start: Date | undefined, end: Date | undefined) => {
      const startDayjs = start ? dayjs(start) : null;
      const endDayjs = end ? dayjs(end) : null;
      setNewQuery({
        ...query,
        begin_time: startDayjs,
        end_time: endDayjs,
      });
    },
    [query, setNewQuery],
  );

  const sortLinkOrder = useCallback(() => {
    const order = sortOrder === 'ascending' ? 'descending' : 'ascending';
    setSortOrder(order);
    setNewQuery({ ...query, sort: { ...query.sort, order } });
  }, [sortOrder, query, setNewQuery]);

  const showExpiredLinks = useCallback(
    (show: boolean) => {
      setNewQuery({ ...query, show_expired_links: show });
    },
    [query, setNewQuery],
  );

  const showDeletedLinks = useCallback(
    (show: boolean) => {
      setNewQuery({ ...query, show_deleted_links: show });
    },
    [query, setNewQuery],
  );

  const clearFilter = useCallback(
    (key: keyof Filters) => {
      setFilters((f) => ({ ...f, [key]: '' }));
      setNewQuery({ ...query, [key]: '' });
    },
    [query, setFilters, setNewQuery],
  );

  const sortLinksByKey = useCallback(
    (key: string) => {
      setNewQuery({ ...query, sort: { ...query.sort, key } });
    },
    [query, setNewQuery],
  );

  useEffect(() => {
    setSortOrder(query.sort.order as 'ascending' | 'descending');
  }, [query.sort.order]);

  const resetFilters = useCallback(() => {
    setFilters({ title: '', alias: '', url: '', owner: '' });
    setSortOrder('descending');
    setNewQuery(DEFAULT_QUERY);
  }, [setFilters, setNewQuery]);

  const activeFilterKeys = filterKeys.filter((k) => filters[k].length > 0);
  const activeFilterCount = activeFilterKeys.length;

  const beginDate = query.begin_time
    ? (query.begin_time as Dayjs).toDate()
    : undefined;
  const endDate = query.end_time
    ? (query.end_time as Dayjs).toDate()
    : undefined;

  const renderDatePicker = (
    label: string,
    selectedDate: Date | undefined,
    onSelect: (date: Date | undefined) => void,
  ) => (
    <div className="min-w-[9.5rem] flex-1">
      <Popover>
        <div className="flex">
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={`h-9 min-w-0 flex-1 justify-start px-3 text-left font-normal ${selectedDate ? 'rounded-r-none' : ''} ${dashboardControlBorderClass}`}
            >
              <CalendarIcon className="size-4" />
              <span
                className={
                  selectedDate ? 'truncate' : 'truncate text-muted-foreground'
                }
              >
                {selectedDate
                  ? dayjs(selectedDate).format('YYYY-MM-DD')
                  : label}
              </span>
            </Button>
          </PopoverTrigger>
          {selectedDate && (
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label={`Clear ${label.toLowerCase()}`}
              className={`h-9 w-9 rounded-l-none border-l-0 px-0 ${dashboardControlBorderClass}`}
              onClick={() => onSelect(undefined)}
            >
              <XIcon />
            </Button>
          )}
        </div>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={onSelect}
            defaultMonth={selectedDate}
          />
        </PopoverContent>
      </Popover>
    </div>
  );

  return (
    <div className={className}>
      <Popover open={filterOpen} onOpenChange={setFilterOpen}>
        <div className="mb-3 flex w-full items-stretch">
          <PopoverTrigger asChild>
            <div
              role="button"
              tabIndex={0}
              className={`flex min-h-11 min-w-0 flex-1 cursor-pointer flex-wrap items-center gap-1 rounded-md rounded-r-none px-4 py-2 text-left text-base font-normal text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring ${dashboardControlBorderClass}`}
            >
              {activeFilterCount === 0 ? (
                <span>Click to search</span>
              ) : (
                activeFilterKeys.map((key) => (
                  <Badge
                    key={key}
                    variant="secondary"
                    className="max-w-full gap-1 border border-border bg-background px-2 py-0.5 text-foreground"
                  >
                    <span className="max-w-[14rem] truncate">
                      {key}: {filters[key]}
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Clear ${key} filter`}
                      className="h-5 w-5 shrink-0"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        clearFilter(key);
                      }}
                    >
                      <XIcon />
                    </Button>
                  </Badge>
                ))
              )}
            </div>
          </PopoverTrigger>
          <Button
            size="lg"
            variant="outline"
            className="h-auto min-h-11 w-11 rounded-l-none border-l-0 bg-[#CF1322] px-0 hover:bg-[#F4222D]"
            aria-label="Search links"
            onClick={handleSearch}
            disabled={
              filters.url.length === 0 &&
              filters.alias.length === 0 &&
              filters.title.length === 0 &&
              filters.owner.length === 0
            }
          >
            <SearchIcon />
          </Button>
        </div>

        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-[var(--radix-popover-trigger-width)] min-w-[20rem] border-border bg-muted p-3 text-foreground shadow-lg"
        >
          <div className="space-y-2">
            {(['title', 'alias', 'url', 'owner'] as const).map((key) => (
              <div key={key} className="flex gap-2">
                <Input
                  className="border-border bg-background text-foreground shadow-none placeholder:text-muted-foreground"
                  ref={
                    key === 'title'
                      ? titleInputRef
                      : key === 'alias'
                        ? aliasInputRef
                        : key === 'url'
                          ? urlInputRef
                          : ownerInputRef
                  }
                  placeholder={key.charAt(0).toUpperCase() + key.slice(1)}
                  value={filters[key]}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, [key]: e.target.value }))
                  }
                />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Clear ${key} filter`}
                  className={`h-9 w-9 shrink-0 ${dashboardControlBorderClass}`}
                  onClick={() => clearFilter(key)}
                >
                  <XIcon />
                </Button>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

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
                      id="dashboard-organization-links-filter"
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

        <div className="space-y-2">
          <Label className={dashboardLabelClass}>Sort by</Label>
          <div className="flex gap-2">
            <ButtonGroup className="w-full">
              <Select value={query.sort.key} onValueChange={sortLinksByKey}>
                <SelectTrigger
                  className={`h-9 flex-1 ${dashboardControlBorderClass}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="created_time">Time created</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="visits">Number of visits</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={sortLinkOrder}
                className={`h-9 w-[138px] ${dashboardControlBorderClass}`}
              >
                {sortOrder === 'ascending' ? (
                  <ArrowUpIcon />
                ) : (
                  <ArrowDownIcon />
                )}
                {sortOrder.charAt(0).toUpperCase() + sortOrder.slice(1)}
              </Button>
            </ButtonGroup>
          </div>
        </div>

        <div className="space-y-2">
          <Label className={dashboardLabelClass}>Creation Date</Label>
          <div className="flex flex-wrap items-center gap-2">
            {renderDatePicker('Start date', beginDate, (date) =>
              showLinksInRange(date, endDate),
            )}
            <span className="flex items-center px-1 text-muted-foreground">
              →
            </span>
            {renderDatePicker('End date', endDate, (date) =>
              showLinksInRange(beginDate, date),
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="w-fit max-w-full space-y-2">
            <Label className={dashboardLabelClass}>Expired Links</Label>
            <ButtonGroup className="w-fit max-w-full">
              <Button
                variant={query.show_expired_links ? 'default' : 'outline'}
                onClick={() => showExpiredLinks(true)}
                className={`${dashboardSegmentButtonClass} ${query.show_expired_links ? activeDashboardButtonClass : inactiveDashboardButtonClass}`}
              >
                Show
              </Button>
              <Button
                variant={!query.show_expired_links ? 'default' : 'outline'}
                onClick={() => showExpiredLinks(false)}
                className={`${dashboardSegmentButtonClass} ${!query.show_expired_links ? activeDashboardButtonClass : inactiveDashboardButtonClass}`}
              >
                Hide
              </Button>
            </ButtonGroup>
          </div>
          <div className="w-fit max-w-full min-w-[13.5rem] space-y-2">
            <Label className={dashboardLabelClass}>Link Type</Label>
            <ButtonGroup className="w-fit max-w-full">
              <Button
                variant={query.showType === 'links' ? 'default' : 'outline'}
                onClick={() => sortByType('links')}
                className={`${dashboardSegmentButtonClass} ${query.showType === 'links' ? activeDashboardButtonClass : inactiveDashboardButtonClass}`}
              >
                Links
              </Button>
              <Button
                variant={
                  query.showType === 'tracking_pixels' ? 'default' : 'outline'
                }
                onClick={() => sortByType('tracking_pixels')}
                className={`${dashboardSegmentButtonClass} whitespace-nowrap ${query.showType === 'tracking_pixels' ? activeDashboardButtonClass : inactiveDashboardButtonClass}`}
              >
                Tracking Pixels
              </Button>
            </ButtonGroup>
          </div>
        </div>

        {userPrivileges.has('admin') && (
          <div className="space-y-2">
            <Label className={dashboardLabelClass}>Deleted Links</Label>
            <ButtonGroup className="w-fit max-w-full">
              <Button
                variant={query.show_deleted_links ? 'default' : 'outline'}
                onClick={() => showDeletedLinks(true)}
                className={`${dashboardSegmentButtonClass} ${query.show_deleted_links ? activeDashboardButtonClass : inactiveDashboardButtonClass}`}
              >
                Show
              </Button>
              <Button
                variant={!query.show_deleted_links ? 'default' : 'outline'}
                onClick={() => showDeletedLinks(false)}
                className={`${dashboardSegmentButtonClass} ${!query.show_deleted_links ? activeDashboardButtonClass : inactiveDashboardButtonClass}`}
              >
                Hide
              </Button>
            </ButtonGroup>
          </div>
        )}

        <Button
          variant="ghost"
          onClick={resetFilters}
          className="h-9 bg-primary text-primary-foreground shadow-none hover:bg-primary/80"
        >
          Reset Filters
        </Button>
      </div>
    </div>
  );
}
