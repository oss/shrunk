/**
 * Implement the [[ProcessRoleRequestModal]] component
 * @packageDocumentation
 */

import React, { Component } from 'react';
import { Modal, Button, Input, Form } from 'antd/lib';
import { message } from 'antd';
import { FormInstance } from 'antd/lib/form';

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
   * Whether the process is to approve or deny the role request
   * @property
   */
  toApprove: boolean;

  /**
   * The role name (The internal identifier, not the display name)
   * @property
   */
  name: string;

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
   * The comment to include with the approve/deny
   * @property
   */
  comment: string;
}

export default class ProcessRoleRequestModal extends Component<Props, State> {
  // Create a ref for the form to ensure that the form is reset when the modal is closed
  formRef = React.createRef<FormInstance>();

  constructor(props: Props) {
    super(props);
    this.state = {
      comment: '',
    };
  }

  /**
   * Process the role request, reset the form, and close the modal
   * @param entity the entity making the request
   * @param comment the comment to include with the approve/deny
   */
  onProcess = async (entity: string, comment: string): Promise<void> => {
    if (this.props.toApprove) {
      await this.onApprove(entity, comment);
    } else {
      await this.onDeny(entity, comment);
    }
    await this.props.updatePendingRoleRequests();
    this.onResetFormAndClose();
  };

  /**
   * Reset the form and close the modal
   * @method
   */
  onResetFormAndClose = (): void => {
    this.formRef.current?.resetFields();
    this.resetComment();
    this.props.onClose();
  };

  /**
   * Approve a pending role request
   * @param entity the entity making the request
   * @param approve_comment the comment to include with the approval
   */
  onApprove = async (
    entity: string,
    approve_comment: string,
  ): Promise<void> => {
    await fetch(`/api/v1/role_request/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: this.props.name,
        entity,
        comment: approve_comment,
      }),
    }).then((response) => {
      if (response.status === 200) {
        message.success(
          `Succesfully granted ${this.props.roleName} role to ${entity}`,
          2,
        );
      } else {
        message.error(
          `Failed to grant ${this.props.roleName} role to ${entity}`,
          2,
        );
      }
    });
  };

  /**
   * Deny a pending role request
   * @param entity the entity making the request
   * @param deny_comment the comment to include with the deny
   */
  onDeny = async (entity: string, deny_comment: string): Promise<void> => {
    await fetch(`/api/v1/role_request/deny`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: this.props.name,
        entity,
        comment: deny_comment,
      }),
    }).then((response) => {
      if (response.status === 204) {
        message.success(
          `Succesfully denied ${this.props.roleName} role to ${entity}`,
          2,
        );
      } else {
        message.error(
          `Failed to deny ${this.props.roleName} role to ${entity}`,
          2,
        );
      }
    });
  };

  /**
   * Reset the comment to an empty string
   * @method
   */
  resetComment = (): void => {
    this.setState({ comment: '' });
  };

  /**
   * Handle change in the comment input
   * @method
   */
  handleCommentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({ comment: event.target.value });
  };

  /**
   * Validate the comment input by ensuring that it does not contain newline characters or tabs
   * @method
   */
  validateCommentInput = (_: any, value: string) => {
    if (!value) {
      return Promise.resolve();
    }

    if (value.includes('\n') || value.includes('\t')) {
      return Promise.reject(new Error('Cannot use newline characters or tabs'));
    }

    if (value.length >= 280) {
      return Promise.reject(new Error(`Comment cannot exceed 280 characters`));
    }

    return Promise.resolve();
  };

  render() {
    return (
      <Modal
        open={this.props.visible}
        title={
          this.props.toApprove
            ? `Approve ${this.props.roleName} role request for ${this.props.entity}`
            : `Deny ${this.props.roleName} role request for ${this.props.entity}`
        }
        onCancel={() => {
          this.onResetFormAndClose();
        }}
        footer={[
          <Button
            type="default"
            key="back"
            onClick={() => {
              this.onResetFormAndClose();
            }}
          >
            Cancel
          </Button>,
          <Button
            type="primary"
            key="submit"
            onClick={() => {
              this.onProcess(this.props.entity, this.state.comment);
            }}
          >
            Confirm
          </Button>,
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
                validator: this.validateCommentInput,
              },
            ]}
          >
            <Input.TextArea
              value={this.state.comment}
              onChange={this.handleCommentChange}
              placeholder="Enter a comment (optional)"
              maxLength={280}
            />
          </Form.Item>
        </Form>
      </Modal>
    );
  }
}
