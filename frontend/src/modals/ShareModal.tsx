import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Tabs, Select, Button, Typography } from 'antd/lib';
import { LinkInfo } from '../components/LinkInfo';
import { PaperClipOutlined } from '@ant-design/icons';
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
  permission: 'viewer' | 'editor';
};

interface IShareModal {
  visible: boolean;
  userPrivilege: Set<string>;
  people: Array<Entity>;
  isLoading: boolean;
  linkInfo: LinkInfo | null;

  onAddEntity: (values: Entity) => void;
  onRemoveEntity: (_id: string, type: string, permission: string) => void;
  onOk: () => void;
  onCancel: () => void;
}

export default function ShareModal(props: IShareModal) {
  const [form] = Form.useForm();

  const [organizations, setOrganizations] = useState<OrgInfo[]>([]);
  const [collaboratorId, setCollaboratorId] = useState<string>();

  function refreshOrganizations() {
    listOrgs('user').then((orgs) => setOrganizations(orgs));
  }

  useEffect(() => {
    refreshOrganizations();
  }, []);

  function onInput(
    newCollaboratorId: string,
    collaboratorType: 'netid' | 'org',
  ) {
    setCollaboratorId(newCollaboratorId);
  }

  function SearchUsers() {
    return (
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
          onPressEnter={(e: any) => {
            onInput(e.target.value, 'netid');
          }}
        />
      </Form.Item>
    );
  }

  // FIX: When going to organizations tab then selecting an org, it brings you back to the people tab.
  function SearchOrganizations() {
    return (
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
          onChange={(value: any) => {
            onInput(value as string, 'org');
          }}
        >
          {organizations.map((org) => (
            <Select.Option key={org.id} value={org.id}>
              {org.name}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
    );
  }

  function SearchBody() {
    // State is inside an inner component to prevent redraw issues.
    const [activeTab, setActiveTab] = useState<string>('people');

    return (
      <>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          {activeTab === 'people' ? <SearchUsers /> : <SearchOrganizations />}
          <Button type="primary">Add</Button>
        </div>
        <Tabs
          activeKey={activeTab}
          onChange={(value) => {
            setActiveTab(value);
          }}
        >
          <Tabs.TabPane tab="People" key="people">
            <div style={{ textAlign: 'center' }}>
              <p>No person has access.</p>
            </div>
          </Tabs.TabPane>
          <Tabs.TabPane tab="Organizations" key="organizations">
            <div style={{ textAlign: 'center' }}>
              <p>No organization has access.</p>
            </div>
          </Tabs.TabPane>
        </Tabs>
      </>
    );
  }

  return (
    <Modal
      visible={props.visible}
      title="Manage access"
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
        <SearchBody />
      </Form>
    </Modal>
  );
}
