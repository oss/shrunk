import type { ColumnsType } from 'antd/lib/table';
import React, { useEffect, useMemo } from 'react';
import { Table, Flex, Tooltip, Button, message } from 'antd/lib';
import {
  EditIcon,
  EyeIcon,
  QrCodeIcon,
  Trash2Icon,
  Copy,
  UsersIcon,
} from 'lucide-react';
import { OrganizationLink } from '../../interfaces/organizations';
import { getOrganizationLinks } from '../../api/organization';
import { getLinkFromAlias } from '@/src/lib/utils';

/**
 * Compact table for displaying organization links.
 */

interface CompactLinkTableProps {
  org_id: string;
  /**
   * Pass this prop so that when a link is created the table will update
   */
  forceRefresh: boolean;
}
const CompactLinkTable = ({ org_id, forceRefresh }: CompactLinkTableProps) => {
  const [links, setLinks] = React.useState<OrganizationLink[]>([]);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    const fetchLinks = async () => {
      const resp = await getOrganizationLinks(org_id);
      setLinks(resp);
      setLoading(false);
    };
    fetchLinks();
  }, [org_id, forceRefresh]);

  const sortLinks = (links: OrganizationLink[]) => {
    const roleOrder = ['owner', 'editor', 'viewer'];
    const nonDeleted = links.filter((link) => !link.deleted);
    const deleted = links.filter((link) => link.deleted);
    nonDeleted.sort((a, b) => {
      return roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role);
    });
    deleted.sort((a, b) => {
      return roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role);
    });
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
      render: (role: string) => role.charAt(0).toUpperCase() + role.slice(1),
    },
    {
      title: () => <Flex justify="flex-end">Actions</Flex>,
      key: 'actions',
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
                    navigator.clipboard.writeText(getLinkFromAlias(link.alias));
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
    </>
  );
};

export default CompactLinkTable;
