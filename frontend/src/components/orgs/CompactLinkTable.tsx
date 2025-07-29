import type { ColumnsType } from 'antd/lib/table';
import React, { useEffect } from 'react';
import { Table, Flex, Tooltip, Button } from 'antd/lib';
import { EyeIcon } from 'lucide-react';
import { OrganizationLink } from '../../interfaces/organizations';
import { getOrganizationLinks } from '../../api/organization';

const CompactLinkTable: React.FC<{ org_id: string }> = ({ org_id }) => {
  const [links, setLinks] = React.useState<OrganizationLink[]>([]);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    const fetchLinks = async () => {
      const resp = await getOrganizationLinks(org_id);
      setLinks(resp);
      setLoading(false);
    };
    fetchLinks();
  }, [org_id]);

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
      title: 'Actions',
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
        </Flex>
      ),
    },
  ];

  return (
    <>
      <Table
        loading={loading}
        columns={columns}
        dataSource={links}
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
