/**
 * Implements the [[PendingRequests]] component
 * @packageDocumentation
 */

import React from 'react';
import { Row, Col, Spin, Button, Popconfirm, Form, Input, BackTop } from 'antd/lib';
import { ExclamationCircleFilled } from '@ant-design/icons';
import { IoReturnUpBack } from 'react-icons/io5';
import base32 from 'hi-base32';
import moment from 'moment';
import { get } from 'js-cookie';

// ADD ROLE TEXT (make it general)

/**
 * Props for the [[PendingRequests]] component
 * @interface
 */
export interface Props {
    /**
     * The user's privileges, used to determine whether the user is allowed
     * to grant or deny the pending request
     * @property
     */
    userPrivileges: Set<string>;
    /**
     * The role being requested
     * @property
     */
    role: string;
}

/**
 * Request information as fetched from the backend
 * @interface
 */
export interface RequestInfo {
    /**
     * The user who made the request
     * @property
     */
    entity: string;

    /**
     * The title of the user that made the request
     */
    title: string;

    /**
     * The comment, or `null` if not present
     * @property
     */
    comment: string | null;

    /**
     * The time the request was made
     * @property
     */
    time_requested: Date | null;
}

/**
 * The [[RequestRow]] component displays one row in the listing of requests.
 * It provides a delete button which removes the entity from the role
 * @function
 * @param props Props
 */
const RequestRow: React.FC<{
    info: RequestInfo;
    onGrant: (entity: string, comment: string) => Promise<void>;
    onDeny: (entity: string) => Promise<void>;
}> = (props) => (
    <Row className="primary-row">
        <Col span={20}>
            <Row>
                <Col span={24}>
                    <span className="name">{props.info.entity}</span>
                </Col>
            </Row>
            <Row>
                <Col span={24}>
                    <span>
                        <em>Comment:</em>&nbsp;{props.info.comment}
                    </span>
                </Col>
            </Row>
            <Row>
                <Col span={24}>
                    <span>
                        <em>Date requested:</em>&nbsp;
                        {moment(props.info.time_requested).format('MMM D, YYYY')}
                    </span>
                </Col>
            </Row>
        </Col>
        <Col span={4} className="btn-col">
            {
                /* Potentially modify this to open a modal to modify the comment as needed. 
                   Would need to create a PowerUserRequestModal component */
            }
            <Popconfirm
                placement="top"
                title="Are you sure?"
                onConfirm={() => props.onGrant(props.info.entity, "dummy text")}
                icon={<ExclamationCircleFilled style={{ color: 'red' }} />}
            >
                <Button type="primary">Grant</Button>
            </Popconfirm>
            <Popconfirm
                placement="top"
                title="Are you sure?"
                onConfirm={() => props.onDeny(props.info.entity)}
                icon={<ExclamationCircleFilled style={{ color: 'red' }} />}
            >
                <Button danger>Deny</Button>
            </Popconfirm>
        </Col>
    </Row>
);

/**
 * State for the [[PendingRequests]] component
 * @interface
 */
interface State {
  /**
   * Whether the user has permission to view these requests. If `false`, an error message
   * is displayed
   * @property
   */
  hasPermission: boolean;

  /**
   * The power user requests, or `null` if not yet fetched
   * @property
   */
  requests: RequestInfo[] | null;
}

/**
 * The [[Role]] component allows the user to view, add, and delete entities with
 * a particular role
 * @class
 */
export class Role extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasPermission: true,
      requests: null,
    };
  }

  async componentDidMount(): Promise<void> {
    this.updateHasPermission();
    await this.updateRequestInfo();
  }

  async componentDidUpdate(prevProps: Props): Promise<void> {
    if (prevProps !== this.props) {
      this.updateHasPermission();
      await this.updateRequestInfo();
    }
  }

  /**
   * Determine whether the user has permission to view/edit the given
   * role based on the role name and the user's permissions
   * @method
   */
  updateHasPermission = (): void => {
    let hasPermission = false;
    if (this.props.userPrivileges.has('admin')) {
      hasPermission = true;
    }
    this.setState({ hasPermission });
  };

  /**
   * Fetch the request entities from the backend
   * @method
   */
  updateRequestInfo = async (): Promise<void> => {
    const updateEntities = this.updateRequests();
    await Promise.all([updateEntities]);
  };


  /**
   * Fetch the role entities from the backend
   * @method
   */
  updateRequests = async (): Promise<void> => {
    const sampleRequests: RequestInfo[] = [
        {
            entity: "test1",
            title: "Student Worker",
            comment: "I am a student worker",
            time_requested: new Date()
        },
        {
            entity: "test2",
            title: "Student",
            comment: "I am a student",
            time_requested: new Date()
        },
        {
            entity: "test3",
            title: "Faculty/Staff",
            comment: "I am a faculty/staff member",
            time_requested: new Date()
        }
    ]
    this.setState({ requests: sampleRequests });
  };

  /**
   * Execute API requests to grant the role to a new entity
   * @method
   * @param entity The entity to which to grant the role
   * @param comment The comment
   */
  onGrant = async (entity: string, comment: string): Promise<void> => {
    console.log('Granting role to ' + entity)
    console.log('Comment: ' + comment)
  };

  /**
   * Execute API requests to revoke a role from an entity
   * @method
   * @param entity The entity from which to revoke the role
   */
  onDeny = async (entity: string): Promise<void> => {
    console.log('Denying role to ' + entity)
  };

  render(): React.ReactNode {
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

    return (
      <>
        <BackTop />
        <Row className="primary-row">
          <Col span={24}>
            <Button
              type="text"
              href="/app/#/admin"
              icon={<IoReturnUpBack />}
              size="large"
            />
            <span className="page-title">
              Pending Requests for {this.props.role}
            </span>
          </Col>
        </Row>

        {this.state.requests === null ? (
          <Spin size="large" />
        ) : (
          this.state.requests.map((request) => (
            <RequestRow
              key={request.entity}
              info={request}
              onGrant={this.onGrant}
              onDeny={this.onDeny}
            />
          ))
        )}
      </>
    );
  }
}
