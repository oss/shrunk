/**
 * Implements the [[AdminStats]] component
 * @packageDocumentation
 */

import React, { useEffect, useState } from 'react';

import {
  Spin,
  Card,
  Statistic,
  Flex,
  Row,
  Col,
  Grid,
  List,
  Typography,
} from 'antd';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

import { getEndpointData, getShrunkVersion } from '@/api/app';
import { AdminStatsData, EndpointDatum } from '@/interfaces/app';
import useDarkMode from '@/lib/hooks/useDarkMode';

/**
 * The [[AdminStats]] component allows the user to view summary statistics
 * about the total number of links, users, and visits on Shrunk, as well
 * as to view statistics about the number of visits to each Flask endpoint
 * @function
 */
export default function AdminStats(): React.ReactElement {
  const { darkMode } = useDarkMode();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [endpointData, setEndpointData] = useState<EndpointDatum[] | null>(
    null,
  );

  const [adminData, setAdminData] = useState<AdminStatsData | null>(null);
  const [version, setVersion] = useState<string | null>(null);

  const updateAdminData = async () => {
    const req: Record<string, any> = {};

    // TODO: Move this.
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

  const axisLabelColor = darkMode ? '#d9d9d9' : '#4b5563';
  const axisTitleColor = darkMode ? '#f5f5f5' : '#1f2937';
  const gridLineColor = darkMode ? '#434343' : '#d9d9d9';
  const legendTextColor = darkMode ? '#f5f5f5' : '#1f2937';
  const tooltipBackgroundColor = darkMode ? '#262626' : '#ffffff';
  const tooltipTextColor = darkMode ? '#f5f5f5' : '#1f2937';

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
      style: { color: axisTitleColor },
    },
    xAxis: {
      categories: endpointData.map((datum) => datum.endpoint),
      title: {
        text: 'Endpoint',
        style: { color: axisTitleColor },
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
        style: { color: axisTitleColor },
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
      borderColor: gridLineColor,
      style: { color: tooltipTextColor },
    },
    legend: {
      layout: 'vertical',
      align: 'right',
      verticalAlign: 'top',
      x: -40,
      y: 80,
      borderWidth: 1,
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
    <>
      <Flex gap="1rem" wrap="wrap" justify="space-between" vertical>
        {adminData === null ? (
          <Spin size="small" />
        ) : (
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={12} lg={6}>
              <Card size={isMobile ? 'small' : 'default'}>
                <Statistic title="Links" value={adminData.links} />
              </Card>
            </Col>
            <Col xs={12} sm={12} lg={6}>
              <Card size={isMobile ? 'small' : 'default'}>
                <Statistic title="Visits" value={adminData.visits} />
              </Card>
            </Col>
            <Col xs={12} sm={12} lg={6}>
              <Card size={isMobile ? 'small' : 'default'}>
                <Statistic title="Users" value={adminData.users} />
              </Card>
            </Col>
            <Col xs={12} sm={12} lg={6}>
              <Card size={isMobile ? 'small' : 'default'}>
                <Statistic title="Version" value={version || ''} />
              </Card>
            </Col>
          </Row>
        )}
        {isMobile ? (
          <Card title="Endpoint visits" size="small">
            <List
              dataSource={mobileEndpointRows}
              locale={{ emptyText: 'No endpoint visit data available' }}
              renderItem={(datum) => (
                <List.Item>
                  <Flex vertical style={{ width: '100%', gap: '4px' }}>
                    <Typography.Text ellipsis={{ tooltip: datum.endpoint }}>
                      {datum.endpoint}
                    </Typography.Text>
                    <Flex justify="space-between" style={{ width: '100%' }}>
                      <Typography.Text type="secondary">
                        Total: {datum.total_visits}
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        Unique: {datum.unique_visits}
                      </Typography.Text>
                    </Flex>
                  </Flex>
                </List.Item>
              )}
            />
          </Card>
        ) : (
          <Card style={{ overflowX: 'auto' }}>
            <HighchartsReact highcharts={Highcharts} options={options} />
          </Card>
        )}
      </Flex>
    </>
  );
}
