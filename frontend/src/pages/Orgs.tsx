/**
 * Implements the orgs list view
 * @packageDocumentation
 */

import {
  Button,
  Col,
  Flex,
  Input,
  Popconfirm,
  Row,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd/lib';
import { EyeIcon, EyeOffIcon, PlusCircleIcon, TrashIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
  createOrg,
  deleteOrganization,
  getOrganizations,
} from '../api/organization';
import { Organization } from '../interfaces/organizations';

interface Props {
  userPrivileges: Set<string>;
}

/**
 * The Orgs component implements the orgs list view
 */
export default function Orgs({ userPrivileges }: Props): React.ReactElement {
  const [showAll, setShowAll] = useState(false);
  const [orgs, setOrgs] = useState<Organization[] | null>(null);
  const [newOrgName, setNewOrgName] = useState('');

  const refreshOrgs = async () => {
    const newOrgs = await getOrganizations(showAll ? 'all' : 'user');
    setOrgs(newOrgs);
  };

  useEffect(() => {
    refreshOrgs();
  }, [showAll]);

  const onCreateOrg = async (name: string) => {
    await createOrg(name);
    await refreshOrgs();
  };

  const onDeleteOrg = async (id: string) => {
    await deleteOrganization(id);
    await refreshOrgs();
  };

  const mayCreateOrg =
    userPrivileges.has('admin') || userPrivileges.has('facstaff');
  const isAdmin = userPrivileges.has('admin');

  const columns = [
    {
      title: 'Name',
      key: 'name',
      render: (record: Organization) => (
        <Space>
          {record.name}
          {record.is_admin ? <Tag color="red">Admin</Tag> : null}
          {showAll && record.is_member ? <Tag color="blue">Member</Tag> : null}
        </Space>
      ),
    },
    {
      title: <Flex justify="flex-end">Actions</Flex>,
      key: 'actions',
      width: '150px',
      render: (record: Organization) => (
        <Flex justify="flex-end">
          <Space>
            <Tooltip title="View">
              <Button
                type="text"
                icon={<EyeIcon />}
                href={`/app/orgs/${record.id}`}
              />
            </Tooltip>
            <Tooltip title="Delete">
              <Popconfirm
                title="Are you sure you want to delete this organization?"
                onConfirm={async () => {
                  try {
                    await onDeleteOrg(record.id);
                    message.success('Organization deleted successfully');
                  } catch (error) {
                    message.error('Failed to delete organization');
                  }
                }}
                okText="Yes"
                cancelText="No"
                okButtonProps={{ danger: true }}
              >
                <Button type="text" danger icon={<TrashIcon />} />
              </Popconfirm>
            </Tooltip>
          </Space>
        </Flex>
      ),
    },
  ];

  return (
    <>
      <Row gutter={24} justify="space-between" align="middle">
        <Col>
          <Typography.Title>My Organizations</Typography.Title>
        </Col>
        <Col>
          <Space.Compact>
            {isAdmin && (
              <Tooltip
                title={
                  showAll
                    ? 'Showing all organizations'
                    : 'Show all organizations'
                }
              >
                <Button
                  icon={showAll ? <EyeIcon /> : <EyeOffIcon />}
                  onClick={() => {
                    setShowAll(!showAll);
                  }}
                />
              </Tooltip>
            )}
            {mayCreateOrg && (
              <>
                <Input
                  placeholder="Organization name"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  style={{ width: '200px' }}
                />
                <Button
                  type="primary"
                  icon={<PlusCircleIcon />}
                  onClick={async () => {
                    if (newOrgName.trim()) {
                      await onCreateOrg(newOrgName.trim());
                      setNewOrgName('');
                    }
                  }}
                >
                  Create
                </Button>
              </>
            )}
          </Space.Compact>
        </Col>
      </Row>

      <Table
        dataSource={orgs !== null ? orgs : []}
        loading={orgs === null}
        columns={columns}
        rowKey="id"
        pagination={false}
      />
    </>
  );
}
