/**
 * Implements the [[BlockedLinks]] component
 * @packageDocumentation
 */

import { Row } from 'antd/lib';
import React, { useEffect } from 'react';
import {
  Button,
  ConfigProvider,
  message,
  Popconfirm,
  Spin,
  Table,
  Tooltip,
  Typography,
} from 'antd';
import { lightTheme } from '../../theme';
import BlockedLinksTableHeader from './BlockedLinksTableHeader';
import { EntityInfo } from '../GrantedUserCsv';
import { RoleText } from './Role';
import LinkSecurity from './LinkSecurity';
import { DeleteOutlined } from '@ant-design/icons';
import base32 from 'hi-base32';

/**
 * Renders the URLs as clickable links
 * @param netids - the URLs to render
 * @returns the rendered URLs
 */
const renderURLs = (url: string): JSX.Element => (
  <a key={url} href={url}>
    {url}
  </a>
);

/**
 * Renders the netids in bold
 * @param netids - the netids to render
 * @returns the rendered netids
 */
const renderNetIDs = (netIds: string[]): JSX.Element[] =>
  netIds.map((netid) => <strong key={netid}>{netid}</strong>);

// TODO - Include invalidation function to re-fetch links after unblocking instead of requiring refresh
/**
 * Renders the unblock button for a URL
 * @param url - the URL to block
 * @returns the rendered unblock button
 */
const renderUnblockButton = (url: string): JSX.Element => {
  const handleUnblock = async () => {
    try {
      const encodedUrl = base32.encode(url);

      const response = await fetch(
        `/api/v1/role/blocked_url/entity/${encodedUrl}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        throw new Error('Failed to unblock link');
      }
    } catch (error) {
      console.error('Error unblocking link:', error);
      message.error('Failed to unblock link');
    }
  };

  return (
    <Tooltip title="Unblock">
      <Popconfirm
        title="Are you sure you want to unblock this link?"
        onConfirm={handleUnblock}
        okText="Yes"
        cancelText="No"
        okButtonProps={{ danger: true }}
      >
        <Button type="text" danger icon={<DeleteOutlined />} />
      </Popconfirm>
    </Tooltip>
  );
};

const columns = [
  {
    title: 'URL',
    dataIndex: 'url',
    key: 'url',
    render: (url: string) => renderURLs(url),
  },
  {
    title: 'Blocked By',
    dataIndex: 'blockedBy',
    key: 'blockedBy',
    render: (netid: string) => renderNetIDs([netid]),
  },
  {
    title: 'Actions',
    key: 'actions',
    render: (_: any, record: BlockedLink) => renderUnblockButton(record.url),
  },
];

interface BlockedLinksProps {
  name: string;
}

interface BlockedLink {
  url: string;
  blockedBy: string;
  timeBlocked: string;
  comment: string;
}

/**
 * The [[BlockedLinks]] component displays a table of pending power user requests. Admins can manage
 * and approve/deny these requests through this component.
 * @returns the [[ManageUserAccess]] component
 */
const BlockedLinks: React.FC<BlockedLinksProps> = (props) => {
  const [loading, setLoading] = React.useState(true);
  const [blockedLinks, setBlockedLinks] = React.useState<BlockedLink[]>([]);
  const [roleText, setRoleText] = React.useState<RoleText | null>(null);

  const [refetchBlockedLinks, setRefetchBlockedLinks] = React.useState(false);

  const rehydrateData = (): void => {
    setRefetchBlockedLinks((prev) => !prev);
  };

  useEffect(() => {
    /**
     * Fetch the role text from the backend
     * @method
     */
    const updateRoleText = async (): Promise<void> => {
      const result = await fetch(`/api/v1/role/${props.name}/text`).then(
        (resp) => resp.json(),
      );
      setRoleText(result.text as RoleText);
    };

    /**
     * Fetch the banned links from the backend
     * @method
     */
    const updateBlockedLinks = async (): Promise<void> => {
      const result = await fetch(`/api/v1/role/${props.name}/entity`).then(
        (resp) => resp.json(),
      );
      setBlockedLinks(
        result.entities.map((entity: EntityInfo) => ({
          url: entity.entity,
          comment: entity.comment ?? '',
          blockedBy: entity.granted_by ?? '',
          timeBlocked: entity.time_granted ?? '',
        })),
      );
    };

    Promise.all([updateBlockedLinks(), updateRoleText()]).then(() =>
      setLoading(false),
    );
  }, [refetchBlockedLinks]);

  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 16 }}>
        Link Control
      </Typography.Title>

      {/* Re-provide theme context to component */}
      <ConfigProvider theme={lightTheme}>
        <BlockedLinksTableHeader onLinkBanned={rehydrateData} />
      </ConfigProvider>

      <Row style={{ marginBottom: 24 }} />
      {loading ? (
        <Spin size="large" />
      ) : (
        <>
          <Table
            columns={columns}
            dataSource={blockedLinks}
            rowKey="netid"
            pagination={{ position: ['bottomCenter'], pageSize: 10 }}
            scroll={{ x: 'max-content' }}
          />
        </>
      )}

      <LinkSecurity />
    </>
  );
};

export default BlockedLinks;
