/**
 * Implement the [[PendingRoleRequests]] component to display the pending requests for a given role
 * @packageDocumentation
 */
import React, { Component } from 'react';
import { Row, Col, Button, BackTop} from 'antd/lib';
import moment from 'moment';
import { IoReturnUpBack } from 'react-icons/io5';

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
     * The title of the entity
     * @property
     */
    title: string;

    /**
     * The different employee types the entity has been
     * @property
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
    onGrant: (entity: string, grant_message : string) => Promise<void>;
    onDeny: (entity: string, deny_message: string) => Promise<void>;
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
                    onClick={async () => {
                        await props.onGrant(props.role_request.entity, "Placeholder grant message");
                    }}
                >
                    Grant
                </Button>
                <Button
                    danger
                    onClick={async () => {
                        await props.onDeny(props.role_request.entity, "Placeholder deny message");
                    }}
                >
                    Deny
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
     * True if the modal has been closed by the user
     * @property
     */
    hidden: boolean;
    /**
     * The display text for the role
     */
    requestText: RequestText | null;
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
            hidden: false,
            requestText: null
        };
    }

    async componentDidMount(): Promise<void> {
        await this.updatePendingRoleRequests();
        await this.updateRoleRequestText();
    }

    /**
     * Fetch the list of pending requests for the role from the server
     * @method
     */
    updatePendingRoleRequests = async (): Promise<void> => {
        /*const sampleRequests: RoleRequestInfo[] = [
            {
                entity: "Entity 1",
                title: "Title 1",
                employeeTypes: ["Employee Type 1", "Employee Type 2"],
                comment: "Comment 1",
                time_requested: new Date()
            },
            {
                entity: "Entity 2",
                title: "Title 2",
                employeeTypes: ["Employee Type 3", "Employee Type 4"],
                comment: "Comment 2",
                time_requested: new Date()
            },
            {
                entity: "Entity 3",
                title: "Title 3",
                employeeTypes: ["Employee Type 5", "Employee Type 6"],
                comment: "Comment 3",
                time_requested: new Date()
            },
            
        ];*/
        const sampleRequests: RoleRequestInfo[] = [];

        for (let i = 1; i <= 20; i++) {
            const entity = `Entity ${i}`;
            const title = `Title ${i}`;
            const employeeTypes = [`Employee Type ${i * 2 - 1}`, `Employee Type ${i * 2}`];
            const comment = `Comment ${i}`;
            const time_requested = new Date();

            const roleRequest: RoleRequestInfo = {
                entity,
                title,
                employeeTypes,
                comment,
                time_requested
            };

            sampleRequests.push(roleRequest);
        }


        this.setState({ role_requests: sampleRequests });
    }

    /**
     * Fetch the request text for the role from the server
     * @method
     */
    updateRoleRequestText = async (): Promise<void> => {
        const result = await fetch(`/api/v1/role/${this.props.name}/request-text`).then(
            (resp) => resp.json(),
          );
          this.setState({ requestText: result.text as RequestText });
    }

    onGrant = async (entity: string, grant_message: string): Promise<void> => {
        console.log(`Granting request for ${entity} with message ${grant_message}`);
    }

    onDeny = async (entity: string, deny_message: string): Promise<void> => {
        console.log(`Denying request for ${entity} with message ${deny_message}`);
    }

    render() {
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
                        onGrant={this.onGrant}
                        onDeny={this.onDeny}
                    />
                ))}
            </div>
        );
    }
}
