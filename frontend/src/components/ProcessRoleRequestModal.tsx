/**
 * Implement the [[ProcessRoleRequestModal]] component
 * @packageDocumentation
 */

import React, { Component } from 'react';
import { Modal, Button, Input, Form } from 'antd/lib';

interface Props {
    /**
     * Whether the modal is visible
     * @property
     */
    visible: boolean;

    /**
     * The entity that is being processed
     * @property
     */
    entity: string;

    /**
     * Whether the process is to grant or deny the role request
     * @property
     */
    toGrant: boolean;

    /**
     * The name of the role (displayed uncapitalized name)
     * @property
     */
    roleName: string;

    /**
     * Function to call to process the role request and close the modal
     * @property
     */
    onProcess: () => void;

    /**
     * Function to call when the modal is closed
     * @property
     */
    onClose: () => void;
}

interface State {
    /**
     * The comment for granting or denying the role request
     * @property
     */
    comment: string;
}

export class ProcessRoleRequestModal extends Component<Props, State> { 
    constructor(props: Props){
        super(props);
        this.state = {
            comment: ''
        };
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

    render(){
        return (
            <Modal
                visible={this.props.visible}
                onCancel={() => {this.props.onClose();} }
                footer={[
                    <Button type="default" key="back" onClick={() => {this.props.onClose();} }>
                        Cancel
                    </Button>,
                    <Button type="primary" key="submit" onClick={() => {this.props.onProcess();} }>
                        Submit
                    </Button>
                ]}
                maskClosable={false}
                closable={false}
                keyboard={false}
            >
                {this.props.toGrant ? (
                    <p>Include an optional comment to grant the {this.props.roleName} role for {this.props.entity}:</p>
                ) : (
                    <p>Include an optional comment to deny the {this.props.roleName} role for {this.props.entity}:</p>
                )}
                <Form>
                    <Form.Item
                        label="Comment"
                        name="comment"
                        rules={[
                            {
                                validator: this.validateCommentInput,
                            },
                        ]}
                    >
                        <Input.TextArea 
                            value={this.state.comment}
                            onChange={this.handleCommentChange}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        );
    }
}