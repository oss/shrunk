/**
 * Implement the [[PendingRoleRequests]] component to display the pending requests for a given role
 * @packageDocumentation
 */
import React, { Component } from 'react';
import { Row, Col, Button, FloatButton, Spin } from 'antd/lib';
import dayjs from 'dayjs';
import base32 from 'hi-base32';
import ProcessRoleRequestModal from '../../modals/ProcessRoleRequestModal';

/**
 * Data describing the request text for a role
 * @interface
 */
export interface RequestText {
  /**
   * The role being requested (displayed name)
   * @property
   */
  role: string;

  /**
   * The prompt for the request
   * @property
   */
  prompt: string;

  /**
   * The placeholder text for the comment input
   * @property
   */
  placeholder_text: string;

  /**
   * The text for the submit button
   * @property
   */
  submit_button: string;
}

/**
 * Data describing a pending role request
 * @interface
 */
interface RoleRequestInfo {
  /**
   * The entity making the request
   * @property
   */
  entity: string;

  /**
   * The title of the entity making the request
   */
  title: string;

  /**
   * The department of the entity making the request
   */
  department: string;

  /**
   * The employee types of the entity making the request
   */
  employeeTypes: string[];

  /**
   * The comment explaining the request
   * @property
   */
  comment: string;

  /**
   * The time at which the request was made
   * @property
   */
  time_requested: Date;
}

/**
 * Props for the [[PendingRoleRequestRow]] component
 * @interface
 */
interface PendingRoleRequestRowProps {
  /**
   * The role request information
   * @property
   */
  role_request: RoleRequestInfo;

  /**
   * Open the modal to approve the role request
   * @property
   */
  onOpenApproveModal: () => void;

  /**
   * Open the modal to deny the role request
   * @property
   */
  onOpenDenyModal: () => void;
}

/**
 * The [[PendingRoleRequestRow]] component displays a single pending role request
 * @param props - the props for the component
 */
const PendingRoleRequestRow: React.FC<PendingRoleRequestRowProps> = (props) => (
  <Row className="primary-row">
    <Col span={20}>
      <Row>
        <Col span={24}>
          <span className="title">{props.role_request.entity}</span>
        </Col>
      </Row>
      <Row>
        <Col span={24}>
          <span>
            <em>Title:</em>&nbsp;{props.role_request.title}
          </span>
        </Col>
      </Row>
      <Row>
        <Col span={24}>
          <span>
            <em>Department:</em>&nbsp;{props.role_request.department}
          </span>
        </Col>
      </Row>
      <Row>
        <Col span={24}>
          <span>
            <em>Employee Types:</em>&nbsp;
            {props.role_request.employeeTypes.join(', ')}
          </span>
        </Col>
      </Row>
      {props.role_request.comment === null ||
      props.role_request.comment === '' ? (
        <></>
      ) : (
        <Row>
          <Col span={24}>
            <span>
              <em>Comment:</em>&nbsp;{props.role_request.comment}
            </span>
          </Col>
        </Row>
      )}
      {props.role_request.time_requested === null ? (
        <></>
      ) : (
        <Row>
          <Col span={24}>
            <span>
              <em>Date Requested:</em>&nbsp;
              {dayjs(
                new Date(Number(props.role_request.time_requested) * 1000),
              ).format('MMM D, YYYY, h:mm a')}
            </span>
          </Col>
        </Row>
      )}
    </Col>
    <Col span={4} className="btn-col">
      <Button type="primary" onClick={props.onOpenApproveModal}>
        APPROVE
      </Button>
      <Button danger onClick={props.onOpenDenyModal}>
        DENY
      </Button>
    </Col>
  </Row>
);

/**
 * Props for the [[PendingRoleRequests]] component
 * @interface
 */
export interface Props {
  /**
   * The role name (The internal identifier, not the display name)
   * @property
   */
  name: string;

  /**
   * The user's privileges
   * @property
   */
  userPrivileges: Set<string>;
}

/**
 * State for the [[PendingRoleRequests]] component
 * @interface
 */
export interface State {
  /**
   * The list of pending requests for the role
   * @property
   */
  role_requests: RoleRequestInfo[];

  /**
   * Whether the modal is visible
   * @property
   */
  visible: boolean;

  /**
   * The display text for the role
   */
  requestText: RequestText | null;

  /**
   * The entity that is being processed
   * @property
   */
  selectedEntity: string;

  /**
   * Whether the process is to approve or deny the role request
   * @property
   */
  toApprove: boolean;

  /**
   * Whether the user has permission to view this role. If `false`, an error message
   * is displayed
   * @property
   */
  hasPermission: boolean;
}

/**
 * The [[PendingRoleRequests]] component is responsible for displaying a list of pending requests for a given role
 * @class
 */
export class PendingRoleRequests extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      role_requests: [],
      visible: false,
      requestText: null,
      selectedEntity: '',
      toApprove: false,
      hasPermission: true,
    };
  }

  async componentDidMount(): Promise<void> {
    await this.updatePendingRoleRequests();
    await this.updateRoleRequestText();
    this.updateHasPermission();
  }

  /**
   * Fetch the list of pending requests for the role from the server
   * @method
   */
  updatePendingRoleRequests = async (): Promise<void> => {
    const result = await fetch(`/api/v1/role_request/${this.props.name}`).then(
      (resp) => resp.json(),
    );

    const fullRequests = await Promise.all(
      result.requests.map(async (request: RoleRequestInfo) => {
        const positionInfo = await this.updateEntityPositionInfo(
          request.entity,
        );
        const mappedInfo = {
          title: positionInfo.title[0],
          department: positionInfo.rutgersEduStaffDepartment[0],
          employeeTypes: positionInfo.employeeType,
        };
        return { ...request, ...mappedInfo };
      }),
    );

    this.setState({ role_requests: fullRequests });
  };

  /**
   * Fetch the user position info from the server
   * @method
   */
  updateEntityPositionInfo = async (entity: string): Promise<any> => {
    // Default values
    const result = {
      title: ['Failed to query title'],
      rutgersEduStaffDepartment: ['Failed to query department'],
      employeeType: ['Failed to query employee type'],
    };

    try {
      const response = await fetch(`/api/v1/position/${base32.encode(entity)}`);
      if (!response.ok) {
        // Return the default values (failed to query)
        return result;
      }
      const intermediateResult = await response.json();
      if (!intermediateResult || Object.keys(intermediateResult).length === 0) {
        // Return the default values (empty response)
        return result;
      }
      (Object.keys(result) as (keyof typeof result)[]).forEach((key) => {
        if (intermediateResult[key]) {
          // Key exists in the response
          result[key] = intermediateResult[key];
        } else {
          // Key does not exist in the response
          result[key] = ['Field not found'];
        }
      });
      return result;
    } catch (error) {
      return result;
    }
  };

  /**
   * Fetch the request text for the role from the server
   * @method
   */
  updateRoleRequestText = async (): Promise<void> => {
    const result = await fetch(
      `/api/v1/role_request/${this.props.name}/request-text`,
    ).then((resp) => resp.json());
    this.setState({ requestText: result.text as RequestText });
  };

  /**
   * Determine whether the user has permission to view/edit the given
   * role based on the role name and the user's permissions
   * @method
   */
  updateHasPermission = (): void => {
    let hasPermission = false;

    if (
      this.props.name === 'whitelisted' &&
      this.props.userPrivileges.has('facstaff')
    ) {
      hasPermission = true;
    }

    if (this.props.userPrivileges.has('admin')) {
      hasPermission = true;
    }

    this.setState({ hasPermission });
  };

  /**
   * Open the modal to approve the role request
   * @method
   */
  onOpenApproveModal = (entity: string): void => {
    this.setState({ visible: true, selectedEntity: entity, toApprove: true });
  };

  /**
   * Open the modal to deny the role request
   * @method
   */
  onOpenDenyModal = (entity: string): void => {
    this.setState({ visible: true, selectedEntity: entity, toApprove: false });
  };

  /**
   * Close the modal exclusively
   * @method
   */
  closeModal = () => {
    this.setState({ visible: false });
  };

  render() {
    if (!this.state.hasPermission) {
      return (
        <Row className="primary-row">
          <Col span={24}>
            <span className="page-title">
              You do not have permission to edit this role.
            </span>
          </Col>
        </Row>
      );
    }

    if (this.state.requestText === null) {
      return <Spin size="large" />;
    }
    return (
      <div>
        <FloatButton.BackTop />
        <Row className="primary-row">
          <Col span={24}>
            <Button type="text" href="/app/#/admin" size="large" />
            <span className="page-title">
              Pending{' '}
              {this.state.requestText?.role.replace(/\b\w/g, (c) =>
                c.toUpperCase(),
              )}{' '}
              Role Requests
            </span>
          </Col>
        </Row>
        {this.state.role_requests.map((role_request) => (
          <PendingRoleRequestRow
            key={role_request.entity}
            role_request={role_request}
            onOpenApproveModal={() =>
              this.onOpenApproveModal(role_request.entity)
            }
            onOpenDenyModal={() => this.onOpenDenyModal(role_request.entity)}
          />
        ))}
        <ProcessRoleRequestModal
          visible={this.state.visible}
          entity={this.state.selectedEntity}
          toApprove={this.state.toApprove}
          name={this.props.name}
          roleName={this.state.requestText?.role}
          onClose={this.closeModal}
          updatePendingRoleRequests={this.updatePendingRoleRequests}
        />
      </div>
    );
  }
}
