/**
 * Implement the [[ProcessRoleRequestModal]] component
 * @packageDocumentation
 */

import React, { Component } from 'react';
import { Modal, Button, Input, Form } from 'antd/lib';
import base32 from 'hi-base32';
import { FormInstance } from 'antd/lib/form';

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
     * The grant or deny message
     * @property
     */
    message: string;

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

    /**
     * Function to reset the message to an empty string
     * @property
     */
    resetMessage: () => void;

    /** 
     * Function to handle change in the message input
     * @property
     */
    handleMessageChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;

    /**
     * Function to validate the message input
     * @property
     */
    validateSpacing: (_: any, value: string) => Promise<void>;
}

export class ProcessRoleRequestModal extends Component<Props> { 
    // Create a ref for the form to ensure that the form is reset when the modal is closed
    formRef = React.createRef<FormInstance>();

    constructor(props: Props){
        super(props);
    }

    /**
     * Process the role request, reset the form, and close the modal
     * @param entity the entity making the request
     * @param message the message to include with the grant/deny
     */
    onProcess = async (entity:string, message: string): Promise<void> => {
        if (this.props.toGrant) {
            await this.onGrant(entity, message);
        } else {
            await this.onDeny(entity, message);
        }
        await this.props.updatePendingRoleRequests();
        this.onResetFormAndClose();
    }

    /**
     * Reset the form and close the modal
     * @method
     */
    onResetFormAndClose = (): void => {
        this.formRef.current?.resetFields();
        this.props.resetMessage();
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

    render(){
        return (
            <Modal
                visible={this.props.visible}
                title={this.props.toGrant ? `Grant ${this.props.roleName} role to ${this.props.entity}` : `Deny ${this.props.roleName} role to ${this.props.entity}`}
                onCancel={() => {
                    this.onResetFormAndClose();
                }}
                footer={[
                    <Button type="default" key="back" onClick={() => {this.onResetFormAndClose();}}>
                        Cancel
                    </Button>,
                    <Button type="primary" key="submit" onClick={() => {this.onProcess(this.props.entity, this.props.message)}}>
                        Submit
                    </Button>
                ]}
                maskClosable={false}
                closable={false}
                keyboard={false}
            >
                <Form ref={this.formRef}>
                    <Form.Item
                        name="comment"
                        rules={[
                            {
                                validator: this.props.validateSpacing,
                            },
                        ]}
                    >
                        <Input.TextArea 
                            value={this.props.message}
                            onChange={this.props.handleMessageChange}
                            placeholder='Enter a message (optional)'
                        />
                    </Form.Item>
                </Form>
            </Modal>
        );
    }
}