import React, { useEffect, useState } from 'react';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/Components/ui/chart';

import { getEndpointData, getShrunkVersion } from '@/Api/App';
import { AdminStatsData, EndpointDatum } from '@/Interfaces/App';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/Components/ui/tooltip';
import { Card } from '@/Components/ui/card';

// The chart's horizontal scroll region must be keyboard reachable.
/* eslint-disable jsx-a11y/no-noninteractive-tabindex */
// Recharts and its accessible label overlay need runtime dimensions calculated from the data.
/* eslint-disable react/forbid-dom-props */

export default function AdminStats(): React.ReactElement {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const [endpointData, setEndpointData] = useState<EndpointDatum[] | null>(
    null,
  );

  const [adminData, setAdminData] = useState<AdminStatsData | null>(null);
  const [version, setVersion] = useState<string | null>(null);

  const updateAdminData = async () => {
    const req: Record<string, any> = {};

    // eslint-disable-next-line no-restricted-globals
    const json = await fetch('/api/core/admin/stats/overview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    }).then((resp) => resp.json());

    setAdminData(json as AdminStatsData);
  };

  const updateEndpointData = async () => {
    setEndpointData(await getEndpointData());
  };

  const updateShrunkVersion = async () => {
    setVersion(await getShrunkVersion());
  };

  useEffect(() => {
    Promise.all([
      updateAdminData(),
      updateEndpointData(),
      updateShrunkVersion(),
    ]);
  }, []);

  if (endpointData === null) {
    return <></>;
  }

  const chartConfig = {
    total: {
      label: 'Total visits',
      theme: {
        light: 'hsl(var(--chart-total))',
        dark: 'hsl(var(--chart-total))',
      },
    },
    unique: {
      label: 'Unique visits',
      theme: {
        light: 'hsl(var(--chart-unique))',
        dark: 'hsl(var(--chart-unique))',
      },
    },
  } satisfies ChartConfig;

  const chartData = endpointData.map((datum) => ({
    endpoint: datum.endpoint,
    total: datum.total_visits,
    unique: datum.unique_visits,
  }));
  const yAxisWidth = Math.max(
    80,
    ...chartData.map(({ endpoint }) => endpoint.length * 7 + 16),
  );
  const chartHeight = Math.max(chartData.length * 32, 400);
  const chartMinWidth = yAxisWidth + 500;
  const endpointRowHeight =
    chartData.length > 0 ? (chartHeight - 30) / chartData.length : 0;

  const mobileEndpointRows = [...endpointData]
    .sort((a, b) => b.total_visits - a.total_visits)
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-4">
      {adminData === null ? (
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { title: 'Links', value: adminData.links },
            { title: 'Visits', value: adminData.visits },
            { title: 'Users', value: adminData.users },
            { title: 'Version', value: version || '' },
          ].map((stat) => (
            <Card key={stat.title} className="min-h-28 px-6 py-6">
              <p className="text-[1.05rem] text-muted-foreground dark:text-[#9d9d9d]">
                {stat.title}
              </p>
              <p className="mt-3 text-[2.1rem] leading-none font-semibold text-foreground dark:text-[#efefef]">
                {stat.value}
              </p>
            </Card>
          ))}
        </div>
      )}
      {isMobile ? (
        <Card className="px-5 py-5">
          <div className="pb-4 text-xl font-semibold text-foreground dark:text-[#efefef]">
            Endpoint visits
          </div>
          <div>
            {mobileEndpointRows.length === 0 ? (
              <p className="text-sm text-muted-foreground dark:text-[#9d9d9d]">
                No endpoint visit data available
              </p>
            ) : (
              <TooltipProvider>
                <ul className="space-y-3">
                  {mobileEndpointRows.map((datum) => (
                    <li
                      key={datum.endpoint}
                      className="flex flex-col gap-1 border-b border-border pb-3 last:border-b-0 dark:border-white/10"
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="truncate text-sm text-foreground dark:text-[#efefef]">
                            {datum.endpoint}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{datum.endpoint}</TooltipContent>
                      </Tooltip>
                      <div className="flex justify-between text-xs text-muted-foreground dark:text-[#9d9d9d]">
                        <span>Total: {datum.total_visits}</span>
                        <span>Unique: {datum.unique_visits}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </TooltipProvider>
            )}
          </div>
        </Card>
      ) : (
        <Card className="overflow-x-auto px-6 py-6" tabIndex={0}>
          <h2 className="pb-4 text-center text-xl font-semibold text-chart-title">
            Endpoint visits
          </h2>
          <div
            aria-hidden="true"
            className="flex justify-end gap-4 pb-2 text-xs text-chart-title"
          >
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-chart-total" />
              Total visits
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-chart-unique" />
              Unique visits
            </span>
          </div>
          <div
            aria-hidden="true"
            className="flex items-center pb-1 text-xs font-semibold text-chart-title"
          >
            <span className="shrink-0 text-right" style={{ width: yAxisWidth }}>
              Endpoint
            </span>
            <span className="flex-1 text-center">Visits</span>
          </div>
          <div
            className="relative max-h-[70vh] overflow-y-auto"
            tabIndex={0}
            style={{ height: chartHeight, minWidth: chartMinWidth }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-0 left-0 z-10 flex flex-col bg-card text-chart-label"
              style={{ width: yAxisWidth }}
            >
              {chartData.map(({ endpoint }) => (
                <div
                  key={endpoint}
                  className="flex shrink-0 items-center justify-end pr-2 text-xs text-chart-label"
                  style={{ height: endpointRowHeight }}
                >
                  {endpoint}
                </div>
              ))}
            </div>
            <div aria-hidden="true">
              <ChartContainer
                config={chartConfig}
                className="aspect-auto bg-card [&_.recharts-cartesian-axis-tick_text]:!fill-chart-title [&_.recharts-surface]:bg-card"
                style={{ height: chartHeight, minWidth: chartMinWidth }}
              >
                <BarChart
                  accessibilityLayer={false}
                  data={chartData}
                  layout="vertical"
                  margin={{ left: 8, right: 16, bottom: 24 }}
                >
                  <CartesianGrid
                    horizontal={false}
                    stroke="hsl(var(--chart-grid))"
                  />
                  <XAxis
                    type="number"
                    axisLine={{ stroke: 'hsl(var(--chart-grid))' }}
                    tickLine={{ stroke: 'hsl(var(--chart-grid))' }}
                    tick={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="endpoint"
                    width={yAxisWidth}
                    interval={0}
                    tick={false}
                  />
                  <Bar dataKey="total" fill="var(--color-total)" radius={4} />
                  <Bar dataKey="unique" fill="var(--color-unique)" radius={4} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                </BarChart>
              </ChartContainer>
            </div>
            <div className="sr-only">
              <table>
                <caption>
                  Endpoint visits with total and unique visit counts
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Endpoint</th>
                    <th scope="col">Total visits</th>
                    <th scope="col">Unique visits</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((datum) => (
                    <tr key={datum.endpoint}>
                      <th scope="row">{datum.endpoint}</th>
                      <td>{datum.total}</td>
                      <td>{datum.unique}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
