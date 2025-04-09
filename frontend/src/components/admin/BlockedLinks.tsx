/**
 * Implements the [[BlockedLinks]] component
 * @packageDocumentation
 */

import {
  AutoComplete,
  Button,
  Col,
  Flex,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Row,
  Space,
  Table,
  Tooltip,
} from 'antd/lib';
import Fuse from 'fuse.js';
import {
  CloudDownloadIcon,
  PlusCircleIcon,
  SearchIcon,
  TrashIcon,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo } from 'react';
import { blockLink, getBlockedLinks, unBlockLink } from '../../api/app';
import { GrantedBy } from '../../interfaces/csv';

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
      unBlockLink(url);
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
        <Button type="text" danger icon={<TrashIcon />} />
      </Popconfirm>
    </Tooltip>
  );
};

/**
 * Props for the [[SearchBannedLinks]] component
 * @interface
 */
interface SearchBannedLinksProps {
  blockedLinks: Array<{
    url: string;
    blockedBy: string;
  }>;
  onSearch: (value: string) => void;
}

/**
 * The [[SearchBannedLinks]] component allows the user to search for banned links based on criteria
 * Available filters include: URL, NetID
 * @class
 */
const SearchBannedLinks: React.FC<SearchBannedLinksProps> = ({
  blockedLinks,
  onSearch,
}) => {
  const [value, setValue] = React.useState('');

  const fuse = useMemo(
    () =>
      new Fuse(blockedLinks, {
        keys: ['url', 'blockedBy'],
        threshold: 0.3,
        distance: 100,
      }),
    [blockedLinks],
  );

  const handleSearch = useCallback(
    (searchValue: string) => {
      setValue(searchValue);
      if (!searchValue) {
        onSearch('');
        return;
      }
      onSearch(searchValue);
    },
    [fuse, onSearch],
  );

  const handleSelect = useCallback(
    (selectedValue: string) => {
      setValue(selectedValue);
      onSearch(selectedValue);
    },
    [onSearch],
  );

  return (
    <AutoComplete
      style={{ width: '100%', minWidth: '300px' }}
      value={value}
      onChange={handleSearch}
      onSelect={handleSelect}
      allowClear
      placeholder="Search by URL or NetID"
      suffixIcon={<SearchIcon />}
    />
  );
};

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
const BlockedLinks = () => {
  const [loading, setLoading] = React.useState(true);
  const [blockedLinks, setBlockedLinks] = React.useState<BlockedLink[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [refetchBlockedLinks, setRefetchBlockedLinks] = React.useState(false);
  const [form] = Form.useForm();
  const [modalLoading, setModalLoading] = React.useState(false);
  const [showBlockLinkModal, setShowBlockLinkModal] = React.useState(false);

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
      const result = await getBlockedLinks();
      setBlockedLinks(
        result.entities.map((entity: GrantedBy) => ({
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

  const handleConfirm = () => {
    form.validateFields().then(async (values) => {
      setModalLoading(true);

      try {
        blockLink(values.link, values.comment);

        message.success('Link blocked successfully');
        form.resetFields();
        setShowBlockLinkModal(false);
        rehydrateData();
      } catch (error) {
        message.error('Failed to block link');
      } finally {
        setModalLoading(false);
      }
    });
  };

  return (
    <>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Flex justify="space-between" style={{ width: '100%' }}>
            <Space direction="horizontal">
              <SearchBannedLinks
                blockedLinks={blockedLinks}
                onSearch={handleSearch}
              />
            </Space>
            <Space direction="horizontal">
              <Button icon={<CloudDownloadIcon />} onClick={exportAsCSV}>
                Export
              </Button>
              <Button
                type="primary"
                icon={<PlusCircleIcon />}
                onClick={() => setShowBlockLinkModal(true)}
              >
                Block Link
              </Button>
            </Space>
          </Flex>
        </Col>

        <Col span={24}>
          <Table
            loading={loading}
            columns={columns}
            dataSource={filteredLinks}
            rowKey="url"
            pagination={{ position: ['bottomCenter'], pageSize: 10 }}
            scroll={{ x: 'max-content' }}
          />
        </Col>
      </Row>

      <Modal
        open={showBlockLinkModal}
        onCancel={() => {
          setShowBlockLinkModal(false);
          form.resetFields();
        }}
        title="Block Link"
        footer={[
          <Button
            type="default"
            key="back"
            onClick={() => {
              setShowBlockLinkModal(false);
              form.resetFields();
            }}
          >
            Cancel
          </Button>,
          <Button
            type="primary"
            key="submit"
            onClick={handleConfirm}
            loading={modalLoading}
          >
            Confirm
          </Button>,
        ]}
        width={400}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="link"
            label="Link:"
            rules={[
              { required: true, message: 'Please enter a link to block' },
            ]}
          >
            <Input placeholder="https://example.com" />
          </Form.Item>

          <Form.Item
            name="comment"
            label="Comment:"
            rules={[
              {
                required: true,
                message: 'Please provide a reason for blocking this link',
              },
            ]}
          >
            <Input.TextArea
              placeholder="Why is this link being blocked?"
              rows={4}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default BlockedLinks;
