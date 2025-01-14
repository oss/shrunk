/**
 * Implements the [[RoleRequestForm]] component
 * @packageDocumentation
 */

import React from 'react';
import { Row, Col, Button, Input, Form, Spin } from 'antd/lib';
import { CheckOutlined } from '@ant-design/icons';
import base32 from 'hi-base32';
import OnSubmitRoleRequestModal from '../modals/OnSubmitRoleRequestModal';

/**
 * Data describing the request text for a role
 * @interface
 */
export interface RoleRequestText {
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
 * Props for the [[RoleRequestForm]] component
 * @interface
 */
export interface Props {
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

/**
 * State for the [[RoleRequestForm]] component
 * @interface
 */
export interface State {
  /**
   * The display text for the role
   * @property
   */
  roleRequestText: RoleRequestText | null;

  /**
   * The comment inputted by the user
   * @property
   */
  comment: string;

  /**
   * Whether the request has already been made
   * @property
   */
  roleRequestSent: boolean;

  /**
   * The visible state of the role request modal
   * @property
   */
  visible: boolean;

  /**
   * Whether the ServiceNow ticket link has been clicked
   * @property
   */
  ticketClicked: boolean;
}

/**
 * The [[RoleRequestForm]] component is a form for requesting the power user role
 * @class
 */
export class RoleRequestForm extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      roleRequestText: null,
      comment: '',
      roleRequestSent: false,
      visible: false,
      ticketClicked: false,
    };
  }

  async componentDidMount(): Promise<void> {
    await this.updateRoleRequestText();
    await this.updateRequestMade();
  }

  /**
   * Fetch the request text for the role from the server
   * @method
   */
  updateRoleRequestText = async (): Promise<void> => {
    const result = await fetch(
      `/api/v1/role_request/${this.props.name}/request-text`,
    ).then((resp) => resp.json());
    this.setState({ roleRequestText: result.text as RoleRequestText });
  };

  /**
   * Fetch whether the user has already made a request for the role
   * @method
   */
  updateRequestMade = async (): Promise<void> => {
    const encodedEntity = base32.encode(this.props.netid);
    fetch(`/api/v1/role_request/${this.props.name}/${encodedEntity}`)
      .then((response) => {
        if (response.status === 204) {
          this.setState({ roleRequestSent: false });
        } else if (response.status === 200) {
          this.setState({ roleRequestSent: true });
        }
      })
      .catch((error) => console.error('Error:', error));
  };

  updateTicketClicked = (): void => {
    this.setState({ ticketClicked: true });
  };

  /**
   * Send the request to the OSS team
   * @method
   */
  sendRequest = async () => {
    await fetch(`/api/v1/role_request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: this.props.name,
        comment: this.state.comment,
      }),
    })
      .then((response) => {
        if (response.status === 201) {
          this.setState({ roleRequestSent: true });
        } else if (response.status === 400) {
          console.error('Error: Bad request');
        }
      })
      .catch((error) => console.error('Error:', error));
  };

  /**
   * Closes the on-submit role request modal and redirects to the dashboard if the request was sent successfully
   * @method
   */
  closeRoleRequestModal = () => {
    this.setState({ visible: false });
    if (this.state.roleRequestSent) {
      window.location.href = '/app/#/dash';
      window.location.reload();
    }
  };

  /**
   * Handle form submission
   * @method
   */
  onFinish = async () => {
    await this.sendRequest();
    this.setState({ visible: true });
  };

  /**
   * Handle change in the comment input
   * @method
   */
  handleCommentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({ comment: event.target.value });
  };

  /**
   * Validate the comment input by ensuring that it does not contain certain characters and is not too long
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

  render(): React.ReactNode {
    if (this.state.roleRequestText === null) {
      return <Spin size="large" />;
    }

    return (
      <div>
        <Row className="primary-row">
          <Col span={24}>
            <Button type="text" href="/app/#/dash" size="large" />
            <span className="page-title">
              Request{' '}
              {this.state.roleRequestText?.role.replace(/\b\w/g, (c) =>
                c.toUpperCase(),
              )}{' '}
              Role
            </span>
          </Col>
        </Row>
        <p>{this.state.roleRequestText?.prompt}</p>
        <p>
          <span>First, follow this </span>
          <a
            href="https://ithelp.rutgers.edu/sp?id=sc_cat_item&sys_id=02b2c6afdbf87054fd638962399619d3"
            target="_blank"
            rel="noopener noreferrer"
            onClick={this.updateTicketClicked}
          >
            link
          </a>
          <span>
            {' '}
            to fill in a ServiceNow ticket. This is meant to track the status of
            the request.
          </span>
        </p>
        {this.state.ticketClicked && (
          <>
            <p>Then, submit the form below. This sends the actual request.</p>
            <Form onFinish={this.onFinish}>
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
                  placeholder={this.state.roleRequestText?.placeholder_text}
                  maxLength={280}
                  disabled={this.state.roleRequestSent}
                />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  disabled={this.state.roleRequestSent}
                >
                  <CheckOutlined /> {this.state.roleRequestText?.submit_button}
                </Button>
              </Form.Item>
            </Form>
          </>
        )}
        <OnSubmitRoleRequestModal
          visible={this.state.visible}
          roleRequestSent={this.state.roleRequestSent}
          roleName={this.state.roleRequestText?.role}
          onClose={this.closeRoleRequestModal}
        />
      </div>
    );
  }
}
