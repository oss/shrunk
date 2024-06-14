/**
 * Implements the [[ManageOrg]] component
 * @packageDocumentation
 */

import React from 'react';
import {
  Row,
  Col,
  Button,
  Popconfirm,
  Spin,
  Dropdown,
  Form,
  Input,
  Checkbox,
  Tooltip,
  Menu,
  Modal,
  FormInstance,
  BackTop,
} from 'antd/lib';
import {
  ExclamationCircleFilled,
  PlusCircleFilled,
  CloseOutlined,
  UpOutlined,
  DownOutlined,
  MoreOutlined,
  ExclamationCircleOutlined,
  WarningFilled,
} from '@ant-design/icons';
import { IoReturnUpBack } from 'react-icons/io5';
import { Link, RouteComponentProps, withRouter } from 'react-router-dom';
import moment from 'moment';

import { MemberInfo, OrgInfo, getOrgInfo } from '../../api/Org';
import { OrgAdminTag } from './OrgCommon';
import '../../Base.less';
import './ManageOrg.less';
import { serverValidateNetId, serverValidateOrgName } from '../../Validators';

/**
 * Props for the [[ManageOrg]] component
 * @interface
 */
export type Props = RouteComponentProps<{ id: string }> & {
  /**
   * The user's NetID
   * @property
   */
  userNetid: string;

  /**
   * The user's privileges. Used to determine which operations the
   * user may perform on the org
   * @property
   */
  userPrivileges: Set<string>;
};

/**
 * State for the [[ManageOrg]] component
 * @interface
 */
interface State {
  /**
   * The [[OrgInfo]] of the org
   * @property
   */
  orgInfo: OrgInfo | null;

  /**
   * The number of org admins. Used to enforce the requirement that the last
   * admin of an org not be deleted
   * @property
   */
  adminsCount: number;

  /**
   * Whether the add member dropdown is visible
   * @property
   */
  addMemberFormVisible: boolean;

  /**
   * Whether the rename org modal is visible
   * @property
   */
  renameOrgModalVisible: boolean;
}

/**
 * The [[AddMemberForm]] component implements a dropdown form used to add a member to an org
 * @param props The props
 */
const AddMemberForm: React.FC<{
  isAdmin: boolean;
  onCreate: (netid: string, is_admin: boolean) => Promise<void>;
}> = (props) => {
  const onFinish = async (values: { netid: string; is_admin: boolean }) =>
    props.onCreate(values.netid, values.is_admin);
  return (
    <div className="dropdown-form">
      <Form layout="inline" initialValues={{ name: '' }} onFinish={onFinish}>
        <Input.Group compact>
          <Form.Item
            name="netid"
            rules={[
              { required: true, message: 'Please input a NetID.' },
              { validator: serverValidateNetId },
            ]}
          >
            <Input placeholder="NetID" />
          </Form.Item>

          {!props.isAdmin ? (
            <></>
          ) : (
            <Form.Item
              name="is_admin"
              valuePropName="checked"
              className="admin-checkbox"
            >
              <Checkbox defaultChecked={false}>Admin?</Checkbox>
            </Form.Item>
          )}

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<PlusCircleFilled />}
            />
          </Form.Item>
        </Input.Group>
      </Form>
    </div>
  );
};

/**
 * The [[MemberRow]] component displays the data pertaining to one member of an org
 * @param props The props
 */
const MemberRow: React.FC<{
  isAdmin: boolean;
  adminsCount: number;
  memberInfo: MemberInfo;
  onDelete: (netid: string) => Promise<void>;
  onChangeAdmin: (netid: string, admin: boolean) => Promise<void>;
}> = (props) => {
  const mayNotRemoveMember =
    props.memberInfo.is_admin && props.adminsCount === 1;
  return (
    <Row className="primary-row">
      <Col span={20}>
        <span className="user-title">{props.memberInfo.netid}</span>
        {props.memberInfo.is_admin ? (
          <OrgAdminTag title="This member is an administrator." />
        ) : (
          <></>
        )}
        <span>
          Added: {moment(props.memberInfo.timeCreated).format('MMM D, YYYY')}
        </span>
      </Col>

      <Col span={4} className="btn-col">
        {!props.isAdmin ? (
          <></>
        ) : props.memberInfo.is_admin ? (
          mayNotRemoveMember ? (
            <Tooltip
              placement="top"
              title="You may not remove the last administrator from an organization."
            >
              <Button disabled type="text" icon={<DownOutlined />} />
            </Tooltip>
          ) : (
            <Tooltip
              placement="top"
              title="Remove administrator privileges from this member."
            >
              <Button
                type="text"
                icon={<DownOutlined />}
                onClick={async () =>
                  props.onChangeAdmin(props.memberInfo.netid, false)
                }
              />
            </Tooltip>
          )
        ) : (
          <Tooltip placement="top" title="Make this member an administrator.">
            <Button
              type="text"
              icon={<UpOutlined />}
              onClick={async () =>
                props.onChangeAdmin(props.memberInfo.netid, true)
              }
            />
          </Tooltip>
        )}

        {!props.isAdmin ? (
          <></>
        ) : mayNotRemoveMember ? (
          <Tooltip
            placement="top"
            title="You may not remove the last administrator from an organization."
          >
            <Button danger disabled type="text" icon={<CloseOutlined />} />
          </Tooltip>
        ) : (
          <Popconfirm
            placement="top"
            title="Are you sure you want to remove this member?"
            onConfirm={async () => props.onDelete(props.memberInfo.netid)}
            icon={<ExclamationCircleFilled style={{ color: 'red' }} />}
          >
            <Button danger type="text" icon={<CloseOutlined />} />
          </Popconfirm>
        )}
      </Col>
    </Row>
  );
};

/**
 * The [[ManageOrgInner]] component implements the manage org view. It is wrapped
 * with `withRouter` to provide the [[ManageOrg]] component.
 * @class
 */
class ManageOrgInner extends React.Component<Props, State> {
  private formRef: React.RefObject<FormInstance<any>>;
  constructor(props: Props) {
    super(props);
    this.state = {
      orgInfo: null,
      adminsCount: 0,
      addMemberFormVisible: false,
      renameOrgModalVisible: false,
    };

    this.formRef = React.createRef();
  }

  async componentDidMount(): Promise<void> {
    await this.refreshOrgInfo();
  }

  async componentDidUpdate(prevProps: Props): Promise<void> {
    if (this.props !== prevProps) {
      await this.refreshOrgInfo();
    }
  }

  /**
   * Query the server for information about the current org and then update state
   * @method
   */
  refreshOrgInfo = async (): Promise<void> => {
    const orgInfo = await getOrgInfo(this.props.match.params.id);
    const adminsCount = orgInfo.members.filter(
      (member) => member.is_admin,
    ).length;
    this.setState({ orgInfo, adminsCount });
  };

  /**
   * Execute API requests to add a user to the org, then refresh org info
   * @method
   * @param netid The NetID of the user to add
   * @param is_admin Whether the newly added user should be an org admin
   */
  onAddMember = async (netid: string, is_admin: boolean): Promise<void> => {
    await fetch(`/api/v1/org/${this.props.match.params.id}/member/${netid}`, {
      method: 'PUT',
    });
    if (is_admin) {
      await fetch(`/api/v1/org/${this.props.match.params.id}/member/${netid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_admin: true }),
      });
    }
    this.setState({ addMemberFormVisible: false });
    await this.refreshOrgInfo();
  };

  /**
   * Execute API requests to remove a user from the org, then refresh org info
   * @method
   * @param netid The NetID of the user to remove
   */
  onDeleteMember = async (netid: string): Promise<void> => {
    await fetch(`/api/v1/org/${this.props.match.params.id}/member/${netid}`, {
      method: 'DELETE',
    });
    await this.refreshOrgInfo();
  };

  /**
   * Execute API requests to grant or revoke org admin permissions from a user
   * @method
   * @param netid The NetID of the user on which to operate
   * @param admin Whether the user is an org admin
   */
  onChangeAdmin = async (netid: string, admin: boolean): Promise<void> => {
    await fetch(`/api/v1/org/${this.props.match.params.id}/member/${netid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_admin: admin }),
    });
    await this.refreshOrgInfo();
  };

  /**
   * Execute API request that renames the organization name.
   * @method
   * @param newName the new name that the organization will take on
   */
  onRenameOrg = async (newName: string): Promise<void> => {
    await fetch(`/api/v1/org/${this.props.match.params.id}/rename/${newName}`, {
      method: 'PUT',
    });
    this.props.history.push('/orgs');
    await this.refreshOrgInfo();
  };

  /**
   * Execute API requests to remove the current user from the org, then navigate
   * to the `/orgs` page
   * @method
   */
  leaveOrg = async (): Promise<void> => {
    await fetch(
      `/api/v1/org/${this.props.match.params.id}/member/${this.props.userNetid}`,
      { method: 'DELETE' },
    );
    this.props.history.push('/orgs');
  };

  /**
   * Execute API requests to delete the org, then navigate to the `/orgs` page
   * @method
   */
  deleteOrg = async (): Promise<void> => {
    await fetch(`/api/v1/org/${this.props.match.params.id}`, {
      method: 'DELETE',
    });
    this.props.history.push('/orgs');
  };

  render(): React.ReactNode {
    if (this.state.orgInfo === null) {
      return <Spin size="large" />;
    }

    const isAdmin =
      this.state.orgInfo.is_admin || this.props.userPrivileges.has('admin');
    const userMayNotLeave =
      this.state.orgInfo.is_admin && this.state.adminsCount === 1;

    const renameModal = {
      handleOk: async () => {
        if (this.formRef.current) {
          this.formRef.current
            .validateFields()
            .then(async (values) => {
              console.log(this);
              this.onRenameOrg(values['newName']);

              if (this.formRef.current) this.formRef.current.resetFields();

              this.setState({
                renameOrgModalVisible: false,
              });
            })
            .catch(() =>
              console.log('Input value for renaming encountered an error'),
            );
        }
      },

      handleCancel: () => {
        if (this.formRef.current) this.formRef.current.resetFields();
        this.setState({
          renameOrgModalVisible: false,
        });
      },

      setVisible: (visible: boolean) => {
        this.setState({
          renameOrgModalVisible: visible,
        });
      },
    };

    const orgOptions = (
      <Menu>
        {!isAdmin ? (
          <></>
        ) : (
          <Menu.Item
            onClick={() =>
              renameModal.setVisible(!this.state.renameOrgModalVisible)
            }
          >
            Rename
          </Menu.Item>
        )}
        <Menu.Item>
          <Link to={`/orgs/${this.props.match.params.id}/stats`}>
            Statistics
          </Link>
        </Menu.Item>
        <Menu.Divider />

        {!this.state.orgInfo.is_member ? (
          <></>
        ) : userMayNotLeave ? (
          <Menu.Item disabled>
            <Tooltip
              placement="left"
              title="You may not remove the last administrator from an organization"
            >
              Leave
            </Tooltip>
          </Menu.Item>
        ) : (
          <Menu.Item
            danger
            onClick={() => {
              Modal.confirm({
                title: 'Do you want to leave this organization?',
                icon: <ExclamationCircleOutlined />,
                content:
                  'By pressing Yes, you will no longer be a member of this organization.',
                okText: 'Yes',
                onOk: this.leaveOrg,
              });
            }}
          >
            Leave
          </Menu.Item>
        )}

        {!isAdmin ? (
          <></>
        ) : (
          <Menu.Item
            danger
            onClick={() => {
              Modal.confirm({
                title: 'Do you want to delete this organization?',
                icon: <ExclamationCircleOutlined />,
                content:
                  'By pressing Yes, you will delete this organization and all of the content within it will be gone. This includes member list and links.',
                okText: 'Yes',
                /**
                 * The act of deleting an organization has two warning pop ups. That is why
                 * there is a nested Modal confirm.
                 */
                onOk: () => {
                  Modal.confirm({
                    title: 'Are you absolutely sure?',
                    okText: 'Yes',
                    icon: <WarningFilled />,
                    content:
                      'This is your last warning. If you press Yes, you will delete this organization.',
                    onOk: this.deleteOrg,
                  });
                },
              });
            }}
          >
            Delete
          </Menu.Item>
        )}
      </Menu>
    );

    return (
      <>
        <Modal
          visible={this.state.renameOrgModalVisible}
          onOk={renameModal.handleOk}
          onCancel={renameModal.handleCancel}
          title="Rename Organization"
        >
          <Form ref={this.formRef}>
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
                {
                  validator: serverValidateOrgName,
                },
              ]}
            >
              <Input placeholder="Name" />
            </Form.Item>
          </Form>
        </Modal>
        <BackTop />
        <Row className="primary-row">
          <Col span={12}>
            <Button
              type="text"
              href="/app/#/orgs"
              icon={<IoReturnUpBack />}
              size="large"
            />
            {this.state.orgInfo === null ? (
              <Spin size="small" />
            ) : (
              <span className="page-title">
                Manage organization <em>{this.state.orgInfo.name}</em>
              </span>
            )}
          </Col>

          <Col span={12} className="btn-col">
            {!isAdmin ? (
              <></>
            ) : (
              <Dropdown
                overlay={
                  <AddMemberForm
                    isAdmin={isAdmin}
                    onCreate={this.onAddMember}
                  />
                }
                visible={this.state.addMemberFormVisible}
                onVisibleChange={(flag) =>
                  this.setState({ addMemberFormVisible: flag })
                }
                trigger={['click']}
              >
                <Button type="primary">
                  <PlusCircleFilled /> Add a Member
                </Button>
              </Dropdown>
            )}
            <Dropdown overlay={orgOptions}>
              <Button>
                <MoreOutlined />
              </Button>
            </Dropdown>
          </Col>
        </Row>

        {this.state.orgInfo.members.map((member) => (
          <MemberRow
            key={member.netid}
            isAdmin={isAdmin}
            adminsCount={this.state.adminsCount}
            memberInfo={member}
            onDelete={this.onDeleteMember}
            onChangeAdmin={this.onChangeAdmin}
          />
        ))}
      </>
    );
  }
}

/**
 * The [[ManageOrg]] component is just the [[ManageOrgInner]] component
 * wrapped with `withRouter`
 */
export const ManageOrg = withRouter(ManageOrgInner);
