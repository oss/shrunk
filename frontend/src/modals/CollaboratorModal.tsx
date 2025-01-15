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
import { serverValidateNetId } from '../Validators';
import { listOrgs, OrgInfo } from '../api/Org';

export type Entity = {
  /**
   * The id of the entity the link is shared with.
   */
  _id: string;
  /**
   * The type of entity the link is shared with.
   */
  type: 'netid' | 'org';
  /**
   * The permission the link is shared with
   */
  permission: 'viewer' | 'editor' | 'owner';
};

interface ICollaboratorModal {
  visible: boolean;
  people: Array<Entity>;

  onAddEntity: (value: Entity) => void;
  onRemoveEntity: (_id: string, type: string, permission: string) => void;
  onOk: () => void;
  onCancel: () => void;
}

export default function CollaboratorModal(props: ICollaboratorModal) {
  const [form] = Form.useForm();

  const [organizations, setOrganizations] = useState<OrgInfo[]>([]);
  const [collaboratorRole, setCollaboratorRole] = useState<'editor' | 'viewer'>(
    'editor',
  );
  const [collaboratorType, setCollaboratorType] = useState<'netid' | 'org'>(
    'netid',
  );

  const [activeTab, setActiveTab] = useState<'netid' | 'org'>(collaboratorType);

  function refreshOrganizations() {
    listOrgs('user').then((orgs) => setOrganizations(orgs));
  }

  useEffect(() => {
    props.people.sort((a, b) => {
      const permissionOrder = { owner: 0, editor: 1, viewer: 2 };
      return permissionOrder[a.permission] - permissionOrder[b.permission];
    });

    refreshOrganizations();
  }, []);

  function onRemoveCollaborator(entity: Entity) {
    props.onRemoveEntity(entity._id, entity.type, entity.permission);

    if (entity.permission === 'editor') {
      props.onRemoveEntity(entity._id, entity.type, 'viewer');
    }
  }

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
                onChange={(value: 'editor' | 'viewer') => {
                  setCollaboratorRole(value);
                }}
              >
                <Select.Option value="editor">Editor</Select.Option>
                <Select.Option value="viewer">Viewer</Select.Option>
              </Select>
              <Button
                icon={<PlusCircleFilled />}
                onClick={() => {
                  if (activeTab === 'netid') {
                    props.onAddEntity({
                      _id: form.getFieldValue(activeTab),
                      type: activeTab,
                      permission: collaboratorRole,
                    });
                  } else {
                    props.onAddEntity({
                      _id: form.getFieldValue('organization'),
                      type: activeTab,
                      permission: collaboratorRole,
                    });
                  }
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
              onChange={(value: 'netid' | 'org') => {
                setActiveTab(value);
              }}
            >
              <Tabs.TabPane tab="People" key="netid" />
              <Tabs.TabPane tab="Organizations" key="org" />
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

                return (
                  <>
                    <Col span={12}>{displayName}</Col>
                    <Col>
                      <Space>
                        <Select
                          style={{ width: 120 }}
                          defaultValue={entity.permission}
                          onChange={(value: 'editor' | 'viewer' | 'remove') => {
                            // Remove viweer if they're an editor
                            // Search "# SHARING_ACL_REFACTOR" for the following comment
                            if (
                              value === 'viewer' &&
                              entity.permission === 'editor'
                            ) {
                              props.onRemoveEntity(
                                entity._id,
                                entity.type,
                                entity.permission,
                              );

                              return;
                            }

                            // Remove if requested via dropdown
                            if (value === 'remove') {
                              onRemoveCollaborator(entity);
                              return;
                            }

                            props.onAddEntity({
                              _id: entity._id,
                              type: entity.type,
                              permission: value,
                            });
                          }}
                          options={[
                            {
                              label: 'Owner',
                              value: 'owner',
                              disabled: true,
                            },
                            {
                              label: 'Editor',
                              value: 'editor',
                              disabled: entity.permission === 'owner',
                            },
                            {
                              label: 'Viewer',
                              value: 'viewer',
                              disabled: entity.permission === 'owner',
                            },
                          ]}
                        />

                        <Popconfirm
                          title="Are you sure you want to remove this collaborator?"
                          onConfirm={() => {
                            onRemoveCollaborator(entity);
                          }}
                        >
                          <Tooltip title="Remove collaborator">
                            <Button type="text" icon={<CloseOutlined />} />
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
