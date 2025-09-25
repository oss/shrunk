/**
 * Implements the link stats view
 * @packageDocumentation
 */

import {
  Button,
  Card,
  Col,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
  message,
  Tooltip,
  Select,
  Descriptions,
  QRCode,
  QRCodeProps,
  Flex,
} from 'antd/lib';
import dayjs from 'dayjs';
import {
  CloudDownloadIcon,
  CopyIcon,
  Download,
  PencilIcon,
  UsersIcon,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { useLocation } from 'react-router-dom';
import { downloadVisits } from '../../api/csv';
import {
  BrowserStats,
  Link,
  LinkSharedWith,
  OverallStats,
  VisitStats,
  EditLinkValues,
  StatChart,
  GeoipStats,
} from '../../interfaces/link';

import {
  addCollaborator,
  editLink,
  getLink,
  getLinkBrowserStats,
  getLinkGeoIpStats,
  getLinkStats,
  getLinkVisitsStats,
  removeCollaborator,
} from '../../api/links';
import { EditLinkDrawer } from '../../drawers/EditLinkDrawer';
import {
  daysBetween,
  getLinkFromAlias,
  getRedirectFromAlias,
} from '../../lib/utils';
import CollaboratorModal, {
  Collaborator,
} from '../../modals/CollaboratorModal';
import ErrorPage from '../ErrorPage';
import VisitsChart from '../../components/link/visits-chart';
import GeoipChart from '../../components/link/world-chart';
import ShrunkPieChart, { processData } from '../../components/pie-chart';

export interface Props {
  /**
   * The ID of the link
   * @property
   */
  id: string;

  netid: string;
  userPrivileges: Set<string>;
}

const browserColors: Map<string, string> = new Map([
  ['Firefox', 'rgba(244,199,133,1.0)'],
  ['Chrome', 'rgba(200,240,97,1.0)'],
  ['Safari', 'rgba(155,186,238,1.0)'],
  ['Microsoft Internet Explorer', 'rgba(136,198,247,1.0)'],
  ['Microsoft Edge', 'rgba(136,198,247,1.0)'],
  ['Opera', 'rgba(238,120,124,1.0)'],
  ['Unknown', 'rgba(80,80,80,0.2)'],
]);

const platformColors: Map<string, string> = new Map([
  ['Linux', 'rgba(216,171,36,1.0)'],
  ['Windows', 'rgba(129,238,208,1.0)'],
  ['Mac', 'rgba(201,201,201,1.0)'],
  ['Android', 'rgba(200,227,120,1.0)'],
  ['Unknown', 'rgba(80,80,80,0.2)'],
]);

const referralColors: Map<string, string> = new Map([
  ['Facebook', 'rgba(0,75,150,1.0)'],
  ['Twitter', 'rgba(147,191,241,1.0)'],
  ['Instagram', 'rgba(193,131,212,1.0)'],
  ['Reddit', 'rgba(241,155,123,1.0)'],
  ['Unknown', 'rgba(80,80,80,0.2)'],
]);

function doDownload(url: string, fileName: string) {
  const a = document.createElement('a');
  a.download = fileName;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function Stats(props: Props): React.ReactElement {
  const [linkInfo, setLinkInfo] = useState<Link | null>(null);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [visitStats, setVisitStats] = useState<VisitStats | null>(null);
  const [geoipStats, setGeoipStats] = useState<GeoipStats>();
  const [browserStats, setBrowserStats] = useState<BrowserStats | null>(null);
  const [mayEdit, setMayEdit] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [statsKey, setStatsKey] = useState<StatChart>(StatChart.Visits);
  const [qrcodeErrorLevel, setQrcodeErrorLevel] =
    useState<QRCodeProps['errorLevel']>('H');

  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [collabModalVisible, setCollabModalVisible] = useState<boolean>(false);

  const [entities, setEntities] = useState<Collaborator[]>([]);

  const [topReferrer, setTopReferrer] = useState<string | null>(null);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const mode = queryParams.get('mode');
  const size = 250;

  useEffect(() => {
    switch (mode) {
      case 'edit':
        setEditModalVisible(true);
        break;
      case 'collaborate':
        setCollabModalVisible(true);
        break;
      default:
        break;
    }
  }, [mode]);

  async function updateLinkInfo() {
    const templinkInfo = await getLink(props.id);

    setLinkInfo(templinkInfo);
    setMayEdit(templinkInfo.may_edit);

    const tempEntities: Collaborator[] = [];
    const mentionedIds = new Set<string>();

    tempEntities.push({
      _id: templinkInfo.owner._id,
      type: templinkInfo.owner.type,
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
    setOverallStats(await getLinkStats(props.id));
    setVisitStats(await getLinkVisitsStats(props.id));
    setGeoipStats(await getLinkGeoIpStats(props.id));
    setBrowserStats(await getLinkBrowserStats(props.id));
  }

  useEffect(() => {
    const fetchData = async () => {
      await updateLinkInfo();
      await updateStats();
    };

    fetchData().then(() => {
      setLoading(false);
    });
  }, [props.id]);

  if (!loading && linkInfo === null) {
    return (
      <ErrorPage
        title="Link not found."
        description="This link is either deleted or doesn't exist"
      />
    );
  }

  useEffect(() => {
    if (browserStats !== null && browserStats.referers.length > 0) {
      setTopReferrer(browserStats.referers[0].name);
    }
  }, [browserStats]);

  /**
   * Executes API requests to update a link
   * @param values The form values from the edit link form
   */
  async function doEditLink(values: EditLinkValues): Promise<void> {
    const oldLinkInfo = linkInfo;
    if (oldLinkInfo === null) {
      throw new Error('oldLinkInfo should not be null');
    }

    // Create the request to edit title, long_url, and expiration_time
    const patchReq: EditLinkValues = {};
    if (values.title !== oldLinkInfo.title) {
      patchReq.title = values.title;
    }
    if (values.long_url !== oldLinkInfo.long_url) {
      patchReq.long_url = values.long_url;
    }
    if (values.owner._id !== oldLinkInfo.owner._id) {
      patchReq.owner = {
        _id: values.owner._id,
        type: 'netid',
      };
    }
    if (values.expiration_time !== oldLinkInfo.expiration_time) {
      patchReq.expiration_time =
        values.expiration_time === null
          ? null
          : values.expiration_time.format();
    }

    const patchRequest = await editLink(props.id, patchReq);

    // //get the status and the json message
    const patchRequestStatus = patchRequest.status;

    if (patchRequestStatus !== 204) {
      message.error('There was an error editing the link.', 4);
    }
  }

  /**
   * Prompt the user to download a CSV file of visits to the selected alias
   * @method
   */
  const downloadCsv = async (): Promise<void> => {
    if (linkInfo === null) {
      return;
    }

    await downloadVisits(props.id);
  };

  const downloadCanvasQRCode = () => {
    const canvas = document
      .getElementById('qrcode')
      ?.querySelector<HTMLCanvasElement>('canvas');
    if (canvas) {
      const url = canvas.toDataURL();
      doDownload(url, `${linkInfo?.alias}.png`);
    }
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

  async function onAddCollaborator(
    collaborator: LinkSharedWith,
    role: 'viewer' | 'editor',
  ) {
    await addCollaborator(props.id, collaborator, role);
    await updateLinkInfo();
  }

  async function onRemoveCollaborator(
    entity: LinkSharedWith,
    role?: 'viewer' | 'editor',
  ) {
    await removeCollaborator(props.id, entity, role);
    await updateLinkInfo();
  }

  const onAddEntity = (activeTab: 'netid' | 'org', entity: Collaborator) => {
    onAddCollaborator(
      {
        _id: entity._id,
        type: activeTab,
      },
      entity.role as 'viewer' | 'editor',
    );
  };

  const onRemoveEntity = (activeTab: 'netid' | 'org', entity: Collaborator) => {
    onRemoveCollaborator(entity);
  };

  const transferOwnershipToOrg = (
    activeTab: 'netid' | 'org',
    entity: Collaborator,
  ) => {
    editLink(props.id, {
      owner: {
        _id: entity._id,
        type: activeTab,
      },
    })
      .then(() => {
        message.success('Ownership transferred successfully');
        updateLinkInfo();
      })
      .catch(() => {
        message.error('Failed to transfer ownership');
      });
  };

  const onChangeEntity = (
    activeTab: 'netid' | 'org',
    entity: Collaborator,
    value: string,
  ) => {
    // Remove viewer if they're an editor
    // Search "# SHARING_ACL_REFACTOR" for the following comment

    if (activeTab === 'org' && value === 'owner') {
      transferOwnershipToOrg(activeTab, entity);
      return;
    }

    if (value === 'viewer' && entity.role === 'editor') {
      onRemoveCollaborator(entity, 'editor');
      return;
    }

    onAddCollaborator(
      {
        _id: entity._id,
        type: activeTab,
      },
      value as 'viewer' | 'editor',
    );
  };

  const statTabs: Record<StatChart, React.ReactNode> = {
    Visits: <VisitsChart visitStats={visitStats} />,
    GeoIP: <GeoipChart data={geoipStats} />,
    Browser: (
      <ShrunkPieChart
        data={processData(browserStats?.browsers ?? [], browserColors)}
      />
    ),
    Platform: (
      <ShrunkPieChart
        data={processData(browserStats?.platforms ?? [], platformColors)}
      />
    ),
    Referral: (
      <ShrunkPieChart
        data={processData(browserStats?.referers ?? [], referralColors)}
      />
    ),
  };

  const dateCreatedText = dayjs(linkInfo?.created_time).format('MMMM D, YYYY');
  const dateExpiresText = linkInfo?.expiration_time
    ? dayjs(linkInfo?.expiration_time).format('MMMM D, YYYY')
    : 'Never';

  const isTrackingPixel = linkInfo?.is_tracking_pixel_link;

  return (
    <>
      <Row justify="space-between" align="middle">
        <Col span={16}>
          <Row>
            <Space style={{ marginBottom: 19, marginTop: 19 }}>
              <Typography.Title style={{ margin: 0 }} ellipsis>
                {!linkInfo?.is_tracking_pixel_link
                  ? getLinkFromAlias(linkInfo?.alias, false)
                  : linkInfo?.alias}
              </Typography.Title>

              <Tag color="red">
                {linkInfo?.is_tracking_pixel_link ? 'Tracking Pixel' : 'Link'}
              </Tag>
            </Space>
          </Row>
        </Col>

        <Col>
          <Space>
            <Tooltip title="Copy link to clipboard">
              <Button
                icon={<CopyIcon />}
                onClick={() =>
                  navigator.clipboard.writeText(
                    linkInfo
                      ? getRedirectFromAlias(
                          linkInfo.alias,
                          linkInfo.is_tracking_pixel_link,
                        )
                      : '',
                  )
                }
              >
                Copy
              </Button>
            </Tooltip>
            {mayEdit && (
              <>
                <Button
                  icon={<PencilIcon />}
                  onClick={() => {
                    setEditModalVisible(true);
                  }}
                >
                  Edit
                </Button>
                <Button
                  icon={<UsersIcon />}
                  onClick={() => {
                    setCollabModalVisible(true);
                  }}
                >
                  Collaborate
                </Button>
              </>
            )}
          </Space>
        </Col>
      </Row>

      <Row justify="space-around" gutter={[16, 16]}>
        <Col span={24}>
          <Card title="Details">
            <Row gutter={[16, 16]}>
              {!linkInfo?.is_tracking_pixel_link && (
                <Col>
                  <Flex vertical gap="middle" align="center">
                    <QRCode
                      id="qrcode"
                      errorLevel={qrcodeErrorLevel}
                      size={size}
                      iconSize={size / 4}
                      value={
                        linkInfo
                          ? getRedirectFromAlias(linkInfo.alias, false)
                          : ''
                      }
                    />
                    <Space>
                      <Select
                        className="tw-w-24"
                        defaultValue={qrcodeErrorLevel}
                        options={[
                          { value: 'L', label: 'Low' },
                          { value: 'M', label: 'Medium' },
                          { value: 'Q', label: 'Quartile' },
                          { value: 'H', label: 'High' },
                        ]}
                        onChange={(value: QRCodeProps['errorLevel']) => {
                          setQrcodeErrorLevel(value);
                        }}
                      />
                      <Button
                        icon={<Download />}
                        onClick={downloadCanvasQRCode}
                      >
                        Download
                      </Button>
                    </Space>
                  </Flex>
                </Col>
              )}
              <Col flex="auto">
                <Row gutter={[16, 16]} justify="space-between">
                  <Col span={24}>
                    <Descriptions
                      bordered
                      items={[
                        ...(isTrackingPixel
                          ? []
                          : [
                              {
                                key: 'original_url',
                                label: 'Original URL',
                                children: linkInfo?.long_url,
                                span: 'filled',
                              },
                            ]),
                        {
                          key: 'owner',
                          label: 'Owner',
                          children:
                            linkInfo?.owner.type === 'org' ? (
                              <a href={`/app/orgs/${linkInfo.owner._id}`}>
                                {linkInfo.owner.org_name}
                              </a>
                            ) : (
                              linkInfo?.owner._id
                            ),
                          span: isTrackingPixel ? 1 : 'filled',
                        },
                        {
                          key: 'date_created',
                          label: 'Date Created',
                          children: dateCreatedText,
                          span: 1,
                        },
                        ...(isTrackingPixel
                          ? []
                          : [
                              {
                                key: 'date_expires',
                                label: 'Date Expires',
                                children: dateExpiresText,
                                span: 1,
                              },
                            ]),
                      ]}
                    />
                  </Col>
                </Row>
              </Col>
            </Row>
          </Card>
        </Col>
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
        <Col span={24}>
          <Card
            title="Statistics"
            extra={
              <Space>
                <Select
                  defaultValue={StatChart.Visits}
                  className="tw-w-28"
                  onChange={(value: StatChart) => {
                    setStatsKey(value);
                  }}
                  options={[
                    { value: StatChart.Visits, label: 'Visits' },
                    { value: StatChart.GeoIP, label: 'Location' },
                    { value: StatChart.Browser, label: 'Browser' },
                    { value: StatChart.Platform, label: 'Platform' },
                    {
                      value: StatChart.Referral,
                      label: 'Referral',
                    },
                  ]}
                />
                <Tooltip title="Export data as a CSV">
                  <Button
                    icon={<CloudDownloadIcon />}
                    loading={loading}
                    onClick={downloadCsv}
                  >
                    Export
                  </Button>
                </Tooltip>
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
        </>
      )}
    </>
  );
}
