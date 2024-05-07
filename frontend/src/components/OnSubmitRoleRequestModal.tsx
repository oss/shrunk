/**
 * Implement the [[OnSubmitRoleRequestModal]] component
 * @packageDocumentation
 */

import React, { Component } from 'react';
import { Modal, Button, Spin } from 'antd/lib';

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

/**
 * State for the [[OnSubmitRoleRequestModal]] component
 */
interface State {
  /**
   * Whether send_email_on is toggled on
   * @property
   */
  send_mail_on: boolean;
  /**
   * If the modal is loading or not
   * @property
   */
  loading: boolean;
}

export class RoleRequestModal extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      send_mail_on: false,
      loading: false,
    };
  }

  async componentDidMount(): Promise<void> {
    await this.updateSendMailOn();
    this.setState({ loading: false });
  }

  /**
   * Fetch the send_email_on value from the server
   * @method
   */
  updateSendMailOn = async (): Promise<void> => {
    const result = await fetch(`/api/v1/role_request/send_mail_on`).then(
      (resp) => resp.json(),
    );
    this.setState({ send_mail_on: result.send_mail_on });
  };

  render() {
    return (
      <Modal
        visible={this.props.visible}
        onCancel={() => {
          this.props.onClose();
        }}
        footer={[
          <Button
            type="primary"
            key="back"
            onClick={() => {
              this.props.onClose();
            }}
          >
            Close
          </Button>,
        ]}
        maskClosable={false}
        closable={false}
        keyboard={false}
      >
        {this.state.loading ? (
          <Spin />
        ) : this.props.roleRequestSent ? (
          this.state.send_mail_on ? (
            <p>
              Success! You should receive a confirmation email from{' '}
              <strong>noreply@go.rutgers.edu</strong> for your{' '}
              {this.props.roleName} role request. On closing this modal, you
              will be redirected to the dashboard.
            </p>
          ) : (
            <p>
              Success! Your request for the {this.props.roleName} role has been
              made. On closing this modal, you will be redirected to the
              dashboard.
            </p>
          )
        ) : (
          <p>
            An unexpected error has occurred when trying to send a request for
            the {this.props.roleName} role. Please contact{' '}
            <a href="mailto:oss@oit.rutgers.edu">oss@oit.rutgers.edu</a>
          </p>
        )}
      </Modal>
    );
  }
}
