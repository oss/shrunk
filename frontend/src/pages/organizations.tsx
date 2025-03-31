/**
 * Implements the orgs list view
 * @packageDocumentation
 */

import {
  Button,
  Col,
  Drawer,
  Dropdown,
  Flex,
  Form,
  FormInstance,
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
import {
  EllipsisIcon,
  EyeIcon,
  EyeOffIcon,
  PlusCircleIcon,
  TrashIcon,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import {
  createOrg,
  deleteOrganization,
  getOrganizations,
} from '../api/organization';
import { Organization } from '../interfaces/organizations';

interface Props {
  userPrivileges: Set<string>;
}

export default function MyOrganizations({
  userPrivileges,
}: Props): React.ReactElement {
  const [showAll, setShowAll] = useState(false);
  const [orgs, setOrgs] = useState<Organization[] | null>(null);

  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  const [form] = Form.useForm();

  const refreshOrgs = async () => {
    const newOrgs = await getOrganizations(showAll ? 'all' : 'user');
    setOrgs(newOrgs);
  };

  useEffect(() => {
    refreshOrgs();
  }, [showAll]);

  const onCreate = async () => {
    await createOrg(form.getFieldValue('organization_name'));
    message.success('Organization created successfully');
    setIsCreateDrawerOpen(false);
    form.resetFields();
    await refreshOrgs();
  };

  const onDeleteOrg = async (id: string) => {
    await deleteOrganization(id);
    await refreshOrgs();
  };

  const toggleShowAllOrganizations = async () => {
    setShowAll(!showAll);
  };

  const mayCreateOrg =
    userPrivileges.has('admin') || userPrivileges.has('facstaff');
  const isAdmin = userPrivileges.has('admin');

  const columns = [
    {
      title: 'Name',
      key: 'name',
      dataIndex: 'name',
    },
    {
      title: 'Role',
      key: 'role',
      render: (record: Organization) => (
        <Typography.Text>
          {record.is_admin ? 'Admin' : showAll ? 'None' : 'Member'}
        </Typography.Text>
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
          <Space>
            <Dropdown
              placement="bottomRight"
              menu={{
                items: [
                  {
                    key: 'create',
                    label: 'Create an organization',
                    icon: <PlusCircleIcon />,
                    onClick: () => {
                      setIsCreateDrawerOpen(true);
                    },
                    disabled: !mayCreateOrg,
                  },
                  {
                    key: 'admin_show_all_organizations',
                    label: 'Show all organizations',
                    icon: showAll ? <EyeIcon /> : <EyeOffIcon />,
                    onClick: toggleShowAllOrganizations,
                    disabled: !isAdmin,
                  },
                ],
              }}
            >
              <Button icon={<EllipsisIcon />} />
            </Dropdown>
          </Space>
        </Col>
        <Col span={24}>
          <Table
            dataSource={orgs !== null ? orgs : []}
            loading={orgs === null}
            columns={columns}
            rowKey="id"
            pagination={false}
          />
        </Col>
      </Row>

      <Drawer
        width={720}
        open={isCreateDrawerOpen}
        onClose={() => {
          setIsCreateDrawerOpen(false);
          form.resetFields();
        }}
        extra={
          <Space>
            <Button icon={<PlusCircleIcon />} onClick={onCreate} type="primary">
              Create
            </Button>
          </Space>
        }
      >
        <Form layout="vertical" requiredMark={false} form={form}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item
                label="Organization Name"
                name="organization_name"
                rules={[
                  {
                    required: true,
                    message: 'Please enter the organization name.',
                  },
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Drawer>
    </>
  );
}
