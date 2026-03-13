/**
 * Implements the orgs list view
 * @packageDocumentation
 */

import {
  Button,
  Checkbox,
  Col,
  Drawer,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Space,
  Table,
  Tooltip,
  Typography,
  message,
  Alert,
  Layout,
  Affix,
  Select,
  Radio,
  Pagination,
  Tag,
} from 'antd';
import {
  EyeIcon,
  PlusCircleIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  FilterIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import React, { useEffect, useState, useCallback } from 'react';
import {
  createOrg,
  deleteOrganization,
  searchOrgs,
  hasAssociatedUrls,
} from '@/api/organization';
import useDarkMode from '@/lib/hooks/useDarkMode';
import { serverValidateNetId } from '@/api/validators';
import { Organization, OrgSearchQuery } from '@/interfaces/organizations';

interface Props {
  userPrivileges: Set<string>;
}

interface FilterFormProps {
  query: OrgSearchQuery;
  setQuery: React.Dispatch<React.SetStateAction<OrgSearchQuery>>;
  onSearch: () => void;
  isAdmin: boolean;
  memberNetidError: string | null;
  setMemberNetidError: React.Dispatch<React.SetStateAction<string | null>>;
}

const DEFAULT_QUERY: OrgSearchQuery = {
  query: '',
  show_all: false,
  filter_deleted: false,
  filter_role: [],
  filter_member: '',
  sort: { key: 'timeCreated', order: 'descending' },
  pagination: { skip: 0, limit: 10 },
};

const { Sider, Content } = Layout;

const FilterForm = ({
  query,
  setQuery,
  onSearch,
  isAdmin,
  memberNetidError,
  setMemberNetidError,
}: FilterFormProps) => (
  <Form layout="vertical">
    <Form.Item label="Sort by">
      <Select
        value={query.sort.key}
        onChange={(val) =>
          setQuery((prev) => ({
            ...prev,
            sort: { ...prev.sort, key: val },
          }))
        }
        style={{ width: '100%' }}
      >
        <Select.Option value="timeCreated">Time Created</Select.Option>
        <Select.Option value="name">Name</Select.Option>
        <Select.Option value="memberCount">Member Count</Select.Option>
        <Select.Option value="dateAdded">Date Added</Select.Option>
      </Select>
    </Form.Item>
    <Form.Item
      label="Has Member"
      validateStatus={memberNetidError ? 'error' : undefined}
      help={memberNetidError || undefined}
    >
      <Input
        placeholder="NetID"
        value={query.filter_member}
        onChange={(e) => {
          setMemberNetidError(null);
          setQuery((prev) => ({
            ...prev,
            filter_member: e.target.value,
          }));
        }}
        onPressEnter={onSearch}
      />
    </Form.Item>
    <Form.Item label="My Role">
      <Checkbox.Group
        value={query.filter_role}
        onChange={(checkedValues) =>
          setQuery((prev) => ({
            ...prev,
            filter_role: checkedValues as (
              | 'admin'
              | 'member'
              | 'guest'
              | 'not_member'
            )[],
          }))
        }
      >
        <Flex gap="1rem" wrap="wrap" justify="space-between">
          <Space orientation="vertical">
            <Checkbox value="admin">Admin</Checkbox>
            <Checkbox value="member">Member</Checkbox>
            <Checkbox value="guest">Guest</Checkbox>
            {query.show_all && (
              <Checkbox value="not_member">Not a member</Checkbox>
            )}
          </Space>
        </Flex>
      </Checkbox.Group>
    </Form.Item>
    <Form.Item label="Sort Order">
      <Button
        onClick={() =>
          setQuery((prev) => ({
            ...prev,
            sort: {
              ...prev.sort,
              order:
                prev.sort.order === 'ascending' ? 'descending' : 'ascending',
            },
          }))
        }
        icon={
          query.sort.order === 'ascending' ? <ArrowUpIcon /> : <ArrowDownIcon />
        }
      >
        {query.sort.order.charAt(0).toUpperCase() + query.sort.order.slice(1)}
      </Button>
    </Form.Item>
    {isAdmin && (
      <Form.Item label="All Organizations">
        <Radio.Group
          optionType="button"
          buttonStyle="solid"
          value={query.show_all}
          onChange={(e) => {
            const showAll = e.target.value as boolean;
            setQuery((prev) => ({
              ...prev,
              show_all: showAll,
              filter_role: showAll
                ? prev.filter_role
                : prev.filter_role?.filter((role) => role !== 'not_member'),
              pagination: { ...prev.pagination, skip: 0 },
            }));
          }}
        >
          <Radio.Button value={false}>Hide</Radio.Button>
          <Radio.Button value>Show</Radio.Button>
        </Radio.Group>
      </Form.Item>
    )}
    {isAdmin && (
      <Form.Item label="Deleted Organizations">
        <Radio.Group
          optionType="button"
          buttonStyle="solid"
          value={query.filter_deleted}
          onChange={(e) =>
            setQuery((prev) => ({
              ...prev,
              filter_deleted: e.target.value,
            }))
          }
        >
          <Radio.Button value={false}>Hide</Radio.Button>
          <Radio.Button value>Show</Radio.Button>
        </Radio.Group>
      </Form.Item>
    )}
  </Form>
);

const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default function MyOrganizations({
  userPrivileges,
}: Props): React.ReactElement {
  const { darkMode } = useDarkMode();
  const [orgs, setOrgs] = useState<Organization[] | null>(null);
  const [totalOrgs, setTotalOrgs] = useState<number>(0);
  const [query, setQuery] = useState<OrgSearchQuery>(DEFAULT_QUERY);
  const [searchInput, setSearchInput] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showAssociatedUrlsAlert, setShowAssociatedUrlsAlert] = useState(false);
  const [memberNetidError, setMemberNetidError] = useState<string | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [form] = Form.useForm();

  const isAdmin = userPrivileges.has('admin');
  const mayCreateOrg =
    userPrivileges.has('admin') || userPrivileges.has('facstaff');

  const debouncedQuery = useDebounce(query, 300);

  const [lastActiveColumn, setLastActiveColumn] = useState<
    'timeCreated' | 'memberCount' | 'dateAdded'
  >('timeCreated');

  useEffect(() => {
    if (
      query.sort.key === 'timeCreated' ||
      query.sort.key === 'memberCount' ||
      query.sort.key === 'dateAdded'
    ) {
      setLastActiveColumn(query.sort.key);
    }
  }, [query.sort.key]);

  const refreshOrgs = useCallback(async () => {
    try {
      const memberNetid = debouncedQuery.filter_member?.trim() || '';
      const normalizedQuery = {
        ...debouncedQuery,
        filter_member: memberNetid,
      };

      if (memberNetid) {
        try {
          await serverValidateNetId({}, memberNetid);
          setMemberNetidError(null);
        } catch {
          setMemberNetidError('That NetID is not valid.');
          return;
        }
      } else {
        setMemberNetidError(null);
      }

      const data = await searchOrgs(normalizedQuery);
      setOrgs(data.results);
      setTotalOrgs(data.count);
    } catch (error) {
      message.error('Failed to fetch organizations');
    }
  }, [debouncedQuery]);

  useEffect(() => {
    refreshOrgs();
  }, [refreshOrgs]);

  const onSearch = useCallback(() => {
    setQuery((prev) => ({
      ...prev,
      query: searchInput,
      pagination: { ...prev.pagination, skip: 0 },
    }));
    setCurrentPage(1);
  }, [searchInput]);

  const setPage = (page: number) => {
    setCurrentPage(page);
    setQuery((prev) => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        skip: (page - 1) * prev.pagination.limit,
      },
    }));
  };

  const onCreate = async () => {
    try {
      const rawName = form.getFieldValue('organization_name');
      const cleanedName = rawName.trim().replace(/\s+/g, ' ');

      await createOrg(cleanedName);
      message.success('Organization created successfully');
      setIsCreateModalOpen(false);
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

  const orgRoleFormat = {
    admin: 'Admin',
    member: 'Member',
    guest: 'Guest',
  };

  const columns = [
    {
      title: 'Name',
      key: 'name',
      dataIndex: 'name',
      render: (name: string, record: Organization) => (
        <Space>
          <Typography.Text>{name}</Typography.Text>
          {record.deleted && (
            <Tag color="red" className="tw-ml-2">
              Deleted
            </Tag>
          )}
        </Space>
      ),
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
    ...(lastActiveColumn === 'timeCreated'
      ? [
          {
            title: 'Time Created',
            key: 'timeCreated',
            dataIndex: 'timeCreated',
            render: (date: Date) =>
              date ? dayjs(date).format('MMM D, YYYY') : '-',
          },
        ]
      : []),
    ...(lastActiveColumn === 'memberCount'
      ? [
          {
            title: 'Members',
            key: 'memberCount',
            dataIndex: 'memberCount',
            render: (count: number) => count || 0,
          },
        ]
      : []),
    ...(lastActiveColumn === 'dateAdded'
      ? [
          {
            title: 'Date Added',
            key: 'dateAdded',
            // @ts-ignore
            dataIndex: 'dateAdded',
            render: (date: Date) =>
              date ? dayjs(date).format('MMM D, YYYY') : '-',
          },
        ]
      : []),
    {
      title: <Flex justify="flex-end">Actions</Flex>,
      key: 'actions',
      width: '150px',
      render: (record: Organization) => (
        <Flex justify="flex-end">
          <Space>
            <Tooltip title="View">
              <Link
                className="tw-flex tw-items-center"
                to={`/app/orgs/${record.id}`}
              >
                <EyeIcon color={darkMode ? '#FFFFFF' : '#000000'} />
              </Link>
            </Tooltip>
            {isAdmin && (
              <Popconfirm
                title="Are you sure you want to delete this organization?"
                disabled={record.deleted}
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
                  disabled={record.deleted}
                  icon={<TrashIcon />}
                  onClick={async () => {
                    if (record.deleted) return;
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
            )}
          </Space>
        </Flex>
      ),
    },
  ];

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  return (
    <Layout className="tw-bg-white dark:tw-bg-[#1f1f1f]">
      <Row align="middle" justify="space-between">
        <Col>
          <Typography.Title level={2}>My Organizations</Typography.Title>
        </Col>
        <Col className="tw-hidden lg:tw-block">
          {mayCreateOrg && (
            <Button
              type="primary"
              icon={<PlusCircleIcon />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Create
            </Button>
          )}
        </Col>
      </Row>
      <Row
        className="tw-mb-4 lg:tw-hidden"
        gutter={8}
        wrap={false}
        align="middle"
      >
        <Col>
          {mayCreateOrg && (
            <Button
              type="primary"
              icon={<PlusCircleIcon />}
              onClick={() => setIsCreateModalOpen(true)}
            />
          )}
        </Col>
        <Col>
          <Button
            icon={<FilterIcon />}
            onClick={() => {
              setMobileFiltersOpen(true);
            }}
          />
        </Col>
        <Col flex="auto">
          <Input.Search
            placeholder="Search organizations..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onSearch={onSearch}
            enterButton
          />
        </Col>
      </Row>
      <Layout className="tw-bg-white dark:tw-bg-[#1f1f1f]">
        <Sider
          className="tw-mt-[4px]tw-bg-white tw-hidden tw-pr-4 lg:tw-block dark:tw-bg-[#1f1f1f]"
          width="25%"
          breakpoint="lg"
          collapsedWidth="0"
          trigger={null}
        >
          <Affix offsetTop={50}>
            <div>
              <Input.Search
                className="tw-pb-2"
                placeholder="Search organizations..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onSearch={onSearch}
                enterButton
              />
              <FilterForm
                query={query}
                setQuery={setQuery}
                onSearch={onSearch}
                isAdmin={isAdmin}
                memberNetidError={memberNetidError}
                setMemberNetidError={setMemberNetidError}
              />
            </div>
          </Affix>
        </Sider>
        <Content className="tw-bg-white dark:tw-bg-[#1f1f1f]">
          {showAssociatedUrlsAlert && (
            <Alert
              title="Warning! Links found to be associated with organization"
              type="warning"
              showIcon
              closable
              onClose={() => setShowAssociatedUrlsAlert(false)}
              className="tw-mb-4"
            />
          )}

          <Table
            dataSource={orgs || []}
            loading={orgs === null}
            columns={columns}
            rowKey="id"
            pagination={false}
            scroll={{ x: 800 }}
          />
          <div className="tw-mt-4 tw-flex tw-justify-center">
            <Pagination
              current={currentPage}
              total={totalOrgs}
              pageSize={query.pagination.limit}
              onChange={setPage}
              showSizeChanger
              onShowSizeChange={(page, pageSize) => {
                setQuery((prev) => ({
                  ...prev,
                  pagination: {
                    ...prev.pagination,
                    limit: pageSize,
                  },
                }));
              }}
            />
          </div>
        </Content>
      </Layout>

      <Drawer
        title="Filters"
        placement="left"
        onClose={() => setMobileFiltersOpen(false)}
        open={mobileFiltersOpen}
      >
        <FilterForm
          query={query}
          setQuery={setQuery}
          onSearch={onSearch}
          isAdmin={isAdmin}
          memberNetidError={memberNetidError}
          setMemberNetidError={setMemberNetidError}
        />
      </Drawer>

      <Modal
        title="Create Organization"
        open={isCreateModalOpen}
        onOk={onCreate}
        onCancel={() => {
          setIsCreateModalOpen(false);
          form.resetFields();
        }}
        okText="Create"
        destroyOnHidden
      >
        <Form layout="vertical" requiredMark={false} form={form}>
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
            <Input placeholder="Enter organization name..." />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
