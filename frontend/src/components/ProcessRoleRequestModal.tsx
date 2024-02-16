/**
 * Implement the [[ProcessRoleRequestModal]] component
 * @packageDocumentation
 */

import React, { Component } from 'react';
import { Modal, Button, Input, Form } from 'antd/lib';
import base32 from 'hi-base32';

interface Props {
    /**
     * The role name (The internal identifier, not the display name)
     * @property
     */
    name: string;

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
    roleName: string | undefined;

    /**
     * Function to call when the modal is closed
     * @property
     */
    onClose: () => void;

    /**
     * Function to call to update the pending role requests
     * @property
     */
    updatePendingRoleRequests: () => Promise<void>;
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
            comment: '',
        };
    }

    onProcess = async (entity:string, message: string): Promise<void> => {
        if (this.props.toGrant) {
            await this.onGrant(entity, message);
        } else {
            await this.onDeny(entity, message);
        }
        await this.props.updatePendingRoleRequests();
        this.props.onClose();
    }

    /**
     * Grant a pending role request
     * @param entity the entity making the request
     * @param grant_message the message to include with the grant
     */
    onGrant = async (entity: string, grant_message: string): Promise<void> => {
        const encodedEntity = base32.encode(entity);
        await fetch(`/api/v1/role/${this.props.name}/entity/${encodedEntity}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(
                grant_message !== '' ? { comment: grant_message } : {}
            ),
        });

        await fetch(`/api/v1/role_request`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                role: this.props.name,
                entity: entity,
                comment: grant_message !== '' ? grant_message : undefined,
                granted: true,
            })
        })
        .then(response => {
            if (response.status === 204) {
                console.log(`Granted request for ${entity} with message ${grant_message}`);
            } else {
                console.error(`Failed to grant request for ${entity} with message "${grant_message}"`);
            }
        })
        .catch(error => console.error('Error:', error));
    }

    /**
     * Deny a pending role request
     * @param entity the entity making the request
     * @param deny_message the message to include with the deny
     */
    onDeny = async (entity: string, deny_message: string): Promise<void> => {
        await fetch(`/api/v1/role_request`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                role: this.props.name,
                entity: entity,
                comment: deny_message !== '' ? deny_message : undefined,
                granted: false,
            })
        })
        .then(response => {
            if (response.status === 204) {
                console.log(`Denied request for ${entity} with message ${deny_message}`);
            } else {
                console.error(`Failed to deny request for ${entity} with message "${deny_message}"`);
            }
        })
        .catch(error => console.error('Error:', error));
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
    validateSpacing = (_: any, value: string) => {
        if (!value.includes('\n') && !value.includes('\t')) {
            return Promise.resolve();
        }
        return Promise.reject(new Error('Cannot use newline characters or tabs'));
    }

    render(){
        return (
            <Modal
                visible={this.props.visible}
                title={this.props.toGrant ? `Grant ${this.props.roleName} Role to ${this.props.entity}` : `Deny ${this.props.roleName} Role to ${this.props.entity}`}
                onCancel={() => {
                    this.setState({ comment: '' }, () => {
                        this.props.onClose();
                    });
                }}
                footer={[
                    <Button type="default" key="back" onClick={() => {this.props.onClose();}}>
                        Cancel
                    </Button>,
                    <Button type="primary" key="submit" onClick={() => {this.onProcess(this.props.entity, this.state.comment)}}>
                        Submit
                    </Button>
                ]}
                maskClosable={false}
                closable={false}
                keyboard={false}
            >
                {this.props.toGrant ? (
                    <p>Include an optional grant comment:</p>
                ) : (
                    <p>Include an optional deny comment:</p>
                )}
                <Form>
                    <Form.Item
                        name="comment"
                        rules={[
                            {
                                validator: this.validateSpacing,
                            },
                        ]}
                    >
                        <Input.TextArea 
                            value={this.state.comment}
                            onChange={this.handleCommentChange}
                            placeholder='Enter a comment (optional)'
                        />
                    </Form.Item>
                </Form>
            </Modal>
        );
    }
}