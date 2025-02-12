/**
 * Implements the [[BlockedLinks]] component
 * @packageDocumentation
 */

import {
  Flex,
  Row,
  Button,
  message,
  Popconfirm,
  Spin,
  Table,
  Tooltip,
  Typography,
} from 'antd/lib';
import React, { useCallback, useEffect, useMemo } from 'react';
import { DeleteOutlined } from '@ant-design/icons';
import base32 from 'hi-base32';
import Fuse from 'fuse.js';
import BlockedLinksTableHeader from './BlockedLinksTableHeader';
import { EntityInfo } from '../GrantedUserCsv';

/**
 * Renders the URLs as clickable links
 * @param url - the URL to render
 * @returns the rendered URL as an anchor element
 */
const renderURLs = (url: string): JSX.Element => (
  <a key={url} href={url}>
    {url}
  </a>
);

/**
 * Renders the netids in bold
 * @param netids - the netids to render
 * @returns the rendered netids as bold elements
 */
const renderNetIDs = (netIds: string[]): JSX.Element[] =>
  netIds.map((netid) => <strong key={netid}>{netid}</strong>);

/**
 * Renders the unblock button for a URL with callback handling
 * @param url - the URL to unblock
 * @param onUnblock - callback function to execute after successful unblock
 * @returns the rendered unblock button with confirmation
 */
const renderUnblockButton = (
  url: string,
  onUnblock: () => void,
): JSX.Element => {
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

      message.success('Link unblocked successfully');
      onUnblock();
    } catch (error) {
      message.error(`Failed to unblock link: ${error}`);
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

/**
 * The [[BlockedLinksProps]] interface
 * @param name - the role name
 */
interface BlockedLinksProps {
  name: string;
}

/**
 * The [[BlockedLink]] interface
 * @param url - the URL that was blocked
 * @param blockedBy - the NetID that blocked the URL
 * @param timeBlocked - the timestamp when the URL was blocked
 * @param comment - the comment associated with the blocked URL
 */
interface BlockedLink {
  url: string;
  blockedBy: string;
  timeBlocked: string;
  comment: string;
}

/**
 * The [[BlockedLinks]] component displays a table of blocked URLs. Admins can manage
 * and unblock these URLs through this component. Includes search functionality
 * to filter URLs by either the URL itself or the NetID that blocked it.
 * @param props - Component props containing the role name
 * @returns the [[BlockedLinks]] component
 */
const BlockedLinks: React.FC<BlockedLinksProps> = (props) => {
  const [loading, setLoading] = React.useState(true);
  const [blockedLinks, setBlockedLinks] = React.useState<BlockedLink[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [refetchBlockedLinks, setRefetchBlockedLinks] = React.useState(false);

  /**
   * Triggers a refresh of the blocked links data
   * Used to force data updates after blocking/unblocking a link
   */
  const rehydrateData = (): void => {
    setRefetchBlockedLinks((prev) => !prev);
  };

  const fuse = useMemo(
    () =>
      new Fuse(blockedLinks, {
        keys: ['url', 'blockedBy'],
        threshold: 0.3, // Adjustable sensitivity for fuzzy search
        distance: 100,
      }),
    [blockedLinks],
  );

  const filteredLinks = useMemo(() => {
    if (!searchQuery) return blockedLinks;
    return fuse.search(searchQuery).map((result) => result.item);
  }, [fuse, searchQuery, blockedLinks]);

  const columns = [
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      render: renderURLs,
    },
    {
      title: 'Blocked By',
      dataIndex: 'blockedBy',
      key: 'blockedBy',
      render: (netid: string) => renderNetIDs([netid]),
    },
    {
      title: () => <Flex justify="flex-end">Actions</Flex>,
      key: 'actions',
      render: (_: any, record: BlockedLink) => (
        <Flex justify="flex-end">
          {renderUnblockButton(record.url, rehydrateData)}
        </Flex>
      ),
    },
  ];

  const exportAsCSV = useCallback(() => {
    const csvContent = [
      ['URL', 'Blocked By', 'Time Blocked', 'Comment'].join(','),
      ...blockedLinks.map((link) =>
        [
          `"${link.url}"`,
          link.blockedBy,
          link.timeBlocked,
          `"${link.comment}"`,
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `blocked_links_export_${new Date().toISOString()}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [blockedLinks]);

  useEffect(() => {
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

    Promise.all([updateBlockedLinks()]).then(() => setLoading(false));
  }, [refetchBlockedLinks]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  return (
    <>
      <Flex gap="1rem" align="baseline">
        <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 16 }}>
          Link Control
        </Typography.Title>
        <Typography.Title
          level={5}
          style={{ marginTop: 0, marginBottom: 16, color: '#4F4F4F' }}
        >
          {filteredLinks.length} Result{filteredLinks.length !== 1 && 's'} Found
        </Typography.Title>
      </Flex>

      <BlockedLinksTableHeader
        onLinkBanned={rehydrateData}
        onExportClick={exportAsCSV}
        onSearch={handleSearch}
        blockedLinks={blockedLinks}
      />

      <Row style={{ marginBottom: 24 }} />
      {loading ? (
        <Spin size="large" />
      ) : (
        <Table
          columns={columns}
          dataSource={filteredLinks}
          rowKey="url"
          pagination={{ position: ['bottomCenter'], pageSize: 10 }}
          scroll={{ x: 'max-content' }}
        />
      )}
    </>
  );
};

export default BlockedLinks;
