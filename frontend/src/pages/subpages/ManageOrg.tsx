/**
 * Implements the [[ManageOrg]] component
 * @packageDocumentation
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Row,
  Col,
  Button,
  Spin,
  Form,
  Input,
  Modal,
  Typography,
  Space,
  Table,
} from 'antd/lib';
import {
  ExclamationCircleOutlined,
  WarningFilled,
  EditOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import dayjs from 'dayjs';
import type { FormInstance } from 'antd/lib/form';

import { MemberInfo, OrgInfo, getOrgInfo } from '../../api/Org';
import { serverValidateOrgName } from '../../lib/validators';
import CollaboratorModal, { Entity } from '../../modals/CollaboratorModal';

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

function ManageOrgBase({
  userNetid,
  userPrivileges,
  match,
  history,
}: Props): React.ReactElement {
  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);
  const [adminsCount, setAdminsCount] = useState(0);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const formRef = useRef<FormInstance>(null);
  const [visitStats, setVisitStats] = useState<VisitDatum[] | null>(null);
  const refreshOrgInfo = async () => {
    const [info, visitData] = await Promise.all([
      getOrgInfo(match.params.id),
      fetch(`/api/v1/org/${match.params.id}/stats/visits`).then((r) =>
        r.json(),
      ),
    ]);

    const adminCount = info.members.filter((member) => member.is_admin).length;
    setOrgInfo(info);
    setAdminsCount(adminCount);
    setVisitStats(visitData.visits);
  };

  useEffect(() => {
    refreshOrgInfo();
  }, [match.params.id]);

  const onAddMember = async (netid: string, is_admin: boolean) => {
    await fetch(`/api/v1/org/${match.params.id}/member/${netid}`, {
      method: 'PUT',
    });
    if (is_admin) {
      await fetch(`/api/v1/org/${match.params.id}/member/${netid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_admin: true }),
      });
    }
    await refreshOrgInfo();
  };

  const onDeleteMember = async (netid: string) => {
    await fetch(`/api/v1/org/${match.params.id}/member/${netid}`, {
      method: 'DELETE',
    });
    await refreshOrgInfo();
  };

  const onChangeAdmin = async (netid: string, admin: boolean) => {
    await fetch(`/api/v1/org/${match.params.id}/member/${netid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_admin: admin }),
    });
    await refreshOrgInfo();
  };

  const onRenameOrg = async (newName: string) => {
    await fetch(`/api/v1/org/${match.params.id}/rename/${newName}`, {
      method: 'PUT',
    });
    history.push('/app/orgs');
  };

  const leaveOrg = async () => {
    await fetch(`/api/v1/org/${match.params.id}/member/${userNetid}`, {
      method: 'DELETE',
    });
    history.push('/app/orgs');
  };

  const deleteOrg = async () => {
    await fetch(`/api/v1/org/${match.params.id}`, {
      method: 'DELETE',
    });
    history.push('/app/orgs');
  };

  if (!orgInfo) {
    return <Spin size="large" />;
  }

  const isAdmin = orgInfo.is_admin || userPrivileges.has('admin');
  const userMayNotLeave = orgInfo.is_admin && adminsCount === 1;

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
      render: (_: any, record: MemberInfo) => {
        const stats = visitStats?.find((v) => v.netid === record.netid);
        return stats?.total_visits || 0;
      },
    },
    {
      title: 'Unique Visits',
      key: 'unique_visits',
      width: '15%',
      render: (_: any, record: MemberInfo) => {
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

  return (
    <>
      <Row gutter={16} justify="space-between" align="middle">
        <Col>
          <Typography.Title>{orgInfo.name}</Typography.Title>
        </Col>
        <Col>
          <Space>
            <Button
              icon={<EditOutlined />}
              onClick={() => setEditModalVisible(true)}
            >
              Edit
            </Button>
            {isAdmin && (
              <Button
                icon={<TeamOutlined />}
                onClick={() => setShareModalVisible(true)}
              >
                Collaborate
              </Button>
            )}
          </Space>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Table
            dataSource={orgInfo.members}
            columns={columns}
            rowKey="netid"
            pagination={false}
          />
        </Col>
      </Row>

      <Modal
        title="Edit Organization"
        open={editModalVisible}
        footer={null}
        onCancel={() => {
          formRef.current?.resetFields();
          setEditModalVisible(false);
        }}
      >
        {isAdmin && (
          <Form
            ref={formRef}
            onFinish={() => {
              formRef.current?.validateFields().then((values) => {
                onRenameOrg(values.newName);
                formRef.current?.resetFields();
                setEditModalVisible(false);
              });
            }}
          >
            <Space.Compact>
              <Form.Item
                name="newName"
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
                <Input placeholder="Name" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit">
                  Rename
                </Button>
              </Form.Item>
            </Space.Compact>
          </Form>
        )}
        <Space direction="vertical" style={{ width: '100%' }}>
          {orgInfo.is_member && (
            <Button
              block
              danger
              disabled={userMayNotLeave}
              onClick={() => {
                setEditModalVisible(false);
                Modal.confirm({
                  title: 'Leave Organization',
                  icon: <ExclamationCircleOutlined />,
                  content: 'Are you sure you want to leave this organization?',
                  onOk: leaveOrg,
                });
              }}
            >
              Leave
            </Button>
          )}
          {isAdmin && (
            <Button
              block
              danger
              onClick={() => {
                setEditModalVisible(false);
                Modal.confirm({
                  title: 'Delete Organization',
                  icon: <WarningFilled style={{ color: '#ff4d4f' }} />,
                  content: 'This action cannot be undone. Are you sure?',
                  okText: 'Delete',
                  okType: 'danger',
                  onOk: deleteOrg,
                });
              }}
            >
              Delete
            </Button>
          )}
        </Space>
      </Modal>

      <CollaboratorModal
        onlyActiveTab="netid"
        // eslint-disable-next-line react/jsx-boolean-value
        multipleMasters={true}
        visible={shareModalVisible}
        roles={[
          { label: 'Admin', value: 'admin' },
          { label: 'Member', value: 'member' },
        ]}
        people={orgInfo.members.map((member) => ({
          _id: member.netid,
          type: 'netid',
          role: member.is_admin ? 'admin' : 'member',
        }))}
        onAddEntity={(_activeTab: 'netid' | 'org', value: Entity) => {
          onAddMember(value._id, false);
        }}
        onRemoveEntity={(_activeTab: 'netid' | 'org', value: Entity) => {
          onDeleteMember(value._id);
        }}
        onChangeEntity={(
          _activeTab: 'netid' | 'org',
          value: Entity,
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
