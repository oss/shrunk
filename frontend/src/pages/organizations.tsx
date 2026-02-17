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
  Input,
  Popconfirm,
  Row,
  Space,
  Table,
  Tooltip,
  Typography,
  message,
  Alert,
} from 'antd';
import {
  EllipsisIcon,
  EyeIcon,
  EyeOffIcon,
  PlusCircleIcon,
  TrashIcon,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
  createOrg,
  deleteOrganization,
  getOrganizations,
  hasAssociatedUrls,
} from '@/api/organization';
import { Organization } from '@/interfaces/organizations';

interface Props {
  userPrivileges: Set<string>;
}

export default function MyOrganizations({
  userPrivileges,
}: Props): React.ReactElement {
  const [showAll, setShowAll] = useState(false);
  const [orgs, setOrgs] = useState<Organization[] | null>(null);
  const [showAssociatedUrlsAlert, setShowAssociatedUrlsAlert] = useState(false);

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
    try {
      const rawName = form.getFieldValue('organization_name');
      const cleanedName = rawName.trim().replace(/\s+/g, ' ');

      await createOrg(cleanedName);
      message.success('Organization created successfully');
      setIsCreateDrawerOpen(false);
      form.resetFields();
      await refreshOrgs();
    } catch (error) {
      message.error('Failed to create organization.');
    }
  };

  const onDeleteOrg = async (id: string) => {
    await deleteOrganization(id);
    await refreshOrgs();
  };

  const onCheckUrls = async (id: string): Promise<boolean> => {
    const check = await hasAssociatedUrls(id);
    return check;
  };

  const toggleShowAllOrganizations = async () => {
    setShowAll(!showAll);
  };

  const orgRoleFormat = {
    admin: 'Admin',
    member: 'Member',
    guest: 'Guest',
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
          {record.role ? orgRoleFormat[record.role] : 'None'}
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
            {record.role === 'admin' && (
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
                    setShowAssociatedUrlsAlert(false);
                  }}
                  okText="Yes"
                  cancelText="No"
                  okButtonProps={{ danger: true }}
                  onCancel={() => setShowAssociatedUrlsAlert(false)}
                >
                  <Button
                    type="text"
                    danger
                    icon={<TrashIcon />}
                    onClick={async () => {
                      try {
                        const res = await onCheckUrls(record.id);
                        if (res) {
                          setShowAssociatedUrlsAlert(true);
                        }
                      } catch (error) {
                        message.error('Failed to search for associated urls');
                      }
                    }}
                  />
                </Popconfirm>
              </Tooltip>
            )}
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
                    label: (
                      <p className="tw-m-0 !tw-text-black">
                        Create an organization
                      </p>
                    ),
                    icon: <PlusCircleIcon color="#000" />,
                    onClick: () => {
                      setIsCreateDrawerOpen(true);
                    },
                    disabled: !mayCreateOrg,
                  },
                  {
                    key: 'admin_show_all_organizations',
                    label: (
                      <p className="tw-m-0 !tw-text-black">
                        Show all organizations
                      </p>
                    ),
                    icon: showAll ? (
                      <EyeIcon color="#000" />
                    ) : (
                      <EyeOffIcon color="#000" />
                    ),
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
          {showAssociatedUrlsAlert && (
            <Alert
              title="Warning! Links found to be associated with organization"
              type="warning"
              showIcon
              closable
              onClose={() => setShowAssociatedUrlsAlert(false)}
            />
          )}
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
