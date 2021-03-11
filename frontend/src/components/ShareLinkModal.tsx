/**
 * Implements the [[ShareLinkModal]] component
 * @packageDocumentation
 */

import React from 'react';
import { Modal, Form, Input, Button, Space, Table, Tag } from 'antd';
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
   * The original [[LinkInfo]] of the link to edit
   * @property
   */
  linkInfo: LinkInfo;

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
   * True when Modal is fetching data.
   * @property
   */
  isLoading: boolean;

  /**
   * The original [[LinkInfo]] of the link to edit
   * @property
   */
  linkInfo: LinkInfo;
}

/**
 * The [[ShareLinkModal]] component allows the user to edit the netIDs and organizations a link is shared with. The user may
 *   * Add or remove NetIDs to be editors/viewers
 *   * Add or remove Organizations to be editors/viewers
 * @param props The props
 */
export class ShareLinkModal extends React.Component<Props> {
  formRef = React.createRef<FormInstance>();

  constructor(props: Props) {
    super(props);
    this.state = {
      // {netid/org, type, privileges}
    };
  }

  componentDidMount() {
    const result = fetch(`/api/v1/link/${this.props.linkInfo.id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }).then((resp) => {
      resp.json();
      console.log(result);
    });
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
            this.formRef.current!.resetFields();
            // this.props.onOk(values as EditLinkFormValues);
          });
        }}
        onCancel={() => {
          this.formRef.current!.resetFields();
          this.props.onCancel();
        }}
      >
        <Form
          ref={this.formRef}
          layout={'vertical'}
          // initialValues={initialValues}
        >
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: 'Please input a title.' }]}
          >
            <Input placeholder="Title" />
          </Form.Item>

          <Form.Item
            label="Long URL"
            name="long_url"
            rules={[
              { required: true, message: 'Please input a URL.' },
              { type: 'url', message: 'Please enter a valid URL.' },
              { validator: serverValidateLongUrl },
            ]}
          >
            <Input
              placeholder="Long URL"
              prefix={<LinkOutlined className="site-from-item-icon" />}
            />
          </Form.Item>

          <Form.Item
            label="Owner"
            name="owner"
            rules={[{ validator: serverValidateNetId }]}
          >
            <Input placeholder="Link owner" />
          </Form.Item>
        </Form>
      </Modal>
    );
  }
}
