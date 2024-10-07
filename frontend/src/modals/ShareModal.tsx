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

interface ISearchOrganizations {
  organizations: OrgInfo[];
  onInput(newCollaboratorId: string, collaboratorType: 'netid' | 'org'): void;
}

function SearchOrganizations(props: ISearchOrganizations) {
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
          props.onInput(value as string, 'org');
        }}
      >
        {props.organizations.map((org) => (
          <Select.Option key={org.id} value={org.id}>
            {org.name}
          </Select.Option>
        ))}
      </Select>
    </Form.Item>
  );
}

interface ISearchBody {
  organizations: OrgInfo[];
  onInput(newCollaboratorId: string, collaboratorType: 'netid' | 'org'): void;
  onAdd: void;
}

function SearchBody(props: ISearchBody) {
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
        {activeTab === 'people' ? (
          <SearchUsers />
        ) : (
          <SearchOrganizations
            organizations={props.organizations}
            onInput={props.onInput}
          />
        )}
        <Button onClick={props.onAdd} type="primary">
          Add
        </Button>
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

function OptionsBody() {
  return <></>;
}

export default function ShareModal(props: IShareModal) {
  const [form] = Form.useForm();

  const [organizations, setOrganizations] = useState<OrgInfo[]>([]);
  const [collaboratorId, setCollaboratorId] = useState<string>();
  const [stage, setStage] = useState<'search' | 'options'>('search');

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

  function onAdd() {
    setStage('options');
  }

  return (
    <Modal
      open={props.visible}
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
        {stage === 'search' ? (
          <SearchBody
            onAdd={onAdd}
            onInput={onInput}
            organizations={organizations}
          />
        ) : (
          <></>
        )}
        {stage === 'options' ? <OptionsBody /> : <></>}
      </Form>
    </Modal>
  );
}
