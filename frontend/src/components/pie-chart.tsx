import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import React from 'react';
import { PieDatum } from '../interfaces/link';

const ShrunkPieChart: React.FC<{ data: PieDatum[] }> = (props) => {
  const options = {
    chart: {
      plotBackgroundColor: null,
      plotBorderWidth: null,
      plotShadow: false,
      type: 'pie',
    },
    credits: { enabled: false },
    title: { text: '' },
    tooltip: { enabled: false },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        borderWidth: 2,
        cursor: 'pointer',
        dataLabels: {
          enabled: true,
          format: '<b>{point.name}</b><br>{point.percentage:.1f}%',
          distance: 20,
        },
      },
    },
    series: [
      {
        colorByPoint: true,
        data: props.data,
      },
    ],
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
};

export function processData(
  data: PieDatum[],
  colors: Map<string, string>,
): any {
  return data.map((datum) => ({ ...datum, color: colors.get(datum.name) }));
}

export default ShrunkPieChart;
