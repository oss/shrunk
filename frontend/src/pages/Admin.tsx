/**
 * Implements the [[Admin]] component
 * @packageDocumentation
 */

import React from 'react';
import { Row, Col, Spin, Badge } from 'antd/lib';
import { Link } from 'react-router-dom';

/**
 * Props for the [[Admin]] component
 * @interface
 */
export interface Props {}

/**
 * Summary information for one role
 * @interface
 */
interface RoleInfo {
  /**
   * The role name (i.e., its internal identifier)
   * @property
   */
  name: string;

  /**
   * The role's display name (i.e., the text that should be displayed to the user)
   * @property
   */
  display_name: string;
}

/**
 * State for the [[Admin]] component
 * @interface
 */
interface State {
  /**
   * List of all roles available on the server
   * @property
   */
  roles: RoleInfo[] | null;
  linksToBeVerified: number;

  /**
   * The number of pending power user requests to process
   * @property
   */
  powerUserRequestsCount: number;
}

/**
 * The [[Admin]] component allows the user to access the [[AdminStats]] page and
 * to access the [[Role]] page for any role
 * @interface
 */
export class Admin extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      roles: null,
      linksToBeVerified: -1,
      powerUserRequestsCount: -1,
    };
  }

  async componentDidMount(): Promise<void> {
    await fetch('/api/v1/security/pending_links/count')
      .then((resp) => resp.json())
      .then((json) =>
        this.setState({
          linksToBeVerified: json.pending_links_count,
        }),
      );
    await fetch('/api/v1/role')
      .then((resp) => resp.json())
      .then((json) => this.setState({ roles: json.roles as RoleInfo[] }));
    await this.updatePendingPowerUserRequestsCount();
  }

  /**
   * Update the number of pending power user requests
   * @method
   */
  updatePendingPowerUserRequestsCount = (): void => {
    fetch('/api/v1/role_request/power_user/count')
      .then((resp) => resp.json())
      .then((json) =>
        this.setState({
          powerUserRequestsCount: json.count,
        }),
      );
  };

  render(): React.ReactNode {
    return (
      <>
        <Row className="primary-row">
          <Col span={16}>
            <span className="page-title">Administrator Controls</span>
          </Col>
        </Row>

        <Row className="primary-row">
          <Col span={24}>
            <Link to="/admin/stats" className="title">
              Admin Statistics
            </Link>
          </Col>
        </Row>

        <Row className="primary-row">
          <Col span={24}>
            <Link to="/admin/user_lookup" className="title">
              User Lookup
            </Link>
          </Col>
        </Row>

        <Row className="primary-row">
          <Col span={24}>
            <Link to="/admin/link_security" className="title">
              Unsafe Links Pending Verification
              {this.state.linksToBeVerified === -1 ? (
                <Spin size="small" />
              ) : (
                <Badge count={this.state.linksToBeVerified} offset={[8, -20]} />
              )}
            </Link>
          </Col>
        </Row>

        <Row className="primary-row">
          <Col span={24}>
            <Link to="/admin/role_requests/power_user" className="title">
              Pending Power User Role Requests
              {this.state.powerUserRequestsCount === -1 ? (
                <Spin size="small" />
              ) : (
                <Badge
                  count={this.state.powerUserRequestsCount}
                  offset={[8, -20]}
                />
              )}
            </Link>
          </Col>
        </Row>

        {this.state.roles === null ? (
          <Spin size="large" />
        ) : (
          this.state.roles.map((role) => (
            <Row key={role.name} className="primary-row">
              <Col span={24}>
                <Link to={`/roles/${role.name}`} className="title">
                  {role.display_name}
                </Link>
              </Col>
            </Row>
          ))
        )}
      </>
    );
  }
}
