import type { ColumnsType } from 'antd/lib/table';
import React, { useEffect, useMemo, useState } from 'react';
import { Table, Flex, Tooltip, Button, message } from 'antd';
import {
  EditIcon,
  EyeIcon,
  QrCodeIcon,
  Trash2Icon,
  Copy,
  UsersIcon,
  UserPlusIcon,
} from 'lucide-react';
import { OrganizationLink } from '../../interfaces/organizations';
import { getOrganizationLinks } from '../../api/organization';
import { getLinkFromAlias } from '../../lib/utils';
import TransferToNetIdModal from '../../modals/TransferToNetIdModal';
import { editLink } from '../../api/links';

/**
 * Compact table for displaying organization links.
 */

interface CompactLinkTableProps {
  org_id: string;
  /**
   * Pass this prop so that when a link is created the table will update
   */
  forceRefresh: boolean;
  isAdmin?: boolean;
}
const CompactLinkTable = ({
  org_id,
  forceRefresh,
  isAdmin,
}: CompactLinkTableProps) => {
  const [links, setLinks] = useState<OrganizationLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [selectedLinkId, setSelectedLinkId] = useState<string>('');
  const fetchLinks = async () => {
    const resp = await getOrganizationLinks(org_id);
    setLinks(resp);
    setLoading(false);
  };
  useEffect(() => {
    fetchLinks();
  }, [org_id, forceRefresh]);

  const transferLinkOwnership = async (netid: string, link_id: string) => {
    try {
      await editLink(link_id, { owner: { type: 'netid', _id: netid } });
      message.success('Link ownership transferred successfully');
    } catch (error) {
      message.error('Error transferring link ownership');
    }
    setTransferModalVisible(false);
    setLoading(true);
    await fetchLinks();
  };
  const sortLinks = (unsortedLinks: OrganizationLink[]) => {
    const roleOrder = ['owner', 'editor', 'viewer'];
    const nonDeleted = unsortedLinks.filter((link) => !link.deleted);
    const deleted = unsortedLinks.filter((link) => link.deleted);
    nonDeleted.sort(
      (a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role),
    );
    deleted.sort(
      (a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role),
    );
    return [...nonDeleted, ...deleted];
  };
  const sortedLinks = useMemo(() => sortLinks(links), [links]);

  const columns: ColumnsType<OrganizationLink> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Alias',
      dataIndex: 'alias',
      key: 'alias',
    },
    {
      title: 'Owner',
      dataIndex: ['owner', 'org_name'],
      key: 'ownerId',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      filters: [
        {
          text: 'Owner',
          value: 'owner',
        },
        {
          text: 'Editor',
          value: 'editor',
        },
        {
          text: 'Viewer',
          value: 'viewer',
        },
      ],
      onFilter: (value, record) => record.role === value,
      render: (role: string) => role.charAt(0).toUpperCase() + role.slice(1),
    },
    {
      title: 'Deleted',
      dataIndex: 'deleted',
      key: 'deleted',
      filters: [
        {
          text: 'Yes',
          value: true,
        },
        {
          text: 'No',
          value: false,
        },
      ],
      onFilter: (value, record) => record.deleted === value,
      render: (deleted: boolean) => (deleted ? 'Yes' : 'No'),
    },
    {
      title: () => <Flex justify="flex-end">Actions</Flex>,
      key: 'actions',
      width: 100,
      render: (text: string, link: OrganizationLink) => (
        <Flex justify="flex-end">
          <Tooltip title="View link details">
            <Button
              icon={<EyeIcon />}
              type="text"
              href={`/app/links/${link._id}`}
              target="_blank"
            />
          </Tooltip>
          {link.deleted ? (
            ''
          ) : (
            <>
              <Tooltip title="Copy link">
                <Button
                  icon={<Copy />}
                  type="text"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      getLinkFromAlias(link.alias, link.is_tracking_pixel_link),
                    );
                    message.success('Link copied to clipboard');
                  }}
                />
              </Tooltip>
              <Tooltip title="Access qr code">
                <Button
                  icon={<QrCodeIcon />}
                  type="text"
                  href={`/app/links/${link._id}?mode=qrcode`}
                  target="_blank"
                />
              </Tooltip>
            </>
          )}
          {link.canEdit && (
            <>
              <Tooltip title="Edit link">
                <Button
                  icon={<EditIcon />}
                  type="text"
                  href={`/app/links/${link._id}?mode=edit`}
                  target="_blank"
                />
              </Tooltip>
              <Tooltip title="Share link permissions">
                <Button
                  icon={<UsersIcon />}
                  type="text"
                  href={`/app/links/${link._id}?mode=collaborate`}
                  target="_blank"
                />
              </Tooltip>
            </>
          )}
          {link.owner._id === org_id && !link.deleted && isAdmin && (
            <Tooltip title="Transfer ownership">
              <Button
                icon={<UserPlusIcon />}
                type="text"
                onClick={() => {
                  setTransferModalVisible(true);
                  setSelectedLinkId(link._id);
                }}
              />
            </Tooltip>
          )}
          {isAdmin && (
            <>
              <Tooltip title={link.deleted ? 'Link is deleted' : 'Delete link'}>
                <Button
                  icon={<Trash2Icon />}
                  type="text"
                  danger
                  href={`/app/links/${link._id}?mode=edit`}
                  target="_blank"
                  disabled={link.owner._id !== org_id || link.deleted}
                />
              </Tooltip>
            </>
          )}
        </Flex>
      ),
    },
  ];

  return (
    <>
      <Table
        loading={loading}
        columns={columns}
        dataSource={sortedLinks}
        pagination={{
          position: ['bottomCenter'],
          pageSize: 10,
        }}
        scroll={{ x: 'max-content' }}
        size="small"
      />
      <TransferToNetIdModal
        visible={transferModalVisible}
        onCancel={() => {
          setTransferModalVisible(false);
          setSelectedLinkId('');
        }}
        onOk={transferLinkOwnership}
        link_id={selectedLinkId}
      />
    </>
  );
};

export default CompactLinkTable;
