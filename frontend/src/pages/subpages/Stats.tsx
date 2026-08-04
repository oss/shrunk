import dayjs, { Dayjs } from 'dayjs';
import { QRCodeCanvas } from 'qrcode.react';
import {
  CloudDownloadIcon,
  CopyIcon,
  Download,
  PencilIcon,
  UsersIcon,
  Loader2Icon,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import {
  Link as RouterLink,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router';
import { downloadVisits } from '@/api/csv';
import {
  BrowserStats,
  Link,
  LinkSharedWith,
  OverallStats,
  VisitStats,
  EditLinkValues,
  StatChart,
  GeoipStats,
  PieDatum,
} from '@/interfaces/link';

import {
  addCollaborator,
  editLink,
  getLink,
  getLinkBrowserStats,
  getLinkGeoIpStats,
  getLinkStats,
  getLinkVisitsStats,
  removeCollaborator,
  transferLink,
} from '@/api/links';
import { EditLinkDrawer } from '@/drawers/EditLinkDrawer';
import {
  daysBetween,
  getLinkFromAlias,
  getRedirectFromAlias,
} from '@/lib/utils';
import CollaboratorModal, { Collaborator } from '@/modals/CollaboratorModal';
import ErrorPage from '@/pages/ErrorPage';
import VisitsChart from '@/components/link/visits-chart';
import GeoipChart from '@/components/link/world-chart';
import ShrunkPieChart from '@/components/pie-chart';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldLabel } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { ButtonGroup } from '@/components/ui/button-group';
import { type ChartConfig } from '@/components/ui/chart';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface Props {
  netid: string;
  userPrivileges: Set<string>;
}

const browserChartConfig = {
  firefox: {
    label: 'Firefox',
    theme: { light: '#e8893a', dark: '#fb923c' },
  },
  chrome: {
    label: 'Chrome',
    theme: { light: '#65a30d', dark: '#a3e635' },
  },
  ie: {
    label: 'Internet Explorer',
    theme: { light: '#0284c7', dark: '#38bdf8' },
  },
  safari: {
    label: 'Safari',
    theme: { light: '#4f6fd8', dark: '#93c5fd' },
  },
  opera: {
    label: 'Opera',
    theme: { light: '#c026d3', dark: '#e879f9' },
  },
  edge: {
    label: 'Microsoft Edge',
    theme: { light: '#dc2626', dark: '#fb7185' },
  },
  other: {
    label: 'Other',
    theme: { light: '#64748b', dark: '#cbd5e1' },
  },
} satisfies ChartConfig;

const platformChartConfig = {
  linux: {
    label: 'Linux',
    theme: { light: '#b7791f', dark: '#fbbf24' },
  },
  windows: {
    label: 'Windows',
    theme: { light: '#0f9f8c', dark: '#5eead4' },
  },
  mac: {
    label: 'Mac',
    theme: { light: '#64748b', dark: '#cbd5e1' },
  },
  android: {
    label: 'Android',
    theme: { light: '#4d7c0f', dark: '#bef264' },
  },
  unknown: {
    label: 'Unknown',
    theme: { light: '#94a3b8', dark: '#e2e8f0' },
  },
} satisfies ChartConfig;

const referralChartConfig = {
  facebook: {
    label: 'Facebook',
    theme: { light: '#1877f2', dark: '#60a5fa' },
  },
  twitter: {
    label: 'Twitter/X',
    theme: { light: '#2563eb', dark: '#93c5fd' },
  },
  instagram: {
    label: 'Instagram',
    theme: { light: '#c13584', dark: '#f0abfc' },
  },
  reddit: {
    label: 'Reddit',
    theme: { light: '#d9480f', dark: '#fb923c' },
  },
  unknown: {
    label: 'Unknown',
    theme: { light: '#64748b', dark: '#cbd5e1' },
  },
} satisfies ChartConfig;

const browserConfigKeys: Record<string, keyof typeof browserChartConfig> = {
  Firefox: 'firefox',
  Chrome: 'chrome',
  'Microsoft Internet Explorer': 'ie',
  Safari: 'safari',
  Opera: 'opera',
  'Microsoft Edge': 'edge',
  Unknown: 'other',
};

const platformConfigKeys: Record<string, keyof typeof platformChartConfig> = {
  Linux: 'linux',
  Windows: 'windows',
  Mac: 'mac',
  Android: 'android',
  Unknown: 'unknown',
};

const referralConfigKeys: Record<string, keyof typeof referralChartConfig> = {
  Facebook: 'facebook',
  Twitter: 'twitter',
  Instagram: 'instagram',
  Reddit: 'reddit',
  Unknown: 'unknown',
};

function preparePieData<K extends string>(
  data: PieDatum[],
  configKeys: Record<string, K>,
  fallbackKey: K,
) {
  return data.map((datum) => {
    const configKey = configKeys[datum.name] ?? fallbackKey;
    return {
      ...datum,
      configKey,
      fill: `var(--color-${configKey})`,
    };
  });
}

function doDownload(url: string, fileName: string) {
  const a = document.createElement('a');
  a.download = fileName;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function Stats(props: Props): React.ReactElement {
  const { id = '' } = useParams<{ id: string }>();
  const [linkInfo, setLinkInfo] = useState<Link | null>(null);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [visitStats, setVisitStats] = useState<VisitStats | null>(null);
  const [geoipStats, setGeoipStats] = useState<GeoipStats>();
  const [browserStats, setBrowserStats] = useState<BrowserStats | null>(null);
  const [mayEdit, setMayEdit] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [statsKey, setStatsKey] = useState<StatChart>(StatChart.Visits);
  const [qrcodeErrorLevel, setQrcodeErrorLevel] = useState<
    'L' | 'M' | 'Q' | 'H'
  >('H');

  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [collabModalVisible, setCollabModalVisible] = useState<boolean>(false);
  const [pendingOwner, setPendingOwner] = useState<LinkSharedWith | null>(null);
  const [requestOwnership, setRequestOwnership] = useState<boolean>(false);
  const [transferLoading, setTransferLoading] = useState<boolean>(false);
  const [requestLoading, setRequestLoading] = useState<boolean>(false);
  const [requestReason, setRequestReason] = useState<string>('');

  const [entities, setEntities] = useState<Collaborator[]>([]);

  const [topReferrer, setTopReferrer] = useState<string | null>(null);
  const [currentSource, setCurrentSource] = useState<string | undefined>(
    undefined,
  );
  const [isExporting, setIsExporting] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
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
    const templinkInfo = await getLink(id);

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
        org_name: editor.org_name,
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
        org_name: viewer.org_name,
      });
    });
    setEntities(tempEntities);
  }

  async function updateStats(source?: string) {
    setOverallStats(await getLinkStats(id, source));
    setVisitStats(await getLinkVisitsStats(id, source));
    setGeoipStats(await getLinkGeoIpStats(id, source));
    setBrowserStats(await getLinkBrowserStats(id, source));
    setCurrentSource(source);
  }

  const onVisitStateRangeChanged = async (
    dates: [Dayjs | null, Dayjs | null] | null,
  ): Promise<void> => {
    setVisitStats(
      await getLinkVisitsStats(
        id,
        currentSource,
        dates?.[0] || undefined,
        dates?.[1]?.endOf('day'),
      ),
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      await updateLinkInfo();
      await updateStats();
    };

    fetchData().then(() => {
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  console.log(linkInfo);
  useEffect(() => {
    if (browserStats !== null && browserStats.referers.length > 0) {
      setTopReferrer(browserStats.referers[0].name);
    }
  }, [browserStats]);

  if (!loading && linkInfo === null) {
    return (
      <ErrorPage
        title="Link not found."
        description="This link is either deleted or doesn't exist"
      />
    );
  }

  async function doEditLink(values: EditLinkValues): Promise<void> {
    const oldLinkInfo = linkInfo;
    if (oldLinkInfo === null) {
      throw new Error('oldLinkInfo should not be null');
    }

    const patchReq: Partial<EditLinkValues> = {};
    if (values.title !== oldLinkInfo.title) {
      patchReq.title = values.title;
    }
    if (values.long_url !== oldLinkInfo.long_url) {
      patchReq.long_url = values.long_url;
    }
    if (values.owner && values.owner._id !== oldLinkInfo.owner._id) {
      patchReq.owner = {
        _id: values.owner._id,
        type: 'netid',
      };
    }
    if (values.alias !== oldLinkInfo.alias) {
      patchReq.alias = values.alias;
    }
    if (
      typeof values.expiration_time !== 'undefined' &&
      values.expiration_time !== oldLinkInfo.expiration_time
    ) {
      patchReq.expiration_time = values.expiration_time;
    }

    const patchRequest = await editLink(id, patchReq);

    const patchRequestStatus = patchRequest.status;

    if (patchRequestStatus !== 204) {
      toast.error('There was an error editing the link.');
    } else {
      await updateLinkInfo();
      toast.success('Link edited successfully');
      await updateStats();
    }
  }

  const downloadCsv = async (): Promise<void> => {
    if (linkInfo === null) {
      return;
    }

    setIsExporting(true);
    try {
      await downloadVisits(id);
    } finally {
      setIsExporting(false);
    }
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
    await addCollaborator(id, collaborator, role);
    await updateLinkInfo();
  }

  async function onRemoveCollaborator(
    entity: LinkSharedWith,
    role?: 'viewer' | 'editor',
  ) {
    await removeCollaborator(id, entity, role);
    await updateLinkInfo();
  }

  const stageOwnershipChange = (
    activeTab: 'netid' | 'org',
    entity: Collaborator,
  ) => {
    setRequestOwnership(linkInfo?.may_transfer !== true);
    setPendingOwner({
      _id: entity._id,
      type: activeTab,
      org_name: entity.org_name,
    });
  };

  const onAddEntity = (activeTab: 'netid' | 'org', entity: Collaborator) => {
    if (entity.role === 'owner') {
      stageOwnershipChange(activeTab, entity);
      return;
    }

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

  const confirmOwnershipRequest = async () => {
    if (!pendingOwner) {
      return;
    }

    const subject = encodeURIComponent(
      `Ownership Request for go.rutgers.edu/${linkInfo?.alias}`,
    );
    const body = encodeURIComponent(
      `Hello OSS, \n\nI am requesting ownership of the following Go Link: \n\nTitle ${linkInfo?.title} \nUrl: https://go.rutgers.edu/${linkInfo?.alias} \nCurrent Owner: ${linkInfo?.owner._id} \nRequested Owner: ${pendingOwner.type === 'netid' ? pendingOwner._id : (pendingOwner.org_name ?? pendingOwner._id)} \n\nReason for request: ${requestReason} \n\nThank you.`,
    );

    setRequestLoading(true);
    try {
      window.open(
        `mailto:oss@oit.rutgers.edu?subject=${subject}&body=${body}`,
        '_blank',
      );
      toast.success('Email client opened!');
      setPendingOwner(null);
      setRequestOwnership(false);
      setRequestReason('');
      setCollabModalVisible(false);
    } catch {
      toast.error('Something went wrong!');
    } finally {
      setRequestLoading(false);
    }
  };

  const confirmOwnershipTransfer = async () => {
    if (!pendingOwner) {
      return;
    }

    const owner = pendingOwner;
    setTransferLoading(true);

    try {
      await transferLink(id, owner);
      toast.success('Ownership transferred successfully');
      setPendingOwner(null);
      setCollabModalVisible(false);

      if (owner.type === 'netid' && !props.userPrivileges.has('admin')) {
        navigate('/app/dash');
        return;
      }

      try {
        await updateLinkInfo();
      } catch {
        navigate('/app/dash');
      }
    } catch {
      toast.error('Failed to transfer ownership');
      setPendingOwner(null);
    } finally {
      setTransferLoading(false);
    }
  };

  const onChangeEntity = (
    activeTab: 'netid' | 'org',
    entity: Collaborator,
    value: string,
  ) => {
    if (value === 'owner') {
      stageOwnershipChange(activeTab, entity);
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
    Visits: (
      <VisitsChart
        visitStats={visitStats}
        onRangeChange={onVisitStateRangeChanged}
      />
    ),
    GeoIP: <GeoipChart data={geoipStats} />,
    Browser: (
      <ShrunkPieChart
        data={preparePieData(
          browserStats?.browsers ?? [],
          browserConfigKeys,
          'other',
        )}
        chartConfig={browserChartConfig}
      />
    ),
    Platform: (
      <ShrunkPieChart
        data={preparePieData(
          browserStats?.platforms ?? [],
          platformConfigKeys,
          'unknown',
        )}
        chartConfig={platformChartConfig}
      />
    ),
    Referral: (
      <ShrunkPieChart
        data={preparePieData(
          browserStats?.referers ?? [],
          referralConfigKeys,
          'unknown',
        )}
        chartConfig={referralChartConfig}
      />
    ),
  };

  const dateCreatedText = dayjs(linkInfo?.created_time).format('MMMM D, YYYY');
  const dateExpiresText = linkInfo?.expiration_time
    ? dayjs(linkInfo?.expiration_time).format('MMMM D, YYYY')
    : 'Never';

  const isTrackingPixel = linkInfo?.is_tracking_pixel_link;

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mt-[19px] mb-[19px] flex items-center gap-2">
            <h1 className="m-0 truncate text-2xl font-bold">
              {!linkInfo?.is_tracking_pixel_link
                ? getLinkFromAlias(linkInfo?.alias || '', false)
                : linkInfo?.alias}
            </h1>
            <Badge variant="destructive">
              {linkInfo?.is_tracking_pixel_link ? 'Tracking Pixel' : 'Link'}
            </Badge>
          </div>
        </div>

        <div className="flex max-w-full gap-2 overflow-x-auto">
          <ButtonGroup className="shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
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
                  <CopyIcon />
                  Copy
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy link to clipboard</TooltipContent>
            </Tooltip>
            {mayEdit && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditModalVisible(true);
                  }}
                >
                  <PencilIcon />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCollabModalVisible(true);
                  }}
                >
                  <UsersIcon />
                  Collaborate
                </Button>
              </>
            )}
          </ButtonGroup>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        <div className="w-full">
          <div className="rounded-lg border border-border p-6">
            <div className="flex flex-col gap-4 lg:flex-row">
              {!linkInfo?.is_tracking_pixel_link && (
                <div className="flex shrink-0 flex-col items-center gap-4">
                  <div
                    id="qrcode"
                    className="rounded-md border border-border bg-background p-3"
                  >
                    <QRCodeCanvas
                      value={
                        linkInfo
                          ? getRedirectFromAlias(
                              `${linkInfo.alias}?source=qr`,
                              false,
                            )
                          : ''
                      }
                      size={size}
                      level={qrcodeErrorLevel}
                    />
                  </div>

                  <div className="flex w-full gap-2">
                    <ButtonGroup className="w-full">
                      <Select
                        value={qrcodeErrorLevel}
                        onValueChange={(value: 'L' | 'M' | 'Q' | 'H') => {
                          setQrcodeErrorLevel(value);
                        }}
                      >
                        <SelectTrigger className="h-8 min-w-24 flex-1 bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="L">Low</SelectItem>
                          <SelectItem value="M">Medium</SelectItem>
                          <SelectItem value="Q">Quartile</SelectItem>
                          <SelectItem value="H">High</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 flex-1"
                        onClick={downloadCanvasQRCode}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </ButtonGroup>
                  </div>
                </div>
              )}

              <div className="min-w-0 flex-1 self-start overflow-hidden rounded-md border border-border">
                {!isTrackingPixel && (
                  <div className="grid grid-cols-1 border-b border-border sm:grid-cols-[180px_minmax(0,1fr)]">
                    <div className="border-b border-border bg-muted/50 px-4 py-3 text-sm font-medium text-muted-foreground sm:border-r sm:border-b-0 sm:px-6 sm:py-4">
                      Original URL
                    </div>
                    <div className="px-4 py-3 text-sm break-all sm:px-6 sm:py-4">
                      {linkInfo?.long_url}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 border-b border-border sm:grid-cols-[180px_minmax(0,1fr)]">
                  <div className="border-b border-border bg-muted/50 px-4 py-3 text-sm font-medium text-muted-foreground sm:border-r sm:border-b-0 sm:px-6 sm:py-4">
                    Owner
                  </div>

                  <div className="px-4 py-3 text-sm break-words sm:px-6 sm:py-4">
                    {linkInfo?.owner.type === 'org' ? (
                      <RouterLink
                        to={`/app/orgs/${linkInfo.owner._id}`}
                        className="underline underline-offset-4"
                      >
                        {linkInfo.owner.org_name}
                      </RouterLink>
                    ) : (
                      linkInfo?.owner._id
                    )}
                  </div>
                </div>

                <div
                  className={
                    isTrackingPixel
                      ? 'grid grid-cols-1 border-b border-border sm:grid-cols-[180px_minmax(0,1fr)]'
                      : 'grid grid-cols-1 border-b border-border sm:grid-cols-[180px_minmax(0,1fr)] lg:grid-cols-[180px_minmax(0,1fr)_180px_minmax(0,1fr)]'
                  }
                >
                  <div className="border-b border-border bg-muted/50 px-4 py-3 text-sm font-medium text-muted-foreground sm:border-r sm:border-b-0 sm:px-6 sm:py-4">
                    Date Created
                  </div>
                  <div className="border-b border-border px-4 py-3 text-sm sm:border-b-0 sm:px-6 sm:py-4 lg:border-r">
                    {dateCreatedText}
                  </div>

                  {!isTrackingPixel && (
                    <>
                      <div className="border-b border-border bg-muted/50 px-4 py-3 text-sm font-medium text-muted-foreground sm:border-r sm:border-b-0 sm:px-6 sm:py-4">
                        Date Expires
                      </div>
                      <div className="px-4 py-3 text-sm sm:px-6 sm:py-4">
                        {dateExpiresText}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full">
          <div className="flex justify-start">
            <Select
              value={currentSource ?? 'All'}
              onValueChange={(value) =>
                updateStats(value === 'All' ? undefined : value)
              }
            >
              <SelectTrigger className="w-40 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All sources</SelectItem>
                <SelectItem value="qr">QR code</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {overallStats === null || linkInfo === null ? null : (
          <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-border p-4">
              <div className="text-sm text-muted-foreground">Total Clicks</div>
              <div className="mt-1 text-2xl font-bold">
                {overallStats.total_visits}
              </div>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="text-sm text-muted-foreground">Unique Clicks</div>
              <div className="mt-1 text-2xl font-bold">
                {overallStats.unique_visits}
              </div>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="text-sm text-muted-foreground">
                Avg. Clicks/Day
              </div>
              <div className="mt-1 text-2xl font-bold">
                {averageClicks().toFixed(2)}
              </div>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="text-sm text-muted-foreground">
                Most Popular Referrer
              </div>
              <div className="mt-1 text-2xl font-bold">
                {topReferrer !== null ? topReferrer : 'None'}
              </div>
            </div>
          </div>
        )}

        <div className="w-full">
          <div className="rounded-lg border border-border">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <h3 className="m-0 text-base font-semibold">Statistics</h3>
              <div className="flex max-w-full items-center gap-2 overflow-x-auto">
                <ButtonGroup className="shrink-0">
                  <Select
                    value={statsKey}
                    onValueChange={(value: StatChart) => {
                      setStatsKey(value);
                    }}
                  >
                    <SelectTrigger className="w-28 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={StatChart.Visits}>Visits</SelectItem>
                      <SelectItem value={StatChart.GeoIP}>Location</SelectItem>
                      <SelectItem value={StatChart.Browser}>Browser</SelectItem>
                      <SelectItem value={StatChart.Platform}>
                        Platform
                      </SelectItem>
                      <SelectItem value={StatChart.Referral}>
                        Referral
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={isExporting}
                        onClick={downloadCsv}
                      >
                        {isExporting ? (
                          <Loader2Icon className="animate-spin" />
                        ) : (
                          <CloudDownloadIcon />
                        )}
                        Export
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Export data as a CSV</TooltipContent>
                  </Tooltip>
                </ButtonGroup>
              </div>
            </div>
            <div className="p-4">{statTabs[statsKey]}</div>
          </div>
        </div>
      </div>

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
            canCreate={
              props.userPrivileges.has('admin') ||
              props.userPrivileges.has('facstaff')
            }
            multipleMasters
            _id={props.netid}
            canAssignMasterRole={linkInfo.may_transfer === true}
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

          <AlertDialog
            open={pendingOwner !== null && requestOwnership == false}
            onOpenChange={(open) => {
              if (!open && !transferLoading) {
                setPendingOwner(null);
              }
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Transfer ownership?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will transfer ownership of the link to{' '}
                  {pendingOwner?._id}. You may lose access to this link.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={transferLoading}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={transferLoading}
                  onClick={confirmOwnershipTransfer}
                >
                  {transferLoading ? 'Transferring...' : 'Yes, transfer'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog
            open={pendingOwner !== null && requestOwnership == true}
            onOpenChange={(open) => {
              if (!open && !transferLoading) {
                setPendingOwner(null);
              }
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Request ownership?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will request for you to be added as an owner of the link.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogDescription>
                <Field>
                  <FieldLabel htmlFor="explain">
                    Please explain why you need to be added as an owner to this
                    link
                  </FieldLabel>
                  <Textarea
                    id="explain"
                    placeholder="Enter your message here"
                    onChange={(e) => setRequestReason(e.target.value)}
                    value={requestReason}
                  />
                </Field>
              </AlertDialogDescription>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={requestLoading}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={requestLoading}
                  onClick={confirmOwnershipRequest}
                >
                  {requestLoading ? 'Requesting...' : 'Yes, request ownership'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </TooltipProvider>
  );
}
