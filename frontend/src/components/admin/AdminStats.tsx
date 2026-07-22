import React, { useEffect, useState } from 'react';

import { Bar, BarChart, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

import { getEndpointData, getShrunkVersion } from '@/api/app';
import { AdminStatsData, EndpointDatum } from '@/interfaces/app';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { adminSurfaceClass } from '@/lib/admin-styles';

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
      theme: { light: '#ea580c', dark: '#fb923c' },
    },
    unique: {
      label: 'Unique visits',
      theme: { light: '#2563eb', dark: '#60a5fa' },
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
            <div
              key={stat.title}
              className={`${adminSurfaceClass} px-6 py-6 ${isMobile ? 'min-h-28' : 'min-h-28'}`}
            >
              <p className="text-[1.05rem] text-muted-foreground dark:text-[#9d9d9d]">
                {stat.title}
              </p>
              <p className="mt-3 text-[2.1rem] leading-none font-semibold text-foreground dark:text-[#efefef]">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}
      {isMobile ? (
        <div className={`${adminSurfaceClass} px-5 py-5`}>
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
        </div>
      ) : (
        <div className={`${adminSurfaceClass} overflow-x-auto px-6 py-6`}>
          <ChartContainer
            config={chartConfig}
            className="aspect-auto"
            style={{ height: chartHeight, minWidth: chartMinWidth }}
          >
            <BarChart
              accessibilityLayer
              data={chartData}
              layout="vertical"
              margin={{ left: 8, right: 16 }}
            >
              <XAxis type="number" />
              <YAxis
                type="category"
                dataKey="endpoint"
                width={yAxisWidth}
                interval={0}
                tick={{ fontSize: 12 }}
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
      )}
    </div>
  );
}
