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
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';

import { FormInstance } from 'antd/lib/form';
import { PlusCircleFilled, ExclamationCircleFilled } from '@ant-design/icons';

import { ColumnsType } from 'antd/es/table';
import { RiDeleteBin6Line } from 'react-icons/ri';
import { OrgInfo, listOrgs } from '../api/Org';
import { serverValidateNetId } from '../Validators';
import { LinkInfo } from './LinkInfo';

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
   * The original [[LinkInfo]] of the link to edit
   * @property
   */
  linkInfo: LinkInfo | null;

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
      title: 'Shared With',
      dataIndex: 'name',
      width: 200,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      render: (type: string) => (
        <>
          <Tag color={type === 'org' ? '#cc0033' : 'red'}>{type}</Tag>
        </>
      ),
      width: 100,
    },
    {
      title: 'Permission',
      dataIndex: 'permission',
      render: (permission: string) => (
        <>
          <Tag color={permission === 'editor' ? '#cc0033' : 'red'}>
            {permission}
          </Tag>
        </>
      ),
      width: 100,
    },
    {
      title: 'Remove',
      align: 'center',
      render: (record: any) => (
        <>
          <Popconfirm
            placement="topRight"
            title={
              record.type === 'netid'
                ? `Are you sure you want to remove ${record._id} (${record.permission})?`
                : `Are you sure you want to remove this org (${record.permission})?`
            }
            onConfirm={() =>
              this.props.onRemoveEntity(
                record._id,
                record.type,
                record.permission,
              )
            }
            icon={<ExclamationCircleFilled style={{ color: 'red' }} />}
          >
            <Button
              type="text"
              shape="circle"
              danger
              icon={<RiDeleteBin6Line size="1.1em" />}
            />
          </Popconfirm>
        </>
      ),
    },
  ];

  constructor(props: Props) {
    super(props);
    this.state = {
      addNetIDOrOrg: 'netid',
      showAll: false,
      orgs: [],
    };
  }

  async componentDidMount(): Promise<void> {
    await this.refreshOrgs();
  }

  /**
   * Execute API requests to get list of org info, then update state
   * @method
   */
  refreshOrgs = async (): Promise<void> => {
    await listOrgs(this.state.showAll ? 'all' : 'user').then((orgs) =>
      this.setState({ orgs }),
    );
  };

  render(): React.ReactNode {
    return (
      <Modal
        visible={this.props.visible}
        title={
          this.props.linkInfo === null
            ? 'Share link'
            : `Share link: ${this.props.linkInfo.title}`
        }
        okText="Done"
        okType="ghost"
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
        <Form
          ref={this.formRef}
          onFinish={(e) => {
            this.props.onAddEntity(e);
            this.formRef.current!.resetFields();
          }}
        >
          <Row>
            <Space>
              <Col span={25}>
                <Form.Item
                  name="typeOfAdd"
                  initialValue={this.state.addNetIDOrOrg}
                >
                  <Select
                    onSelect={(value, e) =>
                      this.setState({ addNetIDOrOrg: e.value })
                    }
                  >
                    <Select.Option value="netid">NetID</Select.Option>
                    <Select.Option value="org">Org</Select.Option>
                  </Select>
                </Form.Item>
              </Col>

              <Col span={25}>
                {this.state.addNetIDOrOrg === 'netid' ? (
                  <Form.Item
                    name="netid"
                    rules={[
                      {
                        required: true,
                        message: 'Please enter a valid NetID.',
                      },
                      { validator: serverValidateNetId }, // have a select row search
                    ]}
                  >
                    <Input placeholder="NetID" />
                  </Form.Item>
                ) : (
                  <Form.Item
                    name="organization"
                    rules={[
                      {
                        required: true,
                        message: 'Please select an organization.',
                      },
                    ]}
                  >
                    <Select placeholder="Organization" allowClear>
                      {this.state.orgs.map((org) => (
                        <Select.Option key={org.id} value={org.id}>
                          {org.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                )}
              </Col>

              <Col span={25}>
                <Form.Item name="permission" initialValue="viewers">
                  <Select>
                    <Select.Option value="viewers">Viewer</Select.Option>
                    <Select.Option value="editors">Editor</Select.Option>
                  </Select>
                </Form.Item>
              </Col>

              <Col span={5}>
                <Form.Item>
                  <Button type="primary" htmlType="submit">
                    <PlusCircleFilled />
                    Share
                  </Button>
                </Form.Item>
              </Col>
            </Space>
          </Row>
        </Form>
        <Table
          columns={this.tableColumns}
          dataSource={this.props.people}
          scroll={{ x: 300 }}
          rowKey="_id"
          locale={{ emptyText: 'This link is not shared with anyone.' }}
          pagination={{
            total: this.props.people.length > 0 ? this.props.people.length : 1, // always shows pagination
            hideOnSinglePage: true,
            pageSize: 5,
          }}
          loading={this.props.isLoading}
        />
      </Modal>
    );
  }
}
