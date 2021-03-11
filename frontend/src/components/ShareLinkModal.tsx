/**
 * Implements the [[ShareLinkModal]] component
 * @packageDocumentation
 */

import React from 'react';
import { Modal, Form, Input, Button, Radio, Space, Table, Tag } from 'antd';
import { FormInstance } from 'antd/lib/form';
import {
  LinkOutlined,
  PlusOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';

import { LinkInfo } from './LinkInfo';
import { serverValidateLongUrl, serverValidateNetId } from '../Validators';

/**
 * The final values of the edit link form
 * @interface
 */
export interface EditLinkFormValues {
  /**
   * The new aliases
   * @property
   */
  aliases: { alias: string; description: string }[];
}

export interface SharingTable {
  data: [{ _id: String; type: String; permission: String }];
  // readonly columns: [{ _id: String; type: String; permission: String }];
}

/**
 * Props of the [[ShareLinkModal]] component
 * @interface
 */
export interface Props {
  /**
   * Whether the modal is visible
   * @property
   */
  visible: boolean;

  /**
   * The user's privileges, used to determine whether the user
   * may create custom aliases
   * @property
   */
  userPrivileges: Set<string>;

  /**
   * List of people/organizations who can edit the link
   * @property
   */
  editors: [{ _id: String; type: String }] | null;

  /**
   * List of people/organizations who can view the link
   * @property
   */
  viewers: [{ _id: String; type: String }] | null;

  /**
   * Callback that will be called when the user clicks the "ok" button
   * @property
   */
  onOk: (values: EditLinkFormValues) => void;

  /**
   * Callback that will be called when the user closes the modal without
   * saving their changes
   * @property
   */
  onCancel: () => void;
}

/**
 * State of the [[ShareLinkModal]] component
 * @interface
 */
export interface State {
  /**
   * Equals "netid" when user is adding a netid, "org" when user is adding an org
   * @property
   */
  addNetIDOrOrg: String;

  /**
   * True when Modal is fetching data.
   * @property
   */
  isLoading: boolean;
}

/**
 * The [[ShareLinkModal]] component allows the user to edit the netIDs and organizations a link is shared with. The user may
 *   * Add or remove NetIDs to be editors/viewers
 *   * Add or remove Organizations to be editors/viewers
 * @param props The props
 */
export class ShareLinkModal extends React.Component<Props, State> {
  formRef = React.createRef<FormInstance>();

  tableColumns = [
    {
      title: 'NetID/Org',
      dataIndex: '_id',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      render: (type: String) => (
        <>
          <Tag color={type == 'netid' ? 'red' : 'yellow'}>{type}</Tag>
        </>
      ),
    },
    {
      title: 'Permission',
      dataIndex: 'permission',
      render: (permission: String) => (
        <>
          <Tag color={permission == 'editor' ? 'red' : 'yellow'}>
            {permission}
          </Tag>
        </>
      ),
    },
    {
      title: 'Remove',
      render: () => (
        <>
          <Button>
            <MinusCircleOutlined />
          </Button>
        </>
      ),
    },
  ];

  constructor(props: Props) {
    super(props);
    this.state = {
      addNetIDOrOrg: 'netid',
      isLoading: false,
    };
  }

  // convertSharingData = (editors: String[], viewers: String[]) => {

  // }

  render(): React.ReactNode {
    return (
      <Modal
        destroyOnClose
        visible={this.props.visible}
        title="Share link"
        onOk={() => {
          this.formRef.current!.validateFields().then((values) => {
            this.formRef.current!.resetFields(); // CALL /api/v1/link/<id>/acl modify_acl function
            // this.props.onOk(values as EditLinkFormValues);
          });
        }}
        onCancel={() => {
          this.formRef.current!.resetFields();
          this.props.onCancel();
        }}
      >
        <Table columns={this.tableColumns} />
        <Form
          ref={this.formRef}
          layout={'vertical'}
          // initialValues={initialValues}
        >
          <Space>
            Add
            <Radio.Group
              onChange={(e) => this.setState({ addNetIDOrOrg: e.target.value })}
              defaultValue="netid"
              buttonStyle="solid"
            >
              <Radio.Button value="netid">NetID</Radio.Button>
              <Radio.Button value="org">Organization</Radio.Button>
            </Radio.Group>
            :
          </Space>
          {this.state.addNetIDOrOrg == 'netid' ? (
            <Form.Item
              // label="NetID"
              name="netid"
              rules={[{ validator: serverValidateNetId }]}
            >
              <Input placeholder="NetID" />
            </Form.Item>
          ) : (
            <></>
          )}
        </Form>
      </Modal>
    );
  }
}
