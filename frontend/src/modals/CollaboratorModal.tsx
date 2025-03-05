import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Tabs,
  Select,
  Button,
  Space,
  Row,
  Col,
  Popconfirm,
  Tooltip,
} from 'antd/lib';
import { CloseOutlined, PlusCircleFilled } from '@ant-design/icons';
import { serverValidateNetId } from '../api/validators';
import { getOrganizations } from '../api/organization';
import { Organization } from '../interfaces/organizations';

export interface Collaborator {
  _id: string;
  type: 'netid' | 'org';
  role?: string; // Optional if removing entity.
}

interface ICollaboratorModal {
  visible: boolean;
  people: Array<Collaborator>;

  // The first role should be the MASTER role (owner or admin),
  // while the second must be the DEFAULT role.
  roles: Array<{ value: string; label: string }>;

  onAddEntity: (activeTab: 'netid' | 'org', value: Collaborator) => void;
  onChangeEntity: (
    activeTab: 'netid' | 'org',
    value: Collaborator,
    newRole: string,
  ) => void;
  onRemoveEntity: (activeTab: 'netid' | 'org', value: Collaborator) => void;
  onOk: () => void;
  onCancel: () => void;

  // eslint-disable-next-line react/require-default-props
  multipleMasters?: boolean;
  // eslint-disable-next-line react/require-default-props
  onlyActiveTab?: 'netid' | 'org';
}

export default function CollaboratorModal(props: ICollaboratorModal) {
  const [form] = Form.useForm();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [collaboratorRole, setCollaboratorRole] = useState<string>(
    props.roles[1].value,
  );
  const [collaboratorType, setCollaboratorType] = useState<'netid' | 'org'>(
    'netid',
  );

  const [activeTab, setActiveTab] = useState<'netid' | 'org'>(collaboratorType);

  function refreshOrganizations() {
    getOrganizations('user').then((orgs) => setOrganizations(orgs));
  }

  const masterRole = props.roles[0].value;

  useEffect(() => {
    const permissionOrder: { [key: string]: number } = {};
    props.roles.forEach((role, index) => {
      permissionOrder[role.value] = index;
    });
    props.people.sort((a: Collaborator, b: Collaborator) => {
      if (a.role === undefined || b.role === undefined) {
        throw new Error('Collaborator must have a role');
      }
      return permissionOrder[a.role] - permissionOrder[b.role];
    });

    refreshOrganizations();
  }, []);

  // Count how many masters we currently have
  const mastersCount = props.people.filter(
    (entity) => entity.role === masterRole,
  ).length;

  // Determine if we can add more masters based on multipleMasters prop
  const canAddMaster = props.multipleMasters || mastersCount === 0;

  // Determine if we can demote masters based on multipleMasters prop
  const canDemoteMaster = props.multipleMasters && mastersCount > 1;

  return (
    <Modal
      open={props.visible}
      title="Collaborate"
      onOk={() => {
        form.resetFields();
        props.onOk();
      }}
      onCancel={() => {
        form.resetFields();
        props.onCancel();
      }}
      footer={null}
    >
      <Form form={form} preserve={false}>
        <Row gutter={[16, 2]}>
          <Col span={24}>
            <Space.Compact style={{ width: '100%' }}>
              {activeTab === 'netid' ? (
                <Form.Item
                  name="netid"
                  style={{ marginBottom: '5px', width: '100%' }}
                  rules={[
                    {
                      required: true,
                      message: 'Please enter a valid NetID.',
                    },
                    { validator: serverValidateNetId },
                  ]}
                >
                  <Input
                    placeholder="Search by NetID"
                    onPressEnter={(_: any) => {
                      setCollaboratorType('netid');
                    }}
                  />
                </Form.Item>
              ) : (
                <Form.Item
                  name="organization"
                  style={{ marginBottom: '5px', width: '100%' }}
                  rules={[
                    {
                      required: true,
                      message: 'Please select an organization.',
                    },
                  ]}
                >
                  <Select
                    placeholder="Your Organizations"
                    onChange={(_: any) => {
                      setCollaboratorType('org');
                    }}
                  >
                    {organizations.map((org) => (
                      <Select.Option key={org.id} value={org.id}>
                        {org.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              )}
              <Select
                defaultValue={collaboratorRole}
                onChange={(value: string) => {
                  setCollaboratorRole(value);
                }}
                options={props.roles.map((role) => ({
                  value: role.value,
                  label: role.label,
                  disabled: role.value === masterRole && !canAddMaster,
                }))}
              />
              <Button
                icon={<PlusCircleFilled />}
                onClick={() => {
                  props.onAddEntity(activeTab, {
                    _id:
                      activeTab === 'netid'
                        ? form.getFieldValue('netid')
                        : form.getFieldValue('organization'),
                    type: activeTab,
                    role: collaboratorRole,
                  });
                }}
                type="primary"
              >
                Add
              </Button>
            </Space.Compact>
          </Col>
          <Col span={24}>
            <Tabs
              activeKey={activeTab}
              onChange={(value) => setActiveTab(value as 'netid' | 'org')}
            >
              {['netid', undefined].includes(props.onlyActiveTab) && (
                <Tabs.TabPane tab="People" key="netid" />
              )}
              {['org', undefined].includes(props.onlyActiveTab) && (
                <Tabs.TabPane tab="Organizations" key="org" />
              )}
            </Tabs>
            <Row gutter={[2, 16]} justify="space-between" align="middle">
              {props.people.map((entity) => {
                if (entity.type !== activeTab) {
                  return <></>;
                }

                const displayName =
                  entity.type === 'netid'
                    ? entity._id
                    : organizations.find((org) => org.id === entity._id)?.name;

                const isMaster = entity.role === masterRole;
                const isLastMaster = isMaster && mastersCount === 1;
                const canChangeRole =
                  !isLastMaster && (!isMaster || canDemoteMaster);

                return (
                  <>
                    <Col span={12}>{displayName}</Col>
                    <Col>
                      <Space>
                        <Select
                          style={{ width: 120 }}
                          defaultValue={entity.role}
                          onChange={(value: string) => {
                            props.onChangeEntity(activeTab, entity, value);
                          }}
                          options={props.roles.map((role) => ({
                            value: role.value,
                            label: role.label,
                            disabled:
                              (role.value === masterRole && !canAddMaster) ||
                              (!canChangeRole && role.value !== entity.role) ||
                              (isLastMaster && role.value !== masterRole),
                          }))}
                        />

                        <Popconfirm
                          title="Are you sure you want to remove this collaborator?"
                          onConfirm={() => {
                            props.onRemoveEntity(activeTab, entity);
                          }}
                          disabled={isLastMaster}
                        >
                          <Tooltip
                            title={
                              isLastMaster
                                ? `Cannot remove the only ${masterRole}`
                                : 'Remove collaborator'
                            }
                          >
                            <Button
                              type="text"
                              icon={<CloseOutlined />}
                              disabled={isLastMaster}
                            />
                          </Tooltip>
                        </Popconfirm>
                      </Space>
                    </Col>
                  </>
                );
              })}
            </Row>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
