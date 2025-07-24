import {
  Button,
  Col,
  Drawer,
  Dropdown,
  Form,
  Input,
  Popconfirm,
  Row,
  Space,
  Spin,
  Table,
  Typography,
  Tabs,
} from 'antd/lib';
import type { TabsProps } from 'antd/lib/tabs';
import type { FormInstance } from 'antd/lib/form';
import dayjs from 'dayjs';
import {
  CodeIcon,
  EllipsisIcon,
  SettingsIcon,
  TrashIcon,
  UserMinusIcon,
  UsersIcon,
  Link2
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import {
  addMemberToOrganization,
  deleteOrganization,
  getOrganization,
  getOrganizationVisits,
  removeMemberFromOrganization,
  renameOrganization,
  setAdminStatusOrganization,
} from '../../api/organization';
import { serverValidateOrgName } from '../../api/validators';
import {
  Organization,
  OrganizationMember,
} from '../../interfaces/organizations';
import CollaboratorModal, {
  Collaborator,
} from '../../modals/CollaboratorModal';
import CompactLinkTable from '../components/orgs/CompactLinkTable';

type RouteParams = {
  id: string;
};

type Props = {
  userNetid: string;
  userPrivileges: Set<string>;
} & RouteComponentProps<RouteParams>;

interface VisitDatum {
  netid: string;
  total_visits: number;
  unique_visits: number;
}

const VALID_TABS = ['members', 'links'];
const DEFAULT_TAB = 'analytics';

function ManageOrgBase({
  userNetid,
  userPrivileges,
  match,
  history,
}: Props): React.ReactElement {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [adminsCount, setAdminsCount] = useState(0);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const formRef = useRef<FormInstance>(null);
  const [visitStats, setVisitStats] = useState<VisitDatum[] | null>(null);
  const [activeTab, setActiveTab] = useState<string>(DEFAULT_TAB)

  
  const refreshOrganization = async () => {
    const [info, visitData] = await Promise.all([
      getOrganization(match.params.id),
      getOrganizationVisits(match.params.id),
    ]);

    const adminCount = info.members.filter((member) => member.is_admin).length;
    setOrganization(info);
    setAdminsCount(adminCount);
    setVisitStats(visitData.visits);
  };

  useEffect(() => {
    refreshOrganization();
  }, [match.params.id]);

  const onAddMember = async (netid: string, isAdmin: boolean) => {
    await addMemberToOrganization(match.params.id, netid);
    if (isAdmin) {
      await setAdminStatusOrganization(match.params.id, netid, isAdmin);
    }
    await refreshOrganization();
  };

  const onDeleteMember = async (netid: string) => {
    await removeMemberFromOrganization(match.params.id, netid);
    await refreshOrganization();
  };

  const onChangeAdmin = async (netid: string, admin: boolean) => {
    await setAdminStatusOrganization(match.params.id, netid, admin);
    await refreshOrganization();
  };

  const onRenameOrg = async (newName: string) => {
    await renameOrganization(match.params.id, newName);
    history.push('/app/orgs');
  };

  const onLeaveOrg = async () => {
    removeMemberFromOrganization(match.params.id, userNetid);
    history.push('/app/orgs');
  };

  const onDeleteOrganization = async () => {
    deleteOrganization(match.params.id);
    history.push('/app/orgs');
  };

  const handleTabChange = (key: string) => {
    if (VALID_TABS.includes(key)) {
      setActiveTab(key);
    }
  }

  const onEditOrganization = async () => {
    setEditModalVisible(true);
  };

  if (!organization) {
    return <Spin size="large" />;
  }

  const isAdmin = organization.is_admin || userPrivileges.has('admin');
  const userMayNotLeave = organization.is_admin && adminsCount === 1;


  


  const columns = [
    {
      title: 'Member',
      key: 'netid',
      dataIndex: 'netid',
    },
    {
      title: 'Total Visits',
      key: 'total_visits',
      width: '15%',
      render: (_: any, record: OrganizationMember) => {
        const stats = visitStats?.find((v) => v.netid === record.netid);
        return stats?.total_visits || 0;
      },
    },
    {
      title: 'Unique Visits',
      key: 'unique_visits',
      width: '15%',
      render: (_: any, record: OrganizationMember) => {
        const stats = visitStats?.find((v) => v.netid === record.netid);
        return stats?.unique_visits || 0;
      },
    },
    {
      title: 'Date Added',
      dataIndex: 'timeCreated',
      key: 'timeCreated',
      width: '15%',
      render: (date: string) => dayjs(date).format('MMM D, YYYY'),
    },
  ];

  const items: TabsProps['items'] = [
    {
      key: 'members',
      icon: <UsersIcon />,
      label: 'Members',
      children: (
        <Table
            dataSource={organization.members}
            columns={columns}
            rowKey="netid"
            pagination={false}
          />
      )
    },
    {
      key: 'links',
      icon: <Link2 />,
      label: 'Links',
      children: <CompactLinkTable />
    },
  ]

  return (
    <>
      <Row gutter={16} justify="space-between" align="middle">
        <Col>
          <Typography.Title>{organization.name}</Typography.Title>
        </Col>
        <Col>
          <Space>
            {isAdmin && (
              <Button
                icon={<UsersIcon />}
                onClick={() => setShareModalVisible(true)}
              >
                Collaborate
              </Button>
            )}

            <Dropdown
              placement="bottomRight"
              menu={{
                items: [
                  {
                    key: 'settings_organization',
                    label: 'Settings',
                    icon: <SettingsIcon />,
                    onClick: onEditOrganization,
                  },
                  {
                    key: 'settings_developer_organization',
                    label: 'Access Tokens',
                    icon: <CodeIcon />,
                    onClick: () => {
                      history.push(`/app/orgs/${match.params.id}/tokens`);
                    },
                  },
                  { type: 'divider' },
                  {
                    key: 'leave_organization',
                    label: 'Leave',
                    icon: <UserMinusIcon />,
                    disabled: userMayNotLeave && organization.is_member,
                    onClick: onLeaveOrg,
                    danger: true,
                  },
                ],
              }}
            >
              <Button icon={<EllipsisIcon />} />
            </Dropdown>
          </Space>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Tabs
            defaultActiveKey="members"
            items={items}
            onChange={handleTabChange}
          />
        </Col>
      </Row>

      <Drawer
        title="Settings"
        width={720}
        open={editModalVisible}
        footer={null}
        onClose={() => {
          formRef.current?.resetFields();
          setEditModalVisible(false);
        }}
      >
        {isAdmin && (
          <Form
            ref={formRef}
            layout="vertical"
            requiredMark={false}
            onFinish={() => {
              formRef.current?.validateFields().then((values) => {
                onRenameOrg(values.newName);
                formRef.current?.resetFields();
                setEditModalVisible(false);
              });
            }}
          >
            <Row gutter={16}>
              <Col span={24}>
                <Typography.Title className="tw-m-0" level={3}>
                  Public Information
                </Typography.Title>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="newName"
                  label="Organization's name"
                  rules={[
                    { required: true, message: 'Please input a new name.' },
                    {
                      pattern: /^[a-zA-Z0-9_.,-]*$/,
                      message:
                        'Name must consist of letters, numbers, and the characters "_.,-".',
                    },
                    {
                      max: 60,
                      message: 'Org names can be at most 60 characters long',
                    },
                    { validator: serverValidateOrgName },
                  ]}
                >
                  <Input placeholder={organization.name} />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item>
                  <Button type="primary" htmlType="submit">
                    Save
                  </Button>
                </Form.Item>
              </Col>
              <Col span={24}>
                <Typography.Title className="tw-m-0" level={3}>
                  Danger Zone
                </Typography.Title>
              </Col>
              <Col span={24}>
                <Form.Item label="Once you delete an organization, there is no going back. Please be certain.">
                  <Popconfirm
                    title="Are you sure you want to delete this organization?"
                    onConfirm={onDeleteOrganization}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button danger icon={<TrashIcon />}>
                      Delete
                    </Button>
                  </Popconfirm>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        )}
      </Drawer>

      <CollaboratorModal
        onlyActiveTab="netid"
        // eslint-disable-next-line react/jsx-boolean-value
        multipleMasters={true}
        visible={shareModalVisible}
        roles={[
          { label: 'Admin', value: 'admin' },
          { label: 'Member', value: 'member' },
        ]}
        people={organization.members.map((member) => ({
          _id: member.netid,
          type: 'netid',
          role: member.is_admin ? 'admin' : 'member',
        }))}
        onAddEntity={(_activeTab: 'netid' | 'org', value: Collaborator) => {
          onAddMember(value._id, false);
        }}
        onRemoveEntity={(_activeTab: 'netid' | 'org', value: Collaborator) => {
          onDeleteMember(value._id);
        }}
        onChangeEntity={(
          _activeTab: 'netid' | 'org',
          value: Collaborator,
          newRole: string,
        ) => {
          onChangeAdmin(value._id, newRole === 'admin');
        }}
        onCancel={() => setShareModalVisible(false)}
        onOk={() => setShareModalVisible(false)}
      />
    </>
  );
}

export default withRouter(ManageOrgBase);
