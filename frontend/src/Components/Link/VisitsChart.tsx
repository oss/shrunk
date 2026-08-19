import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/Components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import React, { useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { CalendarIcon } from 'lucide-react';
import { VisitDatum, VisitStats } from '@/Interfaces/Link';
import { Button } from '@/Components/ui/button';
import { ButtonGroup } from '@/Components/ui/button-group';
import { Calendar } from '@/Components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/Components/ui/popover';

type Props = {
  visitStats: VisitStats | null;
  onRangeChange: (
    dates: [Dayjs | null, Dayjs | null] | null,
    dateStrings: [string, string],
  ) => void;
};

const presets = [
  { label: 'Last week', days: -7 },
  { label: 'Last month', days: -30 },
  { label: 'Last three months', days: -90 },
  { label: 'Last year', days: -365 },
];

const VisitsChart: React.FC<Props> = (props) => {
  const [startDate, setStartDate] = useState<Date>(
    dayjs().add(-30, 'd').toDate(),
  );
  const [endDate, setEndDate] = useState<Date>(new Date());

  if (props.visitStats === null) {
    return <></>;
  }

  const { onRangeChange } = props;
  const { visits } = props.visitStats;

  const handlePreset = (days: number) => {
    const start = dayjs().add(days, 'd');
    const end = dayjs();
    setStartDate(start.toDate());
    setEndDate(end.toDate());
    onRangeChange(
      [start, end],
      [start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')],
    );
  };

  const handleStartSelect = (date: Date | undefined) => {
    if (!date) return;
    setStartDate(date);
    const start = dayjs(date);
    const end = dayjs(endDate);
    onRangeChange(
      [start, end],
      [start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')],
    );
  };

  const handleEndSelect = (date: Date | undefined) => {
    if (!date) return;
    setEndDate(date);
    const start = dayjs(startDate);
    const end = dayjs(date);
    onRangeChange(
      [start, end],
      [start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')],
    );
  };

  const getMsSinceEpoch = (datum: VisitDatum) =>
    Date.UTC(datum._id.year, datum._id.month - 1, datum._id.day);

  const chartConfig = {
    total: {
      label: 'Total Visits',
      color: '#279AF1',
    },
    unique: {
      label: 'Unique Visits',
      color: '#2b9720',
    },
  } satisfies ChartConfig;

  const chartData = visits.map((el) => ({
    date: getMsSinceEpoch(el),
    total: el.all_visits,
    unique: el.first_time_visits,
  }));

  console.log(chartData);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <ButtonGroup className="max-w-full flex-wrap">
          {presets.map((p) => (
            <Button
              key={p.label}
              type="button"
              variant="outline"
              aria-label={`Set date range to ${p.label}`}
              className="px-3 py-1 text-sm"
              onClick={() => handlePreset(p.days)}
            >
              {p.label}
            </Button>
          ))}
        </ButtonGroup>
        <div className="h-5 w-px bg-border" />
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-9 min-w-[9.5rem] justify-start px-3 text-left text-sm font-normal"
            >
              <CalendarIcon className="size-4" />
              {dayjs(startDate).format('YYYY-MM-DD')}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            aria-label="Start date calendar"
            align="start"
            className="w-auto p-0"
          >
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={handleStartSelect}
              defaultMonth={startDate}
              disabled={(date: Date) => date > endDate || date > new Date()}
            />
          </PopoverContent>
        </Popover>
        <span className="text-sm text-muted-foreground">to</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-9 min-w-[9.5rem] justify-start px-3 text-left text-sm font-normal"
            >
              <CalendarIcon className="size-4" />
              {dayjs(endDate).format('YYYY-MM-DD')}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            aria-label="End date calendar"
            align="start"
            className="w-auto p-0"
          >
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={handleEndSelect}
              defaultMonth={endDate}
              disabled={(date: Date) => date < startDate || date > new Date()}
            />
          </PopoverContent>
        </Popover>
      </div>
      <p className="sr-only">
        The chart below visualizes total visits and unique visits over the
        selected date range.
      </p>
      <ChartContainer
        config={chartConfig}
        aria-hidden="true"
        className="aspect-auto h-[250px] w-full"
      >
        <AreaChart accessibilityLayer={false} data={chartData}>
          <defs>
            <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="fillUnique" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2B9720" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#2B9720" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <Area
            dataKey="total"
            type="natural"
            fill="url(#fillTotal)"
            stroke="#2563eb"
          />
          <Area
            dataKey="unique"
            type="natural"
            fill="url(#fillUnique)"
            stroke="#2B9720"
          />
          <CartesianGrid vertical={false} />
          <YAxis tick={false} />
          <XAxis
            dataKey="date"
            tick={false}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={32}
            tickFormatter={(value) => {
              const date = new Date(value);
              return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });
            }}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) =>
                  new Date(payload[0].payload.date).toLocaleDateString(
                    'en-US',
                    {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    },
                  )
                }
                indicator="dot"
              />
            }
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
};

export default VisitsChart;
