/**
 * Implements the link stats view
 * @packageDocumentation
 */

import React, { useEffect, useState } from 'react';
import {
  Row,
  Space,
  Col,
  Spin,
  Select,
  Button,
  Popconfirm,
  Typography,
  Tag,
  Card,
  Statistic,
  Descriptions,
  Table,
  message,
} from 'antd/lib';
import {
  ExclamationCircleFilled,
  ClearOutlined,
  CloudDownloadOutlined,
  LoadingOutlined,
  GlobalOutlined,
  EditOutlined,
  TeamOutlined,
  ShareAltOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import dayjs from 'dayjs';
import { useLocation } from 'react-router-dom';

import { LinkInfo, AliasInfo } from '../../components/LinkInfo';
import { GeoipStats, MENU_ITEMS, GeoipChart } from './StatsCommon';
import { downloadVisitsCsv } from '../../components/Csv';

import { daysBetween } from '../../lib/utils';
import ShareModal from '../../modals/ShareModal';
import {
  EditLinkFormValues,
  EditLinkDrawer,
} from '../../drawers/EditLinkDrawer';
import CollaboratorModal, { Entity } from '../../modals/CollaboratorModal';

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

  netid: string;
  userPrivileges: Set<string>;
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
 * The [[VisitsChart]] component displays a line graph of total visits and unique
 * visits over time
 * @param props The props
 */
const VisitsChart: React.FC<{ visitStats: VisitStats | null }> = (props) => {
  if (props.visitStats === null) {
    return <Spin />;
  }

  const { visits } = props.visitStats;
  const getMsSinceEpoch = (datum: VisitDatum) =>
    Date.UTC(datum._id.year, datum._id.month - 1, datum._id.day);

  const options = {
    chart: { type: 'spline', zoomType: 'x' },
    credits: { enabled: false },
    plotOptions: { spline: { marker: { enabled: true } } },
    exporting: { buttons: { contextButton: { menuItems: MENU_ITEMS } } },
    title: { text: '' },
    xAxis: {
      title: { text: '' },
      type: 'datetime',
      dateTimeLabelFormats: {
        day: '%b %e', // Format as "Dec 4"
      },
    },
    yAxis: { title: { text: '' }, min: 0 },
    series: [
      {
        name: 'Unique visits',
        color: '#fce2cc',
        data: visits.map((el) => [getMsSinceEpoch(el), el.first_time_visits]),
      },
      {
        name: 'Total visits',
        color: '#fc580c',
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
  ['Firefox', 'rgba(244,199,133,1.0)'],
  ['Chrome', 'rgba(200,240,97,1.0)'],
  ['Safari', 'rgba(155,186,238,1.0)'],
  ['Microsoft Internet Explorer', 'rgba(136,198,247,1.0)'],
  ['Microsoft Edge', 'rgba(136,198,247,1.0)'],
  ['Opera', 'rgba(238,120,124,1.0)'],
  ['Unknown', 'rgba(80,80,80,0.2)'],
]);

// TODO: iOS, *BSD, etc?
/**
 * The colors for each platform name
 * @constant
 */
const PLATFORM_COLORS: Map<string, string> = new Map([
  ['Linux', 'rgba(216,171,36,1.0)'],
  ['Windows', 'rgba(129,238,208,1.0)'],
  ['Mac', 'rgba(201,201,201,1.0)'],
  ['Android', 'rgba(200,227,120,1.0)'],
  ['Unknown', 'rgba(80,80,80,0.2)'],
]);

/**
 * The colors for each referer
 * @constant
 */
const REFERER_COLORS: Map<string, string> = new Map([
  ['Facebook', 'rgba(0,75,150,1.0)'],
  ['Twitter', 'rgba(147,191,241,1.0)'],
  ['Instagram', 'rgba(193,131,212,1.0)'],
  ['Reddit', 'rgba(241,155,123,1.0)'],
  ['Unknown', 'rgba(80,80,80,0.2)'],
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
      type: 'pie',
    },
    credits: { enabled: false },
    exporting: { buttons: { contextButton: { menuItems: MENU_ITEMS } } },
    title: { text: props.title },
    tooltip: { pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>' },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: 'pointer',
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
  props,
) => {
  if (props.browserStats === null) {
    return <Spin />;
  }

  const processData = (data: PieDatum[], colors: Map<string, string>) =>
    data.map((datum) => ({ ...datum, color: colors.get(datum.name) }));

  const browserData = processData(props.browserStats.browsers, BROWSER_COLORS);
  const platformData = processData(
    props.browserStats.platforms,
    PLATFORM_COLORS,
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

export function Stats(props: Props): React.ReactElement {
  const showPurge = false;

  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null);
  const [allAliases, setAllAliases] = useState<AliasInfo[]>([]);
  const [selectedAlias, setSelectedAlias] = useState<string | null>(null);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [visitStats, setVisitStats] = useState<VisitStats | null>(null);
  const [geoipStats, setGeoipStats] = useState<GeoipStats | null>(null);
  const [browserStats, setBrowserStats] = useState<BrowserStats | null>(null);
  const [mayEdit, setMayEdit] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [statsKey, setStatsKey] = useState<string>('alias');

  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [collabModalVisible, setCollabModalVisible] = useState<boolean>(false);
  const [shareModalVisible, setShareModalVisible] = useState<boolean>(false);

  const [entities, setEntities] = useState<Entity[]>([]);

  const [topReferrer, setTopReferrer] = useState<string | null>(null);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const mode = queryParams.get('mode');

  useEffect(() => {
    switch (mode) {
      case 'edit':
        setEditModalVisible(true);
        break;
      case 'collaborate':
        setCollabModalVisible(true);
        break;
      case 'share':
        setShareModalVisible(true);
        break;
      default:
        break;
    }
  }, [mode]);

  async function updateLinkInfo() {
    const templinkInfo = (await fetch(`/api/v1/link/${props.id}`).then((resp) =>
      resp.json(),
    )) as LinkInfo;

    const aliases = !templinkInfo.deleted
      ? templinkInfo.aliases.filter((alias) => !alias.deleted)
      : templinkInfo.aliases;

    setLinkInfo(templinkInfo);
    setAllAliases(aliases);
    setSelectedAlias(null);
    setMayEdit(templinkInfo.may_edit);

    const tempEntities: Entity[] = [];
    const mentionedIds = new Set<string>();

    tempEntities.push({
      _id: templinkInfo.owner,
      type: 'netid',
      role: 'owner',
    });

    templinkInfo.editors.forEach((editor) => {
      tempEntities.push({
        _id: editor._id,
        type: editor.type,
        role: 'editor',
      });
      mentionedIds.add(editor._id);
    });
    templinkInfo.viewers.forEach((viewer) => {
      if (mentionedIds.has(viewer._id)) {
        return;
      }

      tempEntities.push({
        _id: viewer._id,
        type: viewer.type,
        role: 'viewer',
      });
    });
    setEntities(tempEntities);
  }

  async function updateStats() {
    const baseApiPath =
      selectedAlias === null
        ? `/api/v1/link/${props.id}/stats`
        : `/api/v1/link/${props.id}/alias/${selectedAlias}/stats`;

    const overallPromise = fetch(baseApiPath)
      .then((resp) => resp.json())
      .then((json) => {
        setOverallStats(json as OverallStats);
      });

    const visitsPromise = fetch(`${baseApiPath}/visits`)
      .then((resp) => resp.json())
      .then((json) => {
        setVisitStats(json as VisitStats);
      });

    const geoipPromise = fetch(`${baseApiPath}/geoip`)
      .then((resp) => resp.json())
      .then((json) => {
        setGeoipStats(json as GeoipStats);
      });

    const browsersPromise = fetch(`${baseApiPath}/browser`)
      .then((resp) => resp.json())
      .then((json) => {
        setBrowserStats(json as BrowserStats);
      });

    await Promise.all([
      overallPromise,
      visitsPromise,
      geoipPromise,
      browsersPromise,
    ]);
  }

  useEffect(() => {
    const fetchData = async () => {
      await updateLinkInfo();
      await updateStats();
    };

    fetchData();
  }, [props.id]);

  useEffect(() => {
    if (browserStats !== null && browserStats.referers.length > 0) {
      setTopReferrer(browserStats.referers[0].name);
    }
  }, [browserStats]);

  /**
   * Executes API requests to update a link
   * @param values The form values from the edit link form
   */
  async function doEditLink(values: EditLinkFormValues): Promise<void> {
    const oldLinkInfo = linkInfo;
    if (oldLinkInfo === null) {
      throw new Error('oldLinkInfo should not be null');
    }

    // Create the request to edit title, long_url, and expiration_time
    const patchReq: Record<string, any> = {};
    if (values.title !== oldLinkInfo.title) {
      patchReq.title = values.title;
    }
    if (values.long_url !== oldLinkInfo.long_url) {
      patchReq.long_url = values.long_url;
    }
    if (values.owner !== oldLinkInfo.owner) {
      patchReq.owner = values.owner;
    }
    if (values.expiration_time !== oldLinkInfo.expiration_time) {
      patchReq.expiration_time =
        values.expiration_time === null
          ? null
          : values.expiration_time.format();
    }

    const promises = [];
    const patchRequest = await fetch(`/api/v1/link/${props.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patchReq),
    });

    // //get the status and the json message
    const patchRequestStatus = patchRequest.status;

    if (patchRequestStatus !== 204) {
      message.error('There was an error editing the link.', 4);
      return;
    }

    const oldAliases = new Map(
      oldLinkInfo.aliases.map((alias) => [alias.alias, alias]),
    );
    const newAliases = new Map(
      values.aliases.map((alias) => [alias.alias, alias]),
    );

    // Delete aliases that no longer exist
    Array.from(oldAliases.keys())
      .filter((alias) => !newAliases.has(alias))
      .forEach((alias) => {
        promises.push(
          fetch(`/api/v1/link/${props.id}/alias/${alias}`, {
            method: 'DELETE',
          }),
        );
      });

    // Create/update aliases
    Array.from(newAliases.entries())
      .filter(([alias, info]) => {
        const isNew = !oldAliases.has(alias);
        const isDescriptionChanged =
          oldAliases.has(alias) &&
          info.description !== oldAliases.get(alias)?.description;
        return isNew || isDescriptionChanged;
      })
      .forEach(([alias, info]) => {
        promises.push(
          fetch(`/api/v1/link/${props.id}/alias`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              alias,
              description: info.description,
            }),
          }),
        );
      });
  }

  /**
   * Set the alias and then update stats
   * @method
   * @param alias The name of an alias, or a number to select all aliases (stupid hack why did I even do that?)
   */
  const setAlias = async (alias: number | string): Promise<void> => {
    if (typeof alias === 'number') {
      setSelectedAlias(null);
    } else {
      setSelectedAlias(alias);
    }

    await updateStats();
  };

  /**
   * Prompt the user to download a CSV file of visits to the selected alias
   * @method
   */
  const downloadCsv = async (): Promise<void> => {
    setLoading(true);
    await downloadVisitsCsv(props.id, selectedAlias);
    setLoading(false);
  };

  /**
   * Execute API requests to clear visit data associated with a link
   * @method
   */
  const clearVisitData = async (): Promise<void> => {
    await fetch(`/api/v1/link/${props.id}/clear_visits`, {
      method: 'POST',
    });
    await updateStats();
  };

  const averageClicks = (): number => {
    if (overallStats === null || linkInfo === null) {
      return 0;
    }

    return (
      overallStats.total_visits /
      (daysBetween(new Date(linkInfo.created_time)) + 1)
    );
  };

  async function onAddCollaborator(entity: Entity) {
    const patchReq = {
      acl: `${entity.role}s`,
      action: 'add',
      entry: {
        _id: entity._id,
        type: entity.type,
      },
    };

    await fetch(`/api/v1/link/${props.id}/acl`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(patchReq),
    });
    updateLinkInfo();
  }

  async function onRemoveCollaborator(entity: Entity, role?: string) {
    const patchReq = {
      acl: `viewers`,
      action: 'remove',
      entry: { _id: entity._id, type: entity.type },
    };

    if (role === 'viewer' || role === undefined) {
      await fetch(`/api/v1/link/${props.id}/acl`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(patchReq),
      });
    }

    patchReq.acl = 'editors';

    if (role === 'editor' || role === undefined) {
      await fetch(`/api/v1/link/${props.id}/acl`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(patchReq),
      });
    }

    updateLinkInfo();
  }

  const onAddEntity = (activeTab: 'netid' | 'org', entity: Entity) => {
    onAddCollaborator({
      _id: entity._id,
      type: activeTab,
      role: entity.role,
    });
  };

  const onRemoveEntity = (activeTab: 'netid' | 'org', entity: Entity) => {
    onRemoveCollaborator(entity);
  };

  const onChangeEntity = (
    activeTab: 'netid' | 'org',
    entity: Entity,
    value: string,
  ) => {
    // Remove viewer if they're an editor
    // Search "# SHARING_ACL_REFACTOR" for the following comment
    if (value === 'viewer' && entity.role === 'editor') {
      onRemoveCollaborator(entity, 'editor');
      return;
    }

    onAddCollaborator({
      _id: entity._id,
      type: activeTab,
      role: value,
    });
  };

  const statTabsKeys = [
    {
      key: 'alias',
      tab: !linkInfo?.is_tracking_pixel_link ? 'Alias' : 'Installation',
    },
    { key: 'visits', tab: 'Visits' },
    { key: 'geoip', tab: 'Location' },
    { key: 'browser', tab: 'Metadata' },
  ];

  const isDev = process.env.NODE_ENV === 'development';
  const protocol = isDev ? 'http' : 'https';
  const trackingUrl = linkInfo
    ? `${protocol}://${document.location.host}/api/v1/t/${linkInfo.aliases[0].alias}`
    : '';

  const statTabs: Record<string, React.ReactNode> = {
    visits: <VisitsChart visitStats={visitStats} />,
    geoip: <GeoipChart geoipStats={geoipStats} />,
    browser: (
      <Row>
        <BrowserCharts browserStats={browserStats} />
      </Row>
    ),
    alias: !linkInfo?.is_tracking_pixel_link ? (
      <Table
        showHeader={false}
        size="small"
        dataSource={allAliases.map((alias) => ({
          alias: alias.alias,
          description: alias.description,
        }))}
        columns={[
          {
            title: 'Alias',
            dataIndex: 'alias',
            key: 'alias',
            width: '25%',
            render: (alias) => {
              const shortUrl = `${protocol}://${document.location.host}/${alias}`;
              return (
                <Button
                  type="text"
                  onClick={() => navigator.clipboard.writeText(shortUrl)}
                >
                  <Space>
                    <CopyOutlined />
                    <Typography.Text>{alias}</Typography.Text>
                  </Space>
                </Button>
              );
            },
          },
          {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
          },
        ]}
        pagination={{ pageSize: 5 }}
        footer={() =>
          linkInfo?.deleted
            ? 'Since this link is deleted, these aliases are available for anyone to grab.'
            : ''
        }
      />
    ) : (
      <>
        <Typography.Title level={3} className="tw-mt-0">
          How to use
        </Typography.Title>
        <Typography.Text>
          If you are a developer and would like to incorporate it into your
          site, just add an image reference into your HTML or JavaScript file.
          <pre>
            &lt;img src=&quot;{trackingUrl}&quot; style=&quot;display:none&quot;
            alt=&quot;&quot;/&gt;
          </pre>
        </Typography.Text>
      </>
    ),
  };

  return (
    <>
      <Row justify="space-between" align="middle">
        <Col span={16}>
          <Row>
            <Space style={{ marginBottom: 19, marginTop: 19 }}>
              <Typography.Title style={{ margin: 0 }} ellipsis>
                {linkInfo?.title}
              </Typography.Title>

              <Tag color="red">
                {linkInfo?.is_tracking_pixel_link ? 'Tracking Pixel' : 'Link'}
              </Tag>
            </Space>
          </Row>
        </Col>

        <Col>
          <Space>
            {mayEdit && (
              <>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => {
                    setEditModalVisible(true);
                  }}
                >
                  Edit
                </Button>
                <Button
                  icon={<TeamOutlined />}
                  onClick={() => {
                    setCollabModalVisible(true);
                  }}
                >
                  Collaborate
                </Button>
              </>
            )}
            <Button
              type="primary"
              icon={<ShareAltOutlined />}
              onClick={() => setShareModalVisible(true)}
              disabled={linkInfo?.is_tracking_pixel_link}
            >
              Share
            </Button>
          </Space>
        </Col>
      </Row>

      <Row justify="space-around" gutter={[16, 16]}>
        {overallStats === null || linkInfo === null ? (
          <></>
        ) : (
          <>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Total Clicks"
                  value={overallStats.total_visits}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Unique Clicks"
                  value={overallStats.unique_visits}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Avg. Clicks/Day"
                  value={averageClicks()}
                  precision={2}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Most Popular Referrer"
                  value={topReferrer !== null ? topReferrer : 'None'}
                />
              </Card>
            </Col>
          </>
        )}
        <Col span={12}>
          <Card
            title="Details"
            style={{ height: '100%' }}
            extra={
              allAliases.length === 1 ? (
                <></>
              ) : (
                <Select
                  onSelect={setAlias}
                  defaultValue={0}
                  popupMatchSelectWidth={false}
                >
                  <Select.Option value={0}>
                    <GlobalOutlined />
                  </Select.Option>

                  {allAliases.map((alias) => (
                    <Select.Option key={alias.alias} value={alias.alias}>
                      {alias.alias}&nbsp;
                      {alias.description ? (
                        <em>({alias.description})</em>
                      ) : (
                        <></>
                      )}
                    </Select.Option>
                  ))}
                </Select>
              )
            }
          >
            <Descriptions column={1} colon={false}>
              <Descriptions.Item label="Owner">
                {linkInfo?.owner}
              </Descriptions.Item>
              {linkInfo?.is_tracking_pixel_link ? (
                <></>
              ) : (
                <Descriptions.Item label="Long URL">
                  {linkInfo?.long_url}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Date Created">
                {dayjs(linkInfo?.created_time).format('MMM D, YYYY - h:mm A')}
              </Descriptions.Item>
              <Descriptions.Item label="Date Expires">
                {linkInfo?.expiration_time
                  ? dayjs(linkInfo?.expiration_time).format(
                      'MMM D, YYYY - h:mm A',
                    )
                  : 'N/A'}
              </Descriptions.Item>
              {linkInfo?.deleted && linkInfo.deletion_info !== null && (
                <>
                  <Descriptions.Item label="Date Deleted">
                    {dayjs(linkInfo.deletion_info.deleted_time).format(
                      'MMM D, YYYY - h:mm A',
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Deleted by">
                    {linkInfo.deletion_info.deleted_by}
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>
          </Card>
        </Col>
        <Col span={12}>
          <Card
            tabList={statTabsKeys}
            activeTabKey={statsKey}
            onTabChange={(newKey) => setStatsKey(newKey)}
            tabBarExtraContent={
              <Space>
                <Button
                  icon={
                    loading ? (
                      <LoadingOutlined spin />
                    ) : (
                      <CloudDownloadOutlined />
                    )
                  }
                  onClick={downloadCsv}
                >
                  Export
                </Button>
                {mayEdit && showPurge && (
                  <Popconfirm
                    placement="bottom"
                    title="Are you sure? This action cannot be undone."
                    onConfirm={clearVisitData}
                    icon={<ExclamationCircleFilled style={{ color: 'red' }} />}
                  >
                    <Button danger icon={<ClearOutlined />}>
                      Purge
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            }
          >
            {statTabs[statsKey]}
          </Card>
        </Col>
      </Row>
      {linkInfo && (
        <>
          <EditLinkDrawer
            visible={editModalVisible}
            userPrivileges={props.userPrivileges}
            netid={props.netid}
            linkInfo={linkInfo}
            onOk={async (values) => {
              await doEditLink(values);
              setEditModalVisible(false);
            }}
            onCancel={() => {
              setEditModalVisible(false);
            }}
          />

          <CollaboratorModal
            visible={collabModalVisible}
            roles={[
              { label: 'Owner', value: 'owner' },
              { label: 'Editor', value: 'editor' },
              { label: 'Viewer', value: 'viewer' },
            ]}
            people={entities}
            onAddEntity={onAddEntity}
            onChangeEntity={onChangeEntity}
            onRemoveEntity={onRemoveEntity}
            onOk={() => {
              setCollabModalVisible(false);
            }}
            onCancel={() => {
              setCollabModalVisible(false);
            }}
          />

          <ShareModal
            linkInfo={linkInfo}
            visible={shareModalVisible}
            onCancel={() => {
              setShareModalVisible(false);
            }}
          />
        </>
      )}
    </>
  );
}
