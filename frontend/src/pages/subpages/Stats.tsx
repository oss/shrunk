/**
 * Implements the link stats view
 * @packageDocumentation
 */

import React from "react";
import { Row, Col, Spin, Select, Button, Popconfirm } from "antd";
import {
  DownloadOutlined,
  ExclamationCircleFilled,
  CloseOutlined,
} from "@ant-design/icons";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

import { LinkInfo, AliasInfo } from "../../components/LinkInfo";
import { GeoipStats, MENU_ITEMS, GeoipChart } from "./StatsCommon";
import { downloadVisitsCsv } from "../../components/Csv";

import "../../Base.less";

/**
 * Props for the [[Stats]] component
 * @interface
 */
export interface Props {
  /**
   * The ID of the link
   * @property
   */
  id: string;
}

/**
 * General summary statistics
 * @interface
 */
interface OverallStats {
  /**
   * The total number of visits to the link
   * @property
   */
  total_visits: number;

  /**
   * The number of unique visits to the link
   * @property
   */
  unique_visits: number;
}

/**
 * Data for one day worth of visits to a link
 * @interface
 */
interface VisitDatum {
  /**
   * The date, represented as year/month/day numbers
   * @property
   */
  _id: { year: number; month: number; day: number };

  /**
   * The total number of visits on the date
   * @property
   */
  all_visits: number;

  /**
   * The number of first-time visits on the date
   * @property
   */
  first_time_visits: number;
}

/**
 * Time-series visit statistics
 * @property
 */
interface VisitStats {
  /**
   * A [[VisitDatum]] for every day in the link's history
   * @property
   */
  visits: VisitDatum[];
}

/**
 * Data for one slice of a pie chart
 * @interface
 */
interface PieDatum {
  /**
   * The name of the slice
   * @property
   */
  name: string;

  /**
   * The value of the slice
   * @property
   */
  y: number;
}

/**
 * Data pertaining to browsers and referers of visitors
 * @interface
 */
interface BrowserStats {
  /**
   * Data for the browser name pie chart
   * @property
   */
  browsers: PieDatum[];

  /**
   * Data for the platform name pie chart
   * @property
   */
  platforms: PieDatum[];

  /**
   * Data for the referer pie chart
   * @property
   */
  referers: PieDatum[];
}

/**
 * State for the [[Stats]] component
 * @interface
 */
interface State {
  /**
   * List of all aliases for the current link
   * @property
   */
  allAliases: AliasInfo[];

  /**
   * The alias for which stats should be displayed, or `null` to display
   * aggregate stats for all aliases
   * @property
   */
  selectedAlias: string | null;

  /**
   * The [[OverallStats]] for the current link/alias
   * @property
   */
  overallStats: OverallStats | null;

  /**
   * The [[VisitStats]] for the current link/alias
   * @property
   */
  visitStats: VisitStats | null;

  /**
   * The [[GeoipStats]] for the current link/alias
   * @property
   */
  geoipStats: GeoipStats | null;

  /**
   * The [[BrowserStats]] for the current link/property
   * @property
   */
  browserStats: BrowserStats | null;

  /**
   * Whether the user may edit the link
   * @property
   */
  mayEdit: boolean | null;
}

/**
 * The [[VisitsChart]] component displays a line graph of total visits and unique
 * visits over time
 * @param props The props
 */
const VisitsChart: React.FC<{ visitStats: VisitStats | null }> = (props) => {
  if (props.visitStats === null) {
    return <Spin />;
  }

  const visits = props.visitStats.visits;
  const getMsSinceEpoch = (datum: VisitDatum) =>
    Date.UTC(datum._id.year, datum._id.month - 1, datum._id.day);

  const options = {
    chart: { type: "spline", zoomType: "x" },
    plotOptions: { spline: { marker: { enabled: true } } },
    exporting: { buttons: { contextButton: { menuItems: MENU_ITEMS } } },
    title: { text: "Visits" },
    subtitle: { text: "Click and drag to zoom in" },
    xAxis: { title: { text: "Date" }, type: "datetime" },
    yAxis: { title: { text: "Visits" }, min: 0 },
    series: [
      {
        name: "Unique visits",
        color: "#fce2cc",
        data: visits.map((el) => [getMsSinceEpoch(el), el.first_time_visits]),
      },
      {
        name: "Total visits",
        color: "#fc580c",
        data: visits.map((el) => [getMsSinceEpoch(el), el.all_visits]),
      },
    ],
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
};

/**
 * The colors for each browser name
 * @constant
 */
const BROWSER_COLORS: Map<string, string> = new Map([
  ["Firefox", "rgba(244,199,133,1.0)"],
  ["Chrome", "rgba(200,240,97,1.0)"],
  ["Safari", "rgba(155,186,238,1.0)"],
  ["Microsoft Internet Explorer", "rgba(136,198,247,1.0)"],
  ["Microsoft Edge", "rgba(136,198,247,1.0)"],
  ["Opera", "rgba(238,120,124,1.0)"],
  ["Unknown", "rgba(80,80,80,0.2)"],
]);

// TODO: iOS, *BSD, etc?
/**
 * The colors for each platform name
 * @constant
 */
const PLATFORM_COLORS: Map<string, string> = new Map([
  ["Linux", "rgba(216,171,36,1.0)"],
  ["Windows", "rgba(129,238,208,1.0)"],
  ["Mac", "rgba(201,201,201,1.0)"],
  ["Android", "rgba(200,227,120,1.0)"],
  ["Unknown", "rgba(80,80,80,0.2)"],
]);

/**
 * The colors for each referer
 * @constant
 */
const REFERER_COLORS: Map<string, string> = new Map([
  ["Facebook", "rgba(0,75,150,1.0)"],
  ["Twitter", "rgba(147,191,241,1.0)"],
  ["Instagram", "rgba(193,131,212,1.0)"],
  ["Reddit", "rgba(241,155,123,1.0)"],
  ["Unknown", "rgba(80,80,80,0.2)"],
]);

/**
 * The [[PieChart]] component displays a pie chart given an array of [[PieDatum]]
 * @param props The props
 */
const PieChart: React.FC<{ title: string; data: PieDatum[] }> = (props) => {
  const options = {
    chart: {
      plotBackgroundColor: null,
      plotBorderWidth: null,
      plotShadow: false,
      type: "pie",
    },
    exporting: { buttons: { contextButton: { menuItems: MENU_ITEMS } } },
    title: { text: props.title },
    tooltip: { pointFormat: "{series.name}: <b>{point.percentage:.1f}%</b>" },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: "pointer",
        showInLegend: true,
        dataLabels: { enabled: false },
      },
    },
    series: [
      {
        name: props.title,
        colorByPoint: true,
        data: props.data,
      },
    ],
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
};

/**
 * The [[BrowserCharts]] component displays a pie chart for each series of data
 * contained in the [[BrowserStats]] object
 * @param props The props
 */
const BrowserCharts: React.FC<{ browserStats: BrowserStats | null }> = (
  props
) => {
  if (props.browserStats === null) {
    return <Spin />;
  }

  const processData = (data: PieDatum[], colors: Map<string, string>) =>
    data.map((datum) => ({ ...datum, color: colors.get(datum.name) }));

  const browserData = processData(props.browserStats.browsers, BROWSER_COLORS);
  const platformData = processData(
    props.browserStats.platforms,
    PLATFORM_COLORS
  );
  const refererData = processData(props.browserStats.referers, REFERER_COLORS);

  return (
    <>
      <Col span={8}>
        <PieChart title="Browsers" data={browserData} />
      </Col>
      <Col span={8}>
        <PieChart title="Platforms" data={platformData} />
      </Col>
      <Col span={8}>
        <PieChart title="Referrers" data={refererData} />
      </Col>
    </>
  );
};

/**
 * The [[Stats]] component implements the link stats view. It allows the user
 * to optionally select an alias, then displays visit stats, GeoIP stats, User-Agent stats,
 * and referer stats
 * @class
 */
export class Stats extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      allAliases: [],
      selectedAlias: null,
      overallStats: null,
      visitStats: null,
      geoipStats: null,
      browserStats: null,
      mayEdit: null,
    };
  }

  async componentDidMount(): Promise<void> {
    await this.updateLinkInfo();
    await this.updateStats();
  }

  async componentDidUpdate(prevProps: Props, prevState: State): Promise<void> {
    if (this.props !== prevProps) {
      await this.updateLinkInfo();
    }

    if (
      this.props !== prevProps ||
      this.state.selectedAlias !== prevState.selectedAlias
    ) {
      await this.updateStats();
    }
  }

  /**
   * Execute API requests to get link info for the current link ID, then update state
   * @method
   */
  updateLinkInfo = async (): Promise<void> => {
    const linkInfo = (await fetch(
      `/api/v1/link/${this.props.id}`
    ).then((resp) => resp.json())) as LinkInfo;
    const aliases = linkInfo.aliases.filter((alias) => !alias.deleted);
    if (aliases.length === 0) {
      throw new Error(`link ${this.props.id} has no aliases!`);
    }

    this.setState({
      allAliases: aliases,
      selectedAlias: null,
      mayEdit: linkInfo.may_edit,
    });
  };

  /**
   * Execute API requests to fetch all stats for the current link and alias, then update
   * state
   * @method
   */
  updateStats = async (): Promise<void> => {
    const baseApiPath =
      this.state.selectedAlias === null
        ? `/api/v1/link/${this.props.id}/stats`
        : `/api/v1/link/${this.props.id}/alias/${this.state.selectedAlias}/stats`;

    const overallPromise = fetch(baseApiPath)
      .then((resp) => resp.json())
      .then((json) => this.setState({ overallStats: json as OverallStats }));
    const visitsPromise = fetch(`${baseApiPath}/visits`)
      .then((resp) => resp.json())
      .then((json) => this.setState({ visitStats: json as VisitStats }));
    const geoipPromise = fetch(`${baseApiPath}/geoip`)
      .then((resp) => resp.json())
      .then((json) => this.setState({ geoipStats: json as GeoipStats }));
    const browsersPromise = fetch(`${baseApiPath}/browser`)
      .then((resp) => resp.json())
      .then((json) => this.setState({ browserStats: json as BrowserStats }));
    await Promise.all([
      overallPromise,
      visitsPromise,
      geoipPromise,
      browsersPromise,
    ]);
  };

  /**
   * Set the alias and then update stats
   * @method
   * @param alias The name of an alias, or a number to select all aliases (stupid hack why did I even do that?)
   */
  setAlias = async (alias: number | string): Promise<void> => {
    if (typeof alias === "number") {
      this.setState({ selectedAlias: null });
    } else {
      this.setState({ selectedAlias: alias });
    }

    await this.updateStats();
  };

  /**
   * Prompt the user to download a CSV file of visits to the selected alias
   * @method
   */
  downloadCsv = async (): Promise<void> => {
    await downloadVisitsCsv(this.props.id, this.state.selectedAlias);
  };

  /**
   * Execute API requests to clear visit data associated with a link
   * @method
   */
  clearVisitData = async (): Promise<void> => {
    await fetch(`/api/v1/link/${this.props.id}/clear_visits`, {
      method: "POST",
    });
    await this.updateStats();
  };

  render(): React.ReactNode {
    return (
      <>
        <Row className="primary-row">
          <Col span={16}>
            <span className="page-title">Stats</span>
            {this.state.overallStats === null ? (
              <></>
            ) : (
              <span>
                Total visits: {this.state.overallStats.total_visits}&nbsp; First
                time visits: {this.state.overallStats.unique_visits}
              </span>
            )}
          </Col>

          <Col span={8} className="btn-col">
            {!this.state.mayEdit ? (
              <></>
            ) : (
              <Popconfirm
                placement="bottom"
                title="Are you sure you want to clear all visit data associated with this link? This operation cannot be undone."
                onConfirm={this.clearVisitData}
                icon={<ExclamationCircleFilled style={{ color: "red" }} />}
              >
                <Button danger>
                  <CloseOutlined /> Clear visit data
                </Button>
              </Popconfirm>
            )}

            <Button onClick={this.downloadCsv}>
              <DownloadOutlined /> Download visits as CSV
            </Button>

            {this.state.allAliases.length === 1 ? (
              <></>
            ) : (
              <Select onSelect={this.setAlias} defaultValue={0}>
                <Select.Option value={0}>
                  <b>All aliases</b>
                </Select.Option>

                {this.state.allAliases.map((alias) => (
                  <Select.Option key={alias.alias} value={alias.alias}>
                    {alias.alias}&nbsp;
                    {alias.description ? <em>({alias.description})</em> : <></>}
                  </Select.Option>
                ))}
              </Select>
            )}
          </Col>
        </Row>

        <Row className="primary-row">
          <Col span={24}>
            <VisitsChart visitStats={this.state.visitStats} />
          </Col>
        </Row>

        <Row className="primary-row">
          <Col span={24}>
            <GeoipChart geoipStats={this.state.geoipStats} />
          </Col>
        </Row>

        <Row className="primary-row">
          <BrowserCharts browserStats={this.state.browserStats} />
        </Row>
      </>
    );
  }
}
