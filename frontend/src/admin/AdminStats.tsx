/**
 * Implements the [[AdminStats]] component
 * @packageDocumentation
 */

import React from 'react';

import { Row, Col, Spin, DatePicker, Form, Button } from 'antd/lib';
import { ArrowRightOutlined } from '@ant-design/icons';
import { IoReturnUpBack } from 'react-icons/io5';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

import { MENU_ITEMS } from '../pages/subpages/StatsCommon';

import '../Base.less';

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
 * The [[EndpointChart]] component displays a bar graph of visits to Flask
 * endpoints
 * @function
 * @param props Props
 */
const EndpointChart: React.FC<{ endpointData: EndpointDatum[] | null }> = (
  props,
) => {
  if (props.endpointData === null) {
    return <Spin size="large" />;
  }

  const options = {
    chart: { type: 'bar' },
    title: { text: 'Endpoint visits' },
    exporting: { buttons: { contextButton: { menuItems: MENU_ITEMS } } },
    xAxis: {
      categories: props.endpointData.map((datum) => datum.endpoint),
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
        data: props.endpointData.map((datum) => datum.total_visits),
      },
      {
        name: 'Unique visits',
        color: '#fce2cc',
        data: props.endpointData.map((datum) => datum.unique_visits),
      },
    ],
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
};

/**
 * Props for the [[AdminStats]] component
 * @interface
 */
export interface Props { }

/**
 * State for the [[AdminStats]] component
 * @interface
 */
interface State {
  /**
   * The endpoint statistics data, fetched from the backend
   * @property
   */
  endpointData: EndpointDatum[] | null;

  /**
   * The date range for the admin stats query, or `null` to query
   * all existing data
   * @property
   */
  adminDataRange: { begin: moment.Moment; end: moment.Moment } | null;

  /**
   * The result of the admin stats query, fetched from the backend
   * @property
   */
  adminData: AdminStatsData | null;
}

/**
 * The [[AdminStats]] component allows the user to view summary statistics
 * about the total number of links, users, and visits on Shrunk, as well
 * as to view statistics about the number of visits to each Flask endpoint
 * @class
 */
export class AdminStats extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      endpointData: null,
      adminDataRange: null,
      adminData: null,
    };
  }

  async componentDidMount(): Promise<void> {
    await Promise.all([this.updateAdminData(), this.updateEndpointData()]);
  }

  /**
   * Execute a query to the admin stats API endpoint, with time-range parameters
   * taken from `state.adminDataRange`, if that value is not `null`
   * @method
   */
  updateAdminData = async (): Promise<void> => {
    const req: Record<string, any> = {};
    if (this.state.adminDataRange !== null) {
      req.range = {
        begin: this.state.adminDataRange.begin.format(),
        end: this.state.adminDataRange.end.format(),
      };
    }

    await fetch('/api/v1/admin/stats/overview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
      .then((resp) => resp.json())
      .then((json) => this.setState({ adminData: json as AdminStatsData }));
  };

  /**
   * Fetch the endpoint stats data from the backend
   * @method
   */
  updateEndpointData = async (): Promise<void> => {
    await fetch('/api/v1/admin/stats/endpoint')
      .then((resp) => resp.json())
      .then((json) =>
        this.setState({ endpointData: json.stats as EndpointDatum[] }),
      );
  };

  /**
   * Update the date range for the admin stats query when the admin stats form is submitted
   * @method
   * @param values The values from the time range form
   */
  submitRangeForm = async (values: {
    range: moment.Moment[] | null | undefined;
  }): Promise<void> => {
    const { range } = values;
    const adminDataRange =
      range === undefined || range === null
        ? null
        : {
          begin: range[0],
          end: range[1],
        };

    this.setState({ adminDataRange, adminData: null });
    await this.updateAdminData();
  };

  render(): React.ReactNode {
    return (
      <>
        <Row className="primary-row">
          <Col span={24}>
            <Button
              type="text"
              href="/app/#/admin"
              icon={<IoReturnUpBack />}
              size="large"
            />
            <span className="page-title">Admin Statistics</span>
          </Col>
        </Row>

        <Row className="primary-row">
          <Col span={24}>
            <Row style={{ marginBottom: '12px' }}>
              <Col span={24}>
                <Form layout="inline" onFinish={this.submitRangeForm}>
                  <Form.Item name="range">
                    <RangePicker />
                  </Form.Item>

                  <Form.Item>
                    <Button htmlType="submit" icon={<ArrowRightOutlined />} />
                  </Form.Item>
                </Form>
              </Col>
            </Row>
            <Row>
              {this.state.adminData === null ? (
                <Spin size="small" />
              ) : (
                <>
                  <span className="info">
                    Links: {this.state.adminData.links}
                  </span>
                  <span className="info">
                    Visits: {this.state.adminData.visits}
                  </span>
                  <span className="info">
                    Users: {this.state.adminData.users}
                  </span>
                </>
              )}
            </Row>
          </Col>
        </Row>

        <Row className="primary-row">
          <Col span={24}>
            <EndpointChart endpointData={this.state.endpointData} />
          </Col>
        </Row>
      </>
    );
  }
}
