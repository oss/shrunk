import React, { useState, useCallback } from 'react';
import {
  XIcon,
  SearchIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
} from 'lucide-react';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
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

export interface OrganizationLinkFilters {
  title: string;
  alias: string;
  owner: string;
  url: string;
}

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
const dashboardControlBorderClass =
  'border border-border bg-muted text-foreground shadow-none hover:bg-accent hover:text-foreground';
const inactiveDashboardButtonClass =
  'border border-border bg-muted text-foreground shadow-none hover:bg-accent hover:text-foreground';
const activeDashboardButtonClass =
  'border border-primary bg-primary text-primary-foreground shadow-none hover:bg-primary/90 hover:text-primary-foreground';
const dashboardSegmentButtonClass = 'h-8 min-w-fit px-3 text-sm font-semibold';
const dashboardLabelClass = 'text-sm font-semibold text-foreground';

export default function OrganizationSearch({
  isAdmin,
  query,
  setQuery,
  filters,
  setFilters,
  className,
}: Props) {
  const [filterOpen, setFilterOpen] = useState(false);

  const roleItems: Array<{
    label: string;
    value: 'owner' | 'editor' | 'viewer';
  }> = [
    { label: 'Owner', value: 'owner' },
    { label: 'Editor', value: 'editor' },
    { label: 'Viewer', value: 'viewer' },
  ];

  const clearFilter = useCallback(
    (key: keyof OrganizationLinkFilters) => {
      setFilters((f) => ({ ...f, [key]: '' }));
      setQuery((current) => ({ ...current, [key]: '' }));
    },
    [setFilters, setQuery],
  );

  const handleSearch = useCallback(() => {
    const appliedFilters = {
      title: filters.title.trim(),
      alias: filters.alias.trim(),
      url: filters.url.trim(),
      owner: filters.owner.trim(),
    };
    setFilters(appliedFilters);
    setQuery((current) => ({ ...current, ...appliedFilters }));
    setFilterOpen(false);
  }, [filters, setFilters, setQuery]);

  const handleRoleToggle = useCallback(
    (role: 'owner' | 'editor' | 'viewer', checked: boolean) => {
      setQuery((current) => ({
        ...current,
        roles: checked
          ? Array.from(new Set([...current.roles, role]))
          : current.roles.filter((item) => item !== role),
      }));
    },
    [setQuery],
  );

  const sortLinksByKey = useCallback(
    (key: OrganizationLinkSearchQuery['sort']['key']) => {
      setQuery((current) => ({
        ...current,
        sort: { ...current.sort, key },
      }));
    },
    [setQuery],
  );

  const sortLinkOrder = useCallback(() => {
    setQuery((current) => ({
      ...current,
      sort: {
        ...current.sort,
        order: current.sort.order === 'ascending' ? 'descending' : 'ascending',
      },
    }));
  }, [setQuery]);

  const showLinksInRange = useCallback(
    (start: Date | undefined, end: Date | undefined) => {
      setQuery((current) => ({
        ...current,
        beginTime: start ? dayjs(start).startOf('day') : null,
        endTime: end ? dayjs(end).endOf('day') : null,
      }));
    },
    [setQuery],
  );

  const resetFilters = useCallback(() => {
    setFilters({ title: '', alias: '', owner: '', url: '' });
    setQuery(DEFAULT_ORGANIZATION_LINK_QUERY);
  }, [setFilters, setQuery]);

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

  const activeFilterKeys = filterKeys.filter((k) => query[k].length > 0);
  const activeFilterCount = filterKeys.filter(
    (k) => query[k].length > 0,
  ).length;
  const beginDate = query.beginTime?.toDate();
  const endDate = query.endTime?.toDate();
  const textFiltersChanged = filterKeys.some(
    (key) => filters[key] !== query[key],
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
                      {key}: {query[key]}
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
            disabled={!textFiltersChanged}
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
                  placeholder={key.charAt(0).toUpperCase() + key.slice(1)}
                  value={filters[key]}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, [key]: e.target.value }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && textFiltersChanged) {
                      event.preventDefault();
                      handleSearch();
                    }
                  }}
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
            {roleItems.map((item) => (
              <label
                key={item.value}
                className="flex min-h-5 cursor-pointer items-center gap-3 text-sm leading-none font-semibold text-foreground"
              >
                <Checkbox
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

        <div className="space-y-2">
          <Label className={dashboardLabelClass}>Sort by</Label>
          <div className="flex gap-2">
            <ButtonGroup className="w-full">
              <Select
                value={query.sort.key}
                onValueChange={(value) =>
                  sortLinksByKey(
                    value as OrganizationLinkSearchQuery['sort']['key'],
                  )
                }
              >
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
                {query.sort.order === 'ascending' ? (
                  <ArrowUpIcon />
                ) : (
                  <ArrowDownIcon />
                )}
                {query.sort.order.charAt(0).toUpperCase() +
                  query.sort.order.slice(1)}
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
                variant={query.showExpiredLinks ? 'default' : 'outline'}
                onClick={() =>
                  setQuery((current) => ({
                    ...current,
                    showExpiredLinks: true,
                  }))
                }
                className={`${dashboardSegmentButtonClass} ${query.showExpiredLinks ? activeDashboardButtonClass : inactiveDashboardButtonClass}`}
              >
                Show
              </Button>
              <Button
                variant={!query.showExpiredLinks ? 'default' : 'outline'}
                onClick={() =>
                  setQuery((current) => ({
                    ...current,
                    showExpiredLinks: false,
                  }))
                }
                className={`${dashboardSegmentButtonClass} ${!query.showExpiredLinks ? activeDashboardButtonClass : inactiveDashboardButtonClass}`}
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
                onClick={() =>
                  setQuery((current) => ({ ...current, showType: 'links' }))
                }
                className={`${dashboardSegmentButtonClass} ${query.showType === 'links' ? activeDashboardButtonClass : inactiveDashboardButtonClass}`}
              >
                Links
              </Button>
              <Button
                variant={
                  query.showType === 'tracking_pixels' ? 'default' : 'outline'
                }
                onClick={() =>
                  setQuery((current) => ({
                    ...current,
                    showType: 'tracking_pixels',
                  }))
                }
                className={`${dashboardSegmentButtonClass} whitespace-nowrap ${query.showType === 'tracking_pixels' ? activeDashboardButtonClass : inactiveDashboardButtonClass}`}
              >
                Tracking Pixels
              </Button>
            </ButtonGroup>
          </div>
        </div>

        {isAdmin && (
          <div className="space-y-2">
            <Label className={dashboardLabelClass}>Deleted Links</Label>
            <ButtonGroup className="w-fit max-w-full">
              <Button
                variant={query.showDeletedLinks ? 'default' : 'outline'}
                onClick={() =>
                  setQuery((current) => ({
                    ...current,
                    showDeletedLinks: true,
                  }))
                }
                className={`${dashboardSegmentButtonClass} ${query.showDeletedLinks ? activeDashboardButtonClass : inactiveDashboardButtonClass}`}
              >
                Show
              </Button>
              <Button
                variant={!query.showDeletedLinks ? 'default' : 'outline'}
                onClick={() =>
                  setQuery((current) => ({
                    ...current,
                    showDeletedLinks: false,
                  }))
                }
                className={`${dashboardSegmentButtonClass} ${!query.showDeletedLinks ? activeDashboardButtonClass : inactiveDashboardButtonClass}`}
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
