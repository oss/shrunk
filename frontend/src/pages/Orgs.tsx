/**
 * Implements the orgs list view
 * @packageDocumentation
 */

import React, { useEffect, useState } from 'react';
import {
  Row,
  Col,
  Popconfirm,
  Button,
  Input,
  Tooltip,
  Spin,
  Typography,
  Table,
  Space,
  Tag,
  message,
} from 'antd/lib';
import {
  PlusCircleFilled,
  DeleteOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';

import { OrgInfo, listOrgs, createOrg, deleteOrg } from '../api/Org';

/**
 * Props for the [[Orgs]] component
 * @interface
 */
interface Props {
  /**
   * The user's privileges
   * @property
   */
  userPrivileges: Set<string>;
}

/**
 * The Orgs component implements the orgs list view
 */
export default function Orgs({ userPrivileges }: Props): React.ReactElement {
  const [showAll, setShowAll] = useState(false);
  const [orgs, setOrgs] = useState<OrgInfo[] | null>(null);
  const [newOrgName, setNewOrgName] = useState('');

  const refreshOrgs = async () => {
    const newOrgs = await listOrgs(showAll ? 'all' : 'user');
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
    await deleteOrg(id);
    await refreshOrgs();
  };

  const mayCreateOrg =
    userPrivileges.has('admin') || userPrivileges.has('facstaff');
  const isAdmin = userPrivileges.has('admin');

  const columns = [
    {
      title: 'Name',
      key: 'name',
      render: (record: OrgInfo) => (
        <Space>
          <a href={`/app/#/orgs/${record.id}/manage`}>{record.name}</a>
          {record.is_admin ? <Tag color="red">Admin</Tag> : null}
          {showAll && record.is_member ? <Tag color="blue">Member</Tag> : null}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (record: OrgInfo) => (
        <Space>
          <Tooltip title="View">
            <Button
              type="text"
              icon={<EyeOutlined />}
              href={`/app/#/orgs/${record.id}/manage`}
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
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
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
                  icon={showAll ? <EyeOutlined /> : <EyeInvisibleOutlined />}
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
                  icon={<PlusCircleFilled />}
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

      {orgs === null ? (
        <Spin size="large" />
      ) : (
        <Table
          dataSource={orgs}
          columns={columns}
          rowKey="id"
          pagination={false}
        />
      )}
    </>
  );
}
