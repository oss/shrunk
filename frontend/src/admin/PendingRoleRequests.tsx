/**
 * Implement the [[PendingRoleRequests]] component to display the pending requests for a given role
 * @packageDocumentation
 */
import React, { Component } from 'react';
import { Row, Col, Button, BackTop, Spin } from 'antd/lib';
import moment from 'moment';
import { IoReturnUpBack } from 'react-icons/io5';
import base32 from 'hi-base32';
import { ProcessRoleRequestModal } from '../components/ProcessRoleRequestModal';
import { ConsoleSqlOutlined } from '@ant-design/icons';

/**
 * Data describing the request text for a role
 * @interface
 */
export interface RequestText {
    /**
     * The role being requested capitalized (displayed name)
     * @property
     */
    capitalized_role: string;

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
 * The [[PendingRoleRequestRow]] component displays one row in the pending role requests list
 * @function
 * @param props Props
 */
const PendingRoleRequestRow: React.FC<{
    role_request: RoleRequestInfo;
    onOpenApproveModal: () => void;
    onOpenDenyModal: () => void;
}> = (props) => {
    
    return (
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
                            <em>Employee Types:</em>&nbsp;{props.role_request.employeeTypes.join(", ")}
                        </span>
                    </Col>
                </Row>
                {props.role_request.comment === null || props.role_request.comment === '' ? (
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
                                {moment(props.role_request.time_requested).format('MMM D, YYYY')}
                            </span>
                        </Col>
                    </Row>
                )}
            </Col>
            <Col span={4} className="btn-col">
                <Button
                    type="primary"
                    onClick={props.onOpenApproveModal}
                >
                    APPROVE
                </Button>
                <Button
                    danger
                    onClick={props.onOpenDenyModal}
                >
                    DENY
                </Button>
            </Col>
        </Row>
    );
};

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

        const fullRequests = await Promise.all(result.requests.map(async (request: RoleRequestInfo) => {
            const positionInfo = await this.updateEntityPositionInfo(request.entity);
            const mappedInfo = {
                title: positionInfo.title[0],
                department: positionInfo.rutgersEduStaffDepartment[0],
                employeeTypes: positionInfo.employeeType,
            };
            return { ...request, ...mappedInfo };
        }));

        this.setState({ role_requests: fullRequests });
    }

    /**
     * Fetch the user position info from the server
     * @method
     */
    updateEntityPositionInfo = async (entity: string): Promise<any> => {
        const intermediate_result = await fetch(`/api/v1/role_request/position/${base32.encode(entity)}`).then(
            (resp) => resp.json(),
        );
        const attributes = ['title',  'rutgersEduStaffDepartment', 'employeeType'];
        const result: any = {};

        attributes.forEach(attribute => {
            if (!intermediate_result[attribute]) {
                result[attribute] = attribute === 'title' ? ['Cannot find title'] : attribute === 'employeeType' ? ['Cannot find employee types'] : ['Cannot find department'];
            } else if (intermediate_result[attribute].length === 0) {
                result[attribute] = ['N/A'];
            } else {
                result[attribute] = intermediate_result[attribute];
            }
        });
    
        return result;
    }

    /**
     * Fetch the request text for the role from the server
     * @method
     */
    updateRoleRequestText = async (): Promise<void> => {
        const result = await fetch(`/api/v1/role_request/${this.props.name}/request-text`).then(
            (resp) => resp.json(),
        );
        this.setState({ requestText: result.text as RequestText });
    }

    /**
   * Determine whether the user has permission to view/edit the given
   * role based on the role name and the user's permissions
   * @method
   */
    updateHasPermission = (): void => {
        let hasPermission = false;

        if (this.props.name === 'whitelisted' && this.props.userPrivileges.has('facstaff')) {
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
    }

    /**
     * Open the modal to deny the role request
     * @method
     */
    onOpenDenyModal = (entity: string): void => {
        this.setState({ visible: true, selectedEntity: entity, toApprove: false });
    }

    /**
     * Close the modal exclusively
     * @method
     */
    closeModal = () => {
        this.setState({ visible: false });
    }

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
                <BackTop />
                <Row className="primary-row">
                    <Col span={24}>
                        <Button
                            type="text"
                            href="/app/#/admin"
                            icon={<IoReturnUpBack />}
                            size="large"
                        />
                        <span className="page-title">Pending {this.state.requestText?.capitalized_role} Role Requests</span>
                    </Col>
                </Row>
                {this.state.role_requests.map((role_request) => (
                    <PendingRoleRequestRow
                        key={role_request.entity}
                        role_request={role_request}
                        onOpenApproveModal={() => this.onOpenApproveModal(role_request.entity)}
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