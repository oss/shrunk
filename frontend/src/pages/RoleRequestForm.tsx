/**
 * Implements the [[RoleRequestForm]] component
 * @packageDocumentation
 */

import React from 'react';
import { Row, Col, Button, Input, Form } from 'antd/lib';
import { CheckOutlined } from '@ant-design/icons';

/**
 * Props for the [[PowerUserRequestForm]] component
 * @interface
 */
export interface Props {
    /**
     * The user's privileges
     * @property
     */
    userPrivileges: Set<string>;
    /**
     * The NetID of the user
     * @property
     */
    netid: string;
    /**
     * The role to be requested (internal identifier, not the display name)
     * @property
     */
    name: string;
}

interface RequestText {
    title: string;
    text: string;
    summary: string;
}

/**
 * State for the [[RoleRequestForm]] component
 * @interface
 */
export interface State {
    /**
     * The display text for the role
     * @property
     */
    requestText: RequestText | null;

    /**
     * The comment inputted by the user
     * @property
     */
    comment: string;
}

/**
 * The [[RoleRequestForm]] component is a form for requesting the power user role
 * @class
 */
export class RoleRequestForm extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            requestText: { 
                title: "Power User", 
                text: "power user", 
                summary: "Power users have the ability to create custom aliases for their shortened links. To request the power user role, please fill in and submit the form below. The power user role will only be granted to faculty/staff members. Your request will be manually processed to ensure that you meet this requirement." 
            },
            comment : ''
        };
    }

    /** 
     * Process the request for the role
     * @method
     */
    processRequest = () => {
        console.log('Requesting' + this.state.requestText?.text + 'role')
        console.log('Comment: ' + this.state.comment)
        console.log('NetID: ' + this.props.netid)
        console.log('User privileges: [' + Array.from(this.props.userPrivileges).join(', ') + ']')
    }

    /** 
     * Handle change in the comment input
     * @method
     */
    handleCommentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        this.setState({ comment: event.target.value });
    }

    /** 
     * Validate the comment input by ensuring that it does not contain newline characters or tabs
     * @method
     */
    validateCommentInput = (_: any, value: string) => {
        if (!value || (!value.includes('\n') && !value.includes('\t'))) {
            return Promise.resolve();
        }
        return Promise.reject(new Error('Cannot use newline characters or tabs'));
    }

    render(): React.ReactNode {
        return (
            <div>
                <Row className="primary-row">
                    <Col span={24}>
                        <span className="page-title">Request {this.state.requestText?.title} Role</span>
                    </Col>
                </Row>
                <p>{this.state.requestText?.summary}</p>
                <Form onFinish={this.processRequest}>
                    <Form.Item
                        name="comment"
                        rules={[
                            {
                                required: true,
                                message: 'Comment cannot be empty',
                            },
                            {
                                validator: this.validateCommentInput,
                            },
                        ]}
                    >
                        <Input.TextArea
                            rows={4}
                            value={this.state.comment}
                            onChange={this.handleCommentChange}
                            placeholder={'Please provide a brief explanation of why you need the ' + this.state.requestText?.text + ' role'}
                        />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            <CheckOutlined /> Request {this.state.requestText?.text} role
                        </Button>
                    </Form.Item>
                </Form>
            </div>
        );
    }
}
