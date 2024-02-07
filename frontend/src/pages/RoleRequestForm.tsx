/**
 * Implements the [[RoleRequestForm]] component
 * @packageDocumentation
 */

import React from 'react';
import { Row, Col, Button, Input, Form, Spin } from 'antd/lib';
import { CheckOutlined } from '@ant-design/icons';

/**
 * Props for the [[RoleRequestForm]] component
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
    word: string;
    prompt: string;
    placeholder_text: string;
    submit_button: string;
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
            requestText: null,
            comment : ''
        };
    }

    async componentDidMount(): Promise<void>{
        const result = await fetch(`/api/v1/role/${this.props.name}/request-text`).then(
            (resp) => resp.json(),
          );
          this.setState({ requestText: result.text as RequestText });
    }

    /** 
     * Process the request for the role
     * @method
     */
    processRequest = () => {
        console.log('Requesting ' + this.state.requestText?.word + ' role')
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
        if (this.state.requestText === null) {
            return <Spin size="large" />;
          }
        return (
            <div>
                <Row className="primary-row">
                    <Col span={24}>
                        <span className="page-title">{this.state.requestText?.title}</span>
                    </Col>
                </Row>
                <p>{this.state.requestText?.prompt}</p>
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
                            placeholder={this.state.requestText?.placeholder_text}
                        />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            <CheckOutlined /> {this.state.requestText?.submit_button}
                        </Button>
                    </Form.Item>
                </Form>
            </div>
        );
    }
}
