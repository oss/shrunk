/**
 * Implements the orgs list view
 * @packageDocumentation
 */

import React from 'react';
import {
  Row,
  Col,
  Checkbox,
  Popconfirm,
  Button,
  Dropdown,
  Form,
  Input,
  Tooltip,
  Spin,
  BackTop,
} from 'antd';
import { ExclamationCircleFilled, PlusCircleFilled } from '@ant-design/icons';
import { RiLineChartFill, RiToolsFill, RiDeleteBin6Line } from 'react-icons/ri';
import moment from 'moment';

import { OrgInfo, listOrgs, createOrg, deleteOrg } from '../api/Org';
import { OrgAdminTag, OrgMemberTag } from './subpages/OrgCommon';

import '../Base.less';

import { serverValidateOrgName } from '../Validators';

/**
 * Props for the [[Orgs]] component
 * @interface
 */
export interface Props {
  /**
   * The user's privileges
   * @property
   */
  userPrivileges: Set<string>;
}

/**
 * State for the [[Orgs]] component
 * @interface
 */
interface State {
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
  orgs: OrgInfo[] | null;

  /**
   * Whether the create org dropdown is visible
   * @property
   */
  createOrgFormVisible: boolean;
}

/**
 * The [[CreateOrgForm]] component provides a dropdown form to create a new org
 * @param props The props
 */
const CreateOrgForm: React.FC<{ onCreate: (name: string) => Promise<void> }> = (
  props,
) => {

  const onFinish = async (values: { name: string }) =>
    props.onCreate(values.name);
  return (
    <div className="dropdown-form">
      <Form initialValues={{ name: '' }} onFinish={onFinish}>
        <Input.Group compact>
          <Form.Item
            name="name"
            rules={[
              { required: true, message: 'Please input a name.' },
              {
                pattern: /^[a-zA-Z0-9_.,-]*$/,
                message:
                  'Name must consist of letters, numbers, and the characters "_.,-".',
              },
              {
                max: 60,
                message:
                  'Org names can be at most 60 characters long',
              },
              { validator: serverValidateOrgName },
            ]}
          >
            <Input placeholder="Name" />
          </Form.Item>

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
 * The [[OrgRow]] component displays information pertaining to one org
 * @param props The props
 */
const OrgRow: React.FC<{
  showAll: boolean;
  orgInfo: OrgInfo;
  onDelete: (id: string) => Promise<void>;
}> = (props) => (
  <Row className="primary-row">
    <Col span={20}>
      <a className="title" href={`/app/#/orgs/${props.orgInfo.id}/manage`}>
        {props.orgInfo.name}
      </a>
      {props.orgInfo.is_admin ? (
        <OrgAdminTag title="You are an administrator of this organization." />
      ) : (
        <></>
      )}
      {props.showAll && props.orgInfo.is_member ? <OrgMemberTag /> : <></>}
      <span>
        Created: {moment(props.orgInfo.timeCreated).format('MMM D, YYYY')}
      </span>
    </Col>
    <Col span={4} className="btn-col">
      <Tooltip title="Manage org">
        <Button
          type="text"
          href={`/app/#/orgs/${props.orgInfo.id}/manage`}
          icon={<RiToolsFill size="1.1em" />}
        />
      </Tooltip>
      <Tooltip title="Org stats">
        <Button
          type="text"
          icon={<RiLineChartFill size="1.1em" />}
          href={`/app/#/orgs/${props.orgInfo.id}/stats`}
        />
      </Tooltip>
      {!props.orgInfo.is_admin ? (
        <></>
      ) : (
        <Tooltip title="Delete org">
          <Popconfirm
            placement="top"
            title="Are you sure you want to delete this organization?"
            onConfirm={async () => props.onDelete(props.orgInfo.id)}
            icon={<ExclamationCircleFilled style={{ color: 'red' }} />}
          >
            <Button
              danger
              type="text"
              icon={<RiDeleteBin6Line size="1.1em" />}
            />
          </Popconfirm>
        </Tooltip>
      )}
    </Col>
  </Row>
);

/**
 * The [[Orgs]] component implements the orgs list view
 * @class
 */
export class Orgs extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      showAll: false,
      orgs: null,
      createOrgFormVisible: false,
    };
  }

  async componentDidMount(): Promise<void> {
    await this.refreshOrgs();
  }

  async componentDidUpdate(_prevProps: Props, prevState: State): Promise<void> {
    if (prevState.showAll !== this.state.showAll) {
      await this.refreshOrgs();
    }
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

  /**
   * Execute API requests to create a new org, then refresh org info
   * @method
   * @param name The name of the org to be created
   */
  onCreateOrg = async (name: string): Promise<void> => {
    await createOrg(name);
    this.setState({ createOrgFormVisible: false });
    await this.refreshOrgs();
  };

  /**
   * Execute API requests to delete an org, then refresh org info
   * @method
   * @param id The ID of the org to delete
   */
  onDeleteOrg = async (id: string): Promise<void> => {
    await deleteOrg(id);
    await this.refreshOrgs();
  };

  render(): React.ReactNode {
    const mayCreateOrg =
      this.props.userPrivileges.has('admin') ||
      this.props.userPrivileges.has('facstaff');
    const isAdmin = this.props.userPrivileges.has('admin');
    return (
      <>
        <BackTop />
        <Row className="primary-row">
          <Col span={16}>
            <span className="page-title">Orgs</span>
          </Col>

          <Col span={8} className="btn-col">
            {!mayCreateOrg ? (
              <></>
            ) : (
              <Dropdown
                overlay={<CreateOrgForm onCreate={this.onCreateOrg} />}
                visible={this.state.createOrgFormVisible}
                onVisibleChange={(flag) =>
                  this.setState({ createOrgFormVisible: flag })
                }
                placement="bottomRight"
                trigger={['click']}
              >
                <Button type="primary">
                  <PlusCircleFilled /> Create an Org
                </Button>
              </Dropdown>
            )}

            {!isAdmin ? (
              <></>
            ) : (
              <Checkbox
                style={{ paddingTop: '6px' }}
                defaultChecked={false}
                onChange={(ev) => this.setState({ showAll: ev.target.checked })}
              >
                Show all orgs?
              </Checkbox>
            )}
          </Col>
        </Row>

        {this.state.orgs === null ? (
          <Spin size="large" />
        ) : (
          <div>
            {this.state.orgs.length === 0 ? (
              <p>You are currently not in any organizations.</p>
            ) : (
              <div>
                {this.state.orgs.map((org) => (
                  <OrgRow
                    key={org.id}
                    showAll={this.state.showAll}
                    orgInfo={org}
                    onDelete={this.onDeleteOrg}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </>
    );
  }
}
