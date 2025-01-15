/**
 * Implements the [[AdminStats]] component
 * @packageDocumentation
 */

import React, { useState, useEffect } from 'react';

import {
  Row,
  Col,
  Spin,
  DatePicker,
  Form,
  Button,
  Card,
  Typography,
  Statistic,
  Skeleton,
} from 'antd/lib';
import { ArrowRightOutlined } from '@ant-design/icons';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import dayjs from 'dayjs';

import { MENU_ITEMS } from '../../pages/subpages/StatsCommon';

const { RangePicker } = DatePicker;

/**
 * Results of an admin stats query to the backend
 * @interface
 */
interface AdminStatsData {
  /**
   * Total number of links created during the specified time period
   * @property
   */
  links: number;

  /**
   * Total number of visits occurring during the specified time period
   * @property
   */
  visits: number;

  /**
   * Total number of distinct NetIDs creating links during the specified time period
   */
  users: number;
}

/**
 * Statistics about visits to a single Flask endpoint
 * @interface
 */
interface EndpointDatum {
  /**
   * Name of the Flask endpoint
   * @property
   */
  endpoint: string;

  /**
   * Total number of visits
   * @property
   */
  total_visits: number;

  /**
   * Total number of unique visits by NetID
   * @property
   */
  unique_visits: number;
}

/**
 * The [[AdminStats]] component allows the user to view summary statistics
 * about the total number of links, users, and visits on Shrunk, as well
 * as to view statistics about the number of visits to each Flask endpoint
 * @function
 */
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

  useEffect(() => {
    Promise.all([
      updateAdminData(),
      updateEndpointData(),
      updateShrunkVersion(),
    ]);
  }, []);

  const updateAdminData = async () => {
    const req: Record<string, any> = {};
    if (adminDataRange !== null) {
      req.range = {
        begin: adminDataRange.begin.format(),
        end: adminDataRange.end.format(),
      };
    }

    const json = await fetch('/api/v1/admin/stats/overview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    }).then((resp) => resp.json());

    setAdminData(json as AdminStatsData);
  };

  const updateEndpointData = async () => {
    const json = await fetch('/api/v1/admin/stats/endpoint').then((resp) =>
      resp.json(),
    );
    setEndpointData(json.stats as EndpointDatum[]);
  };

  const updateShrunkVersion = async () => {
    const json = await fetch('/api/v1/admin/app-version').then((resp) =>
      resp.json(),
    );
    setVersion(json.version as string);
  };

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
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Row justify="space-between" align="middle">
            <Col>
              <Typography.Title>Admin Statistics</Typography.Title>
            </Col>
            <Col>
              <Form layout="inline" onFinish={submitRangeForm}>
                <Form.Item name="range">
                  <RangePicker />
                </Form.Item>
                <Form.Item>
                  <Button htmlType="submit" icon={<ArrowRightOutlined />} />
                </Form.Item>
              </Form>
            </Col>
          </Row>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          {adminData === null ? (
            <Spin size="small" />
          ) : (
            <Row gutter={[16, 16]}>
              <Col span={6}>
                <Card>
                  <Statistic title="Links" value={adminData.links} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="Visits" value={adminData.visits} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="Users" value={adminData.users} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="Version" value={version || ''} />
                </Card>
              </Col>
            </Row>
          )}
        </Col>
        <Col span={24}>
          <Card>
            <HighchartsReact highcharts={Highcharts} options={options} />
          </Card>
        </Col>
      </Row>
    </>
  );
}
