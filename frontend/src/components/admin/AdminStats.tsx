import React, { useContext, useEffect, useState } from 'react';

import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

import { getEndpointData, getShrunkVersion } from '@/api/app';
import { AdminStatsData, EndpointDatum } from '@/interfaces/app';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { adminSurfaceClass } from '@/lib/admin-styles';
import { DarkModeContext } from '@/contexts/DarkModeContext';

export default function AdminStats(): React.ReactElement {
  const darkModeContext = useContext(DarkModeContext);
  const darkMode = darkModeContext?.darkMode ?? false;
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

  const axisLabelColor = darkMode ? '#d9d9d9' : '#64748b';
  const axisTitleColor = darkMode ? '#f5f5f5' : '#0f172a';
  const gridLineColor = darkMode ? '#434343' : '#e2e8f0';
  const legendTextColor = darkMode ? '#f5f5f5' : '#0f172a';
  const tooltipBackgroundColor = darkMode ? '#262626' : '#ffffff';
  const tooltipTextColor = darkMode ? '#f5f5f5' : '#0f172a';
  const tooltipBorderColor = darkMode ? gridLineColor : '#cbd5e1';

  const options = {
    chart: {
      type: 'bar',
      height: Math.max(endpointData.length * 30, 320),
      backgroundColor: 'transparent',
      plotBackgroundColor: 'transparent',
    },
    plotOptions: {
      bar: {
        borderWidth: 0,
        borderColor: 'transparent',
        states: {
          hover: {
            animation: {
              duration: 300,
            },
            brightness: 0,
          },
        },
      },
      series: {
        states: {
          inactive: {
            animation: {
              duration: 300,
            },
            opacity: 0,
          },
        },
      },
    },
    title: {
      text: 'Endpoint visits',
      style: {
        color: axisTitleColor,
        fontSize: '18px',
        fontWeight: '700',
      },
    },
    xAxis: {
      categories: endpointData.map((datum) => datum.endpoint),
      title: {
        text: 'Endpoint',
        style: { color: axisTitleColor, fontWeight: '600' },
      },
      gridLineColor,
      lineColor: gridLineColor,
      tickColor: gridLineColor,
      labels: {
        style: { fontSize: '11px', color: axisLabelColor },
      },
    },
    yAxis: {
      min: 0,
      title: {
        text: 'Visits',
        style: { color: axisTitleColor, fontWeight: '600' },
      },
      gridLineColor,
      labels: {
        overflow: 'justify',
        step: 4,
        style: { color: axisLabelColor },
      },
    },
    tooltip: {
      backgroundColor: tooltipBackgroundColor,
      borderColor: tooltipBorderColor,
      style: { color: tooltipTextColor },
    },
    legend: {
      layout: 'vertical',
      align: 'right',
      verticalAlign: 'top',
      x: -40,
      y: 42,
      borderWidth: 1,
      borderColor: darkMode ? '#707070' : '#cbd5e1',
      backgroundColor: 'transparent',
      itemStyle: { color: legendTextColor },
      itemHoverStyle: { color: legendTextColor },
    },
    responsive: {
      rules: [
        {
          condition: { maxWidth: 768 },
          chartOptions: {
            chart: {
              height: Math.max(endpointData.length * 22, 260),
            },
            legend: {
              enabled: false,
            },
            yAxis: {
              labels: { step: 2 },
            },
          },
        },
      ],
    },
    series: [
      {
        name: 'Total visits',
        color: '#fc580c',
        data: endpointData.map((datum) => datum.total_visits),
      },
      {
        name: 'Unique visits',
        color: '#fce2cc',
        data: endpointData.map((datum) => datum.unique_visits),
      },
    ],
  };

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
          <HighchartsReact highcharts={Highcharts} options={options} />
        </div>
      )}
    </div>
  );
}
