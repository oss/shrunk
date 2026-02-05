import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import React from 'react';
import type { TimeRangePickerProps, GetProps } from 'antd';
import { DatePicker, Row, Col, Flex } from 'antd/lib';
import dayjs, { Dayjs } from 'dayjs';
import { VisitDatum, VisitStats } from '../../interfaces/link';

type RangePickerProps = GetProps<typeof DatePicker.RangePicker>;
type Props = {
  visitStats: VisitStats | null;
  onRangeChange: (
    dates: [Dayjs | null, Dayjs | null] | null,
    dateStrings: [string, string],
  ) => void;
};

const { RangePicker } = DatePicker;
const rangePresets: TimeRangePickerProps['presets'] = [
  { label: 'Last week', value: [dayjs().add(-7, 'd'), dayjs()] },
  { label: 'Last month', value: [dayjs().add(-30, 'd'), dayjs()] },
  { label: 'Last three months', value: [dayjs().add(-90, 'd'), dayjs()] },
  { label: 'Last year', value: [dayjs().add(-365, 'd'), dayjs()] },
];
// Can not select days after today
const disabledDate: RangePickerProps['disabledDate'] = (current) =>
  current && current > dayjs().endOf('day');

const VisitsChart: React.FC<Props> = (props) => {
  if (props.visitStats === null) {
    return <></>;
  }

  const { onRangeChange } = props;
  const { visits } = props.visitStats;
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

  return (
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <Flex justify="center">
          <RangePicker
            presets={rangePresets}
            onChange={onRangeChange}
            disabledDate={disabledDate}
          />
        </Flex>
      </Col>
      <Col span={24}>
        <HighchartsReact highcharts={Highcharts} options={options} />
      </Col>
    </Row>
  );
};

export default VisitsChart;
