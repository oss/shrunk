import * as React from 'react';
import dayjs from 'dayjs';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react';

import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { ButtonGroup } from '@/Components/ui/button-group';
import { Calendar } from '@/Components/ui/calendar';
import { Label } from '@/Components/ui/label';
import { Input } from '@/Components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/Components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/Components/ui/select';

export type LinkSortKey = 'relevance' | 'created_time' | 'title' | 'visits';
type LinkSortOrder = 'ascending' | 'descending';
type LinkType = 'links' | 'tracking_pixels';
export interface LinkTextFilters {
  title: string;
  alias: string;
  owner: string;
  url: string;
}

const filterKeys: Array<keyof LinkTextFilters> = [
  'title',
  'alias',
  'url',
  'owner',
];

const controlClass =
  'border border-border bg-muted text-foreground shadow-none hover:bg-accent hover:text-foreground';

export function LinkTextFilterPopover({
  draft,
  applied,
  disabled,
  ownerDisabled,
  ariaLabel,
  onDraftChange,
  onClear,
  onSearch,
}: {
  draft: LinkTextFilters;
  applied: LinkTextFilters;
  disabled: boolean;
  ownerDisabled: boolean;
  ariaLabel: string;
  onDraftChange: (filters: LinkTextFilters) => void;
  onClear: (key: keyof LinkTextFilters) => void;
  onSearch: () => boolean | Promise<boolean>;
}) {
  const [open, setOpen] = React.useState(false);
  const activeKeys = filterKeys.filter((key) => applied[key].length > 0);

  const search = async () => {
    if (await onSearch()) setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="mb-3 flex w-full items-stretch">
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            id="dashboard-filter-trigger"
            className={`flex min-h-11 min-w-0 flex-1 cursor-pointer flex-wrap items-center gap-1 rounded-md rounded-r-none px-4 py-2 text-left text-base font-normal text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring ${controlClass}`}
          >
            {activeKeys.length === 0 ? (
              <span className="text-foreground">Click to search</span>
            ) : (
              activeKeys.map((key) => (
                <Badge key={key} variant="secondary" className="max-w-full">
                  <span className="max-w-[14rem] truncate">
                    {key}: {applied[key]}
                  </span>
                </Badge>
              ))
            )}
          </button>
        </PopoverTrigger>
        <Button
          size="lg"
          className="h-auto min-h-11 w-11 rounded-l-none px-0"
          aria-label="Search links"
          onClick={search}
          disabled={disabled}
        >
          <SearchIcon />
        </Button>
      </div>
      <PopoverContent
        align="start"
        sideOffset={6}
        aria-label="Link search filters"
        className="w-[var(--radix-popover-trigger-width)] min-w-[20rem] p-3"
      >
        <div className="space-y-2">
          {filterKeys.map((key) => {
            const label = key.charAt(0).toUpperCase() + key.slice(1);
            return (
              <div key={key} className="flex gap-2">
                <Input
                  aria-label={`${label} filter`}
                  placeholder={label}
                  value={draft[key]}
                  onChange={(event) =>
                    onDraftChange({ ...draft, [key]: event.target.value })
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !disabled) {
                      event.preventDefault();
                      void search();
                    }
                  }}
                  disabled={ownerDisabled && key == 'owner'}
                />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Clear ${key} filter`}
                  onClick={() => onClear(key)}
                >
                  <XIcon />
                </Button>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface DateRangeProps {
  beginDate?: Date;
  endDate?: Date;
  onChange: (beginDate?: Date, endDate?: Date) => void;
}

function DatePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: Date;
  onChange: (value?: Date) => void;
}) {
  return (
    <div className="min-w-[9.5rem] flex-1">
      <Popover>
        <div className="flex">
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              aria-label={`${label} picker`}
              className={`h-9 min-w-0 flex-1 justify-start px-3 text-left font-normal ${value ? 'rounded-r-none' : ''} ${controlClass}`}
            >
              <CalendarIcon />
              <span className="truncate">
                {value ? dayjs(value).format('YYYY-MM-DD') : label}
              </span>
            </Button>
          </PopoverTrigger>
          {value && (
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label={`Clear ${label.toLowerCase()}`}
              className={`h-9 w-9 rounded-l-none border-l-0 px-0 ${controlClass}`}
              onClick={() => onChange(undefined)}
            >
              <XIcon />
            </Button>
          )}
        </div>
        <PopoverContent
          aria-label={`${label} calendar`}
          align="start"
          className="w-auto p-0"
        >
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange}
            defaultMonth={value}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function LinkDateRange({
  beginDate,
  endDate,
  onChange,
}: DateRangeProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-foreground">
        Creation Date
      </Label>
      <div className="flex flex-wrap items-center gap-2">
        <DatePicker
          label="Start date"
          value={beginDate}
          onChange={(date) => onChange(date, endDate)}
        />
        <span aria-hidden="true" className="mx-1 h-px w-3 bg-border" />
        <DatePicker
          label="End date"
          value={endDate}
          onChange={(date) => onChange(beginDate, date)}
        />
      </div>
    </div>
  );
}

export function LinkSortControls({
  sortKey,
  sortOrder,
  onKeyChange,
  onOrderChange,
}: {
  sortKey: LinkSortKey;
  sortOrder: LinkSortOrder;
  onKeyChange: (key: LinkSortKey) => void;
  onOrderChange: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-foreground">Sort by</Label>
      <ButtonGroup className="w-full">
        <Select
          value={sortKey}
          onValueChange={(value) => onKeyChange(value as LinkSortKey)}
        >
          <SelectTrigger
            aria-label="Sort links by"
            className={`h-9 flex-1 ${controlClass}`}
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
          aria-label={`Sort order: ${sortOrder}`}
          onClick={onOrderChange}
          className={`h-9 w-[138px] ${controlClass}`}
        >
          {sortOrder === 'ascending' ? <ArrowUpIcon /> : <ArrowDownIcon />}
          {sortOrder.charAt(0).toUpperCase() + sortOrder.slice(1)}
        </Button>
      </ButtonGroup>
    </div>
  );
}

function Toggle({
  active,
  label,
  ariaLabel,
  onClick,
}: {
  active: boolean;
  label: string;
  ariaLabel: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant={active ? 'default' : 'outline'}
      aria-label={ariaLabel}
      aria-pressed={active}
      onClick={onClick}
      className="h-8 min-w-fit px-3 text-sm font-semibold"
    >
      {label}
    </Button>
  );
}

export function LinkBooleanFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="w-fit max-w-full space-y-2">
      <Label className="text-sm font-semibold text-foreground">{label}</Label>
      <ButtonGroup>
        <Toggle
          active={value}
          label="Show"
          ariaLabel={`Show ${label.toLowerCase()}`}
          onClick={() => onChange(true)}
        />
        <Toggle
          active={!value}
          label="Hide"
          ariaLabel={`Hide ${label.toLowerCase()}`}
          onClick={() => onChange(false)}
        />
      </ButtonGroup>
    </div>
  );
}

export function LinkTypeFilter({
  value,
  onChange,
}: {
  value: LinkType;
  onChange: (value: LinkType) => void;
}) {
  return (
    <div className="w-fit max-w-full min-w-[13.5rem] space-y-2">
      <Label className="text-sm font-semibold text-foreground">Link Type</Label>
      <ButtonGroup>
        <Toggle
          active={value === 'links'}
          label="Links"
          ariaLabel="Show links"
          onClick={() => onChange('links')}
        />
        <Toggle
          active={value === 'tracking_pixels'}
          label="Tracking Pixels"
          ariaLabel="Show tracking pixels"
          onClick={() => onChange('tracking_pixels')}
        />
      </ButtonGroup>
    </div>
  );
}
