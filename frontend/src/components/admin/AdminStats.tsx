/**
 * Implements the [[AdminStats]] component
 * @packageDocumentation
 */

import React, { useEffect, useState } from 'react';

import {
  Button,
  Card,
  Flex,
  Form,
  Spin,
  Statistic,
  Typography,
} from 'antd/lib';
import dayjs from 'dayjs';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { MoveRightIcon } from 'lucide-react';
import DatePicker from '../date-picker';

import { getAppStats, getEndpointData, getShrunkVersion } from '../../api/app';
import { AdminStatsData, EndpointDatum } from '../../interfaces/app';
import { MENU_ITEMS } from '../../pages/subpages/StatsCommon';

const { RangePicker } = DatePicker;

export default function AdminStats(): React.ReactElement {
  const [endpointData, setEndpointData] = useState<EndpointDatum[] | null>(
    null,
  );
  const [adminDataRange, setAdminDataRange] = useState<{
    begin: dayjs.Dayjs;
    end: dayjs.Dayjs;
  } | null>(null);
  const [adminData, setAdminData] = useState<AdminStatsData | null>(null);
  const [version, setVersion] = useState<string | null>(null);

  const updateAdminData = async () => {
    setAdminData(await getAppStats(adminDataRange?.begin, adminDataRange?.end));
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

  const submitRangeForm = async (values: {
    range: dayjs.Dayjs[] | null | undefined;
  }) => {
    const { range } = values;
    const newRange =
      range === undefined || range === null
        ? null
        : {
            begin: range[0],
            end: range[1],
          };

    setAdminDataRange(newRange);
    setAdminData(null);
    await updateAdminData();
  };

  if (endpointData === null) {
    return <></>;
  }

  const options = {
    chart: { type: 'bar' },
    title: { text: 'Endpoint visits' },
    exporting: { buttons: { contextButton: { menuItems: MENU_ITEMS } } },
    xAxis: {
      categories: endpointData.map((datum) => datum.endpoint),
      title: { text: 'Endpoint' },
    },
    yAxis: {
      min: 0,
      title: { text: 'Visits' },
      labels: { overflow: 'justify', step: 4 },
    },
    legend: {
      layout: 'vertical',
      align: 'right',
      verticalAlign: 'top',
      x: -40,
      y: 80,
      borderWidth: 1,
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

  return (
    <>
      <Flex gap="1rem" align="baseline" justify="space-between">
        <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 16 }}>
          Admin Statistics
        </Typography.Title>
        <Form layout="inline" onFinish={submitRangeForm}>
          <Form.Item name="range">
            <RangePicker />
          </Form.Item>
          <Form.Item>
            <Button htmlType="submit" icon={<MoveRightIcon />} />
          </Form.Item>
        </Form>
      </Flex>

      <Flex gap="1rem" wrap="wrap" justify="space-between" vertical>
        {adminData === null ? (
          <Spin size="small" />
        ) : (
          <Flex gap="1rem" wrap="wrap" justify="space-between">
            <Card style={{ flex: 1 }}>
              <Statistic title="Links" value={adminData.links} />
            </Card>
            <Card style={{ flex: 1 }}>
              <Statistic title="Visits" value={adminData.visits} />
            </Card>
            <Card style={{ flex: 1 }}>
              <Statistic title="Users" value={adminData.users} />
            </Card>
            <Card style={{ flex: 1 }}>
              <Statistic title="Version" value={version || ''} />
            </Card>
          </Flex>
        )}
        <Card>
          <HighchartsReact highcharts={Highcharts} options={options} />
        </Card>
      </Flex>
    </>
  );
}
