import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import React, { useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { CalendarIcon } from 'lucide-react';
import { VisitDatum, VisitStats } from '@/interfaces/link';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

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

  const options = {
    chart: {
      type: 'areaspline',
      zooming: {
        type: 'x',
      },
    },
    credits: { enabled: false },
    plotOptions: {
      areaspline: {
        marker: {
          enabled: visits.length === 1,
          symbol: 'circle',
          lineColor: null,
        },
        states: {
          hover: {
            enabled: true,
            halo: {
              size: 0,
            },
          },
        },
      },
    },
    title: { text: '' },
    xAxis: {
      title: { text: '' },
      type: 'datetime',
      dateTimeLabelFormats: {
        day: '%b %e',
      },
    },
    tooltip: {
      shared: true,
    },
    yAxis: { title: { text: '' }, min: 0 },
    series: [
      {
        name: 'Total visits',
        lineColor: 'rgb(231, 110, 80)',
        color: 'rgb(231, 110, 80)',
        fillColor: {
          linearGradient: [0, 0, 0, 300],
          stops: [
            [0, 'rgba(231, 110, 80, 1)'],
            [1, 'rgba(231, 110, 80, 0)'],
          ],
        },
        data: visits.map((el) => [getMsSinceEpoch(el), el.all_visits]),
      },
      {
        name: 'Unique visits',
        lineColor: 'rgb(50, 168, 82)',
        color: 'rgb(50, 168, 82)',
        fillOpacity: 0,
        data: visits.map((el) => [getMsSinceEpoch(el), el.first_time_visits]),
      },
    ],
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <ButtonGroup className="max-w-full flex-wrap">
          {presets.map((p) => (
            <Button
              key={p.label}
              type="button"
              variant="outline"
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
          <PopoverContent align="start" className="w-auto p-0">
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
          <PopoverContent align="start" className="w-auto p-0">
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
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
};

export default VisitsChart;
