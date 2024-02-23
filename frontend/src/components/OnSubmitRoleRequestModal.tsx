/**
 * Implement the [[OnSubmitRoleRequestModal]] component
 * @packageDocumentation
 */

import React, { Component } from 'react';
import { Modal, Button } from 'antd/lib';

/**
 * Props for the [[OnSubmitRoleRequestModal]] component
 */
interface Props {
    /**
     * Whether the modal is visible
     * @property
     */
    visible: boolean;

    /**
     * Whether the role request was sent
     * @property
     */
    roleRequestSent: boolean;

    /**
     * The name of the role (displayed uncapitalized name)
     * @property
     */
    roleName: string;

    /**
     * Function to call when the modal is closed
     * @property
     */
    onClose: () => void;
}

export class RoleRequestModal extends Component<Props> {
    constructor(props: Props){
        super(props);
    }
    render(){
        return (
            <Modal
                visible={this.props.visible}
                onCancel={() => {this.props.onClose();} }
                footer={[
                    <Button type="primary" key="back" onClick={() => {this.props.onClose();} }>
                        Close
                    </Button>,
                ]}
                maskClosable={false}
                closable={false}
                keyboard={false}
            >
                {this.props.roleRequestSent ? (
                    <p>Success! You should receive a confirmation email from <strong>noreply@go.rutgers.edu</strong> for your {this.props.roleName} role request. On closing this modal, you will be redirected to the dashboard.</p>
                ) : (
                    <p>An unexpected error has occurred when trying to send a request for the {this.props.roleName} role. Please contact <a href="mailto:oss@oit.rutgers.edu">oss@oit.rutgers.edu</a></p>
                )}
            </Modal>
    
        );
    }

}