import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import React from 'react';
import { VisitDatum, VisitStats } from '../../interfaces/link';

const VisitsChart: React.FC<{ visitStats: VisitStats | null }> = (props) => {
  if (props.visitStats === null) {
    return <></>;
  }

  const { visits } = props.visitStats;
  const getMsSinceEpoch = (datum: VisitDatum) =>
    Date.UTC(datum._id.year, datum._id.month - 1, datum._id.day);

  const options = {
    chart: { type: 'areaspline' },
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
        day: '%b %e', // Format as "Dec 4"
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

  return <HighchartsReact highcharts={Highcharts} options={options} />;
};

export default VisitsChart;
