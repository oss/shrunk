/**
 * Implements the [[ShareLinkModal]] component
 * @packageDocumentation
 */

import React from 'react';
import {
  Col,
  Modal,
  Form,
  Input,
  Button,
  Radio,
  Row,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';

import { FormInstance } from 'antd/lib/form';
import { PlusCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';

import { OrgInfo, listOrgs } from '../api/Org';
import { serverValidateNetId } from '../Validators';
import { ColumnsType } from 'antd/es/table';

/**
 * The final values of the share link form
 * @type
 */
export type Entity = {
  /**
   * The id of the entity the link is shared with
   * @property
   */
  _id: string;
  /**
   * The name of the entity. For an organization, it would be the organization name. For a netid, it would be the netid.
   */
  name: string;
  /**
   * The type of entity the link is shared with (netid/org)
   * @property
   */
  type: string;
  /**
   * The permission of the entity the link is shared with (viewer/editor)
   * @property
   */
  permission: string;
};

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
   * List of netids/organizations who can edit the link
   * @property
   */
  people: Array<Entity>;

  /**
   * Whether the modal is waiting for a request to be fulfilled
   * @property
   */
  isLoading: boolean;

  /**
   * Callback that will be called when user shares link with an entity
   */
  onAddEntity: (values: Entity) => void;

  /**
   * Callback that will be called when user unshares link with an entity
   */
  onRemoveEntity: (_id: string, type: string, permission: string) => void;

  /**
   * Callback that will be called when the user clicks the "ok" button of the modal
   * @property
   */
  onOk: () => void;

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
  addNetIDOrOrg: string;

  /**
   * True when Modal is fetching data.
   * @property
   */
  isLoading: boolean;

  /**
   * Whether to show all orgs or just orgs of which the user is a member. Option only
   * available to admins
   * @property
   */
  showAll: boolean;

  /**
   * Contains an [[OrgInfo]] for each org to be displayed
   * @property
   */
  orgs: OrgInfo[];

  /**
   * The list of organizations for the editor/viewer dropdown
   * @property
   */
  options: { label: string; value: string }[];
}

/**
 * The [[ShareLinkModal]] component allows the user to edit the netIDs and organizations a link is shared with. The user may
 *   * Add or remove NetIDs to be editors/viewers
 *   * Add or remove Organizations to be editors/viewers
 * @param props The props
 */
export class ShareLinkModal extends React.Component<Props, State> {
  formRef = React.createRef<FormInstance>();

  tableColumns: ColumnsType<Entity> = [
    {
      title: 'NetID/Org',
      dataIndex: 'name',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      render: (type: string) => (
        <>
          <Tag color={type == 'org' ? '#cc0033' : 'red'}>{type}</Tag>
        </>
      ),
    },
    {
      title: 'Permission',
      dataIndex: 'permission',
      render: (permission: string) => (
        <>
          <Tag color={permission == 'editor' ? '#cc0033' : 'red'}>
            {permission}
          </Tag>
        </>
      ),
    },
    {
      title: 'Remove',
      align: 'center',
      render: (record: any) => (
        <>
          <Button
            type='text'
            shape='circle'
            icon={<MinusCircleOutlined />}
            onClick={() =>
              this.props.onRemoveEntity(
                record._id,
                record.type,
                record.permission
              )
            }
          />
          {/* {text} */}
          {/* {record.name} */}
          {/* {index} */}
        </>
      ),
    },
  ];

  constructor(props: Props) {
    super(props);
    this.state = {
      addNetIDOrOrg: 'netid',
      isLoading: false,
      showAll: false,
      orgs: [],
      options: [],
    };
  }

  async componentDidMount(): Promise<void> {
    await this.refreshOrgs();
    const options = this.state.orgs.map((org) => {
      return { label: org.name, value: org.id };
    });
    this.setState({ options: options });
  }

  /**
   * Execute API requests to get list of org info, then update state
   * @method
   */
  refreshOrgs = async (): Promise<void> => {
    await listOrgs(this.state.showAll ? 'all' : 'user').then((orgs) =>
      this.setState({ orgs })
    );
  };

  render(): React.ReactNode {
    return (
      <Modal
        visible={this.props.visible}
        title='Share link'
        okText='Done'
        okType='ghost'
        cancelButtonProps={{ style: { display: 'none' } }}
        onOk={() => {
          this.formRef.current!.resetFields();
          this.props.onOk();
        }}
        onCancel={() => {
          this.formRef.current!.resetFields();
          this.props.onCancel();
        }}
      >
        <Table
          columns={this.tableColumns}
          dataSource={this.props.people}
          rowKey='_id'
          locale={{ emptyText: 'This link is not shared with anyone.' }}
          pagination={{
            total: this.props.people.length > 0 ? this.props.people.length : 1, // always shows pagination
          }}
          loading={this.props.isLoading}
        />
        <Form
          ref={this.formRef}
          onFinish={(e) => {
            this.props.onAddEntity(e);
            this.formRef.current!.resetFields();
          }}
        >
          <Row gutter={[8, 15]}>
            <Col span={14}>
              <Space>
                Add
                <Radio.Group
                  onChange={(e) =>
                    this.setState({ addNetIDOrOrg: e.target.value })
                  }
                  defaultValue='netid'
                  buttonStyle='solid'
                >
                  <Radio.Button value='netid'>NetID</Radio.Button>
                  <Radio.Button value='org'>Organization</Radio.Button>
                </Radio.Group>
                :
                <Col flex='auto' />
              </Space>
            </Col>
          </Row>

          <Row>
            <Col span={12}>
              {this.state.addNetIDOrOrg == 'netid' ? (
                <Form.Item
                  name='netid'
                  rules={[
                    { required: true, message: 'Please enter a valid NetID.' },
                    { validator: serverValidateNetId },
                  ]}
                >
                  <Input placeholder='NetID' />
                </Form.Item>
              ) : (
                <Form.Item
                  name='organization'
                  rules={[
                    {
                      required: true,
                      message: 'Please select an organization.',
                    },
                  ]}
                >
                  <Select placeholder='Select an organization' allowClear>
                    {this.state.orgs.map((org, index) => (
                      <Select.Option value={org.id} key={index}>
                        {org.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              )}
            </Col>
            <Col span={6}>
              <Form.Item name='permission' initialValue='viewers'>
                <Select>
                  <Select.Option value='viewers'>Viewer</Select.Option>
                  <Select.Option value='editors'>Editor</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item>
                <Button type='primary' htmlType='submit'>
                  <PlusCircleOutlined />
                  Share
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    );
  }
}
