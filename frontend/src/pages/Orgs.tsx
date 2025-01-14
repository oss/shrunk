/**
 * Implements the orgs list view
 * @packageDocumentation
 */

import React, { useEffect, useState } from 'react';
import {
  Row,
  Col,
  Checkbox,
  Popconfirm,
  Button,
  Dropdown,
  Form,
  Input,
  Tooltip,
  Spin,
  Typography,
  Table,
  Space,
} from 'antd/lib';
import {
  ExclamationCircleFilled,
  PlusCircleFilled,
  ToolFilled,
  LineChartOutlined,
  DeleteOutlined,
  ToolOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

import { OrgInfo, listOrgs, createOrg, deleteOrg } from '../api/Org';
import { OrgAdminTag, OrgMemberTag } from './subpages/OrgCommon';

import { serverValidateOrgName } from '../Validators';

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
          {record.is_admin ? (
            <OrgAdminTag title="You are an administrator of this organization." />
          ) : null}
          {showAll && record.is_member ? <OrgMemberTag /> : null}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (record: OrgInfo) => (
        <Space>
          <Tooltip title="Manage">
            <Button
              type="text"
              href={`/app/#/orgs/${record.id}/manage`}
              icon={<ToolOutlined />}
            />
          </Tooltip>
          <Tooltip title="Stats">
            <Button
              type="text"
              icon={<LineChartOutlined />}
              href={`/app/#/orgs/${record.id}/stats`}
            />
          </Tooltip>
          {record.is_admin && (
            <Tooltip title="Delete">
              <Popconfirm
                placement="top"
                title="Are you sure you want to delete this organization?"
                onConfirm={async () => onDeleteOrg(record.id)}
                icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
              >
                <Button danger type="text" icon={<DeleteOutlined />} />
              </Popconfirm>
            </Tooltip>
          )}
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
        <div>
          {orgs.length === 0 ? (
            <p>You are currently not in any organizations.</p>
          ) : (
            <Table
              dataSource={orgs}
              columns={columns}
              rowKey="id"
              pagination={false}
            />
          )}
        </div>
      )}
    </>
  );
}
