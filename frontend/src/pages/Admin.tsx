/**
 * Implements the [[Admin]] component
 * @packageDocumentation
 */

import React from 'react';
import { Row, Col, Spin } from 'antd';
import { Link } from 'react-router-dom';

import '../Base.less';

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
    };
  }

  async componentDidMount(): Promise<void> {
    await fetch('/api/v1/role')
      .then((resp) => resp.json())
      .then((json) => this.setState({ roles: json['roles'] as RoleInfo[] }));
  }

  render(): React.ReactNode {
    return (
      <>
        <Row className='primary-row'>
          <Col span={16}>
            <span className='page-title'>Administrator Controls</span>
          </Col>
        </Row>

        <Row className='primary-row'>
          <Col span={24}>
            <Link to='/admin/stats' className='title'>
              Admin Statistics
            </Link>
          </Col>
        </Row>

        {this.state.roles === null ? (
          <Spin size='large' />
        ) : (
          this.state.roles.map((role) => (
            <Row key={role.name} className='primary-row'>
              <Col span={24}>
                <Link to={`/roles/${role.name}`} className='title'>
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
