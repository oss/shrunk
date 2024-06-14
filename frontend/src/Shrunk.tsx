/**
 * Implements the [[Shrunk]] component
 * @packageDocumentation
 */

import React from 'react';
import {
  HashRouter,
  Switch,
  Route,
  Redirect,
  Link,
  NavLink,
} from 'react-router-dom';
import { createBrowserHistory, Location } from 'history';
import { Layout, Menu, Dropdown, Button, Modal, Typography } from 'antd/lib';
import {
  UserOutlined,
  DownOutlined,
  MenuOutlined,
  TeamOutlined,
  BookOutlined,
  BulbOutlined,
  LogoutOutlined,
  SafetyOutlined,
  SlidersOutlined,
} from '@ant-design/icons';

import { Dashboard } from './pages/Dashboard';
import { Admin } from './pages/Admin';
import { Orgs } from './pages/Orgs';
import { Faq } from './pages/Faq';
import { RoleRequestForm } from './pages/RoleRequestForm';

import { Stats } from './pages/subpages/Stats';
import { AdminStats } from './admin/AdminStats';
import LinkSecurity from './admin/LinkSecurity';
import { Role } from './admin/Role';
import { ManageOrg } from './pages/subpages/ManageOrg';
import { OrgStats } from './pages/subpages/OrgStats';
import { PendingRoleRequests } from './admin/PendingRoleRequests';

import { PendingAlerts } from './alerts/PendingAlerts';
import { PendingRequests } from './components/PendingRequests';

import base32 from 'hi-base32';

import './antd_themed.less';
import './Shrunk.less';
import LinkHubDashboard from './pages/LinkHubDashboard';
import LinkHubEditor from './pages/subpages/LinkHubEditor';

const { Header, Content, Footer, Sider } = Layout;

/**
 * Properties of the [[Shrunk]] component.
 * @interface
 */
export interface Props {
  /**
   * NetID of the user.
   * @property
   */
  netid: string;

  /**
   * Width of the siders in the layout.
   * @property
   */
  siderWidth: number;

  /**
   * A set of the user's privileges.
   * @property
   */
  userPrivileges: Set<string>;
}

/**
 * State of the [[Shrunk]] component.
 * @interface
 */
interface State {
  /**
   * Whether the "Admin" tab should be shown in the top navbar. This is
   * determined based on the user's privileges.
   * @property
   */
  showAdminTab: boolean;

  /**
   * Whether the "Whitelist" tab should be shown in the top navbar. This is
   * determined based on the user's privileges.
   * @property
   */
  showWhitelistTab: boolean;

  /**
   * Whether the "Request Power User Role" tab should be shown in the top navbar. This is
   * determined based on whether the user has the power user role and whether the user has
   * already requested the power user role.
   */
  showRequestPowerUserRoleTab: boolean;

  /**
   * This determines which tabs in the navbar are highlighted. This is determined
   * based on the active route.
   * @property
   */
  selectedKeys: Array<string>;

  /**
   * The alerts which need to be displayed to the user, in increasing order.
   * @property
   */
  pendingAlerts: Array<string>;

  /**
   * Role of the user
   * @property
   */
  role: string;

  /**
   * Is the LinkHub service available?
   * @property
   */
  isLinkHubEnabled: boolean;
}

/**
 * The [[Shrunk]] component is the root component of the application. It is
 * responsible for setting up the root-level layout, the router, and managing
 * navigation between views.
 * @class
 */
export class Shrunk extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    const showAdminTab = this.props.userPrivileges.has('admin');
    const showWhitelistTab =
      !showAdminTab && this.props.userPrivileges.has('facstaff');
    const showRequestPowerUserRoleTab =
      !this.props.userPrivileges.has('power_user') &&
      !this.props.userPrivileges.has('admin');
    const role =
      this.props.userPrivileges.size === 0
        ? 'Whitelisted User'
        : this.props.userPrivileges.has('power_user')
        ? 'Power User'
        : this.props.userPrivileges.has('facstaff')
        ? 'Faculty/Staff'
        : 'Administrator';
    this.state = {
      showAdminTab,
      showWhitelistTab,
      showRequestPowerUserRoleTab,
      selectedKeys: ['dashboard'],
      pendingAlerts: [],
      role,
      isLinkHubEnabled: false,
    };
    this.fetchIsLinkHubEnabled();
  }

  async componentDidMount(): Promise<void> {
    await this.updatePendingAlerts();
    await this.updatePowerUserRoleRequestMade();
    const history = createBrowserHistory();
    this.setSelectedKeysFromLocation(history.location);
    history.listen(({ location }) =>
      this.setSelectedKeysFromLocation(location),
    );
  }

  fetchIsLinkHubEnabled = async (): Promise<void> => {
    await fetch('/api/v1/linkhub/is-linkhub-enabled')
      .then((resp) => resp.json())
      .then((json) =>
        this.setState({ isLinkHubEnabled: json.status as boolean }),
      );
  };

  /**
   * Fetches list of pending alerts from backend and updates state.
   * @method
   */
  updatePendingAlerts = async (): Promise<void> => {
    await fetch(`/api/v1/alert/${this.props.netid}`)
      .then((resp) => resp.json())
      .then((json) =>
        this.setState({ pendingAlerts: json.pending_alerts as Array<string> }),
      );
  };

  /**
   * Fetches whether the user has already made a request for the power user role and updates state.
   * @method
   */
  updatePowerUserRoleRequestMade = async (): Promise<void> => {
    const encodedEntity = base32.encode(this.props.netid);
    fetch(`/api/v1/role_request/power_user/${encodedEntity}`)
      .then((response) => {
        if (response.status === 204) {
          if (
            !this.props.userPrivileges.has('power_user') &&
            !this.props.userPrivileges.has('admin')
          ) {
            this.setState({ showRequestPowerUserRoleTab: true });
          }
        } else if (response.status === 200) {
          this.setState({ showRequestPowerUserRoleTab: false });
        }
      })
      .catch((error) => console.error('Error:', error));
  };

  /**
   * Sets the active tabs in the navbar based on the current view.
   * @method
   * @param location The location given by the history.listen event
   */
  setSelectedKeysFromLocation = (location: Location): void => {
    const route = location.hash;
    let key: string | null = null;
    if (route.startsWith('#/dash') || route.startsWith('#/stats')) {
      key = 'dash';
    } else if (route.startsWith('#/linkhubs')) {
      key = 'linkhubs';
    } else if (route.startsWith('#/orgs')) {
      key = 'orgs';
    } else if (route.startsWith('#/admin')) {
      key = 'admin';
    } else if (route.startsWith('#/roles')) {
      if (this.state.showWhitelistTab) {
        key = 'whitelist';
      } else {
        key = 'admin';
      }
    } else if (route.startsWith('#/request-power-user-role')) {
      key = 'request-power-user-role';
    } else if (route.startsWith('#/faq')) {
      key = 'faq';
    }

    if (key === null) {
      throw new Error(`unknown route ${route}`);
    }

    this.setState({ selectedKeys: [key] });
  };

  render(): React.ReactNode {
    return (
      <HashRouter>
        <Layout>
          <Header className="header">
            <div className="logo">
              <Link to="/dash">
                <img
                  alt="Rutgers"
                  src="/static/img/rutgers.png"
                  width="175px"
                  srcSet="/static/img/rutgers.png"
                />
              </Link>
            </div>
            <div className="user-name">
              <Dropdown
                className="profile-menu"
                overlay={
                  <Menu>
                    <Menu.Item
                      key="role-status"
                      disabled
                      style={{
                        textAlign: 'center',
                        cursor: 'default',
                        color: 'black',
                        paddingTop: '8px',
                        paddingBottom: '8px',
                      }}
                    >
                      <p style={{ margin: 0, marginBottom: '-4px' }}>
                        {this.props.netid}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.8em',
                          color: '#383838',
                        }}
                      >
                        {this.state.role}
                      </p>
                    </Menu.Item>

                    <Menu.Divider />

                    <Menu.Item icon={<TeamOutlined />} key="orgs">
                      <NavLink to="/orgs">My Organizations</NavLink>
                    </Menu.Item>
                    {!this.state.showRequestPowerUserRoleTab ? (
                      <></>
                    ) : (
                      <Menu.Item
                        icon={<SafetyOutlined />}
                        key="request-power-user-role"
                      >
                        <NavLink to="/request-power-user-role">
                          Request Power User Role
                        </NavLink>
                      </Menu.Item>
                    )}

                    {this.state.showAdminTab ? (
                      <Menu.Item
                        key="admin-dashboard"
                        icon={<SlidersOutlined />}
                      >
                        <NavLink to="/admin">Admin Dashboard</NavLink>
                      </Menu.Item>
                    ) : (
                      <></>
                    )}

                    <Menu.Divider />

                    <Menu.Item key="feedback" icon={<BulbOutlined />}>
                      <a href="https://forms.gle/Gv1L1bNZWtLS21wW8">Feedback</a>
                    </Menu.Item>
                    <Menu.Item key="faq" icon={<BookOutlined />}>
                      <NavLink to="/faq">FAQ</NavLink>
                    </Menu.Item>

                    <Menu.Divider />

                    <Menu.Item key="logout" icon={<LogoutOutlined />}>
                      <a href="/app/logout">Logout</a>
                    </Menu.Item>
                  </Menu>
                }
              >
                <Button
                  type="text"
                  aria-label={this.props.netid}
                  className="filter-btn"
                  style={{ textAlign: 'right' }}
                >
                  {this.props.netid} <DownOutlined />
                </Button>
              </Dropdown>
            </div>
            <div className="user-icon">
              <Dropdown
                className="icon-menu"
                overlay={
                  <Menu>
                    <Menu.Item key="1" disabled style={{ textAlign: 'center' }}>
                      {this.state.role}
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item key="2" style={{ textAlign: 'center' }}>
                      <a href="/app/logout">Logout</a>
                    </Menu.Item>
                  </Menu>
                }
              >
                <Button
                  type="text"
                  className="user-btn"
                  aria-label="user profile"
                  icon={<UserOutlined style={{ color: '#f0b1b9' }} />}
                />
              </Dropdown>
            </div>
            <Menu
              overflowedIndicator={<MenuOutlined />}
              className="navbar"
              theme="dark"
              mode="horizontal"
              selectedKeys={this.state.selectedKeys}
            >
              <Menu.Item key="dash">
                <NavLink to="/dash" className="nav-text">
                  URL Shortener
                </NavLink>
              </Menu.Item>
              {this.state.isLinkHubEnabled ? (
                <Menu.Item key="linkhubs">
                  <NavLink to="/linkhubs" className="nav-text">
                    LinkHub
                  </NavLink>
                </Menu.Item>
              ) : (
                <></>
              )}
              {!this.state.showWhitelistTab ? (
                <></>
              ) : (
                <Menu.Item key="whitelist">
                  <NavLink to="/roles/whitelisted" className="nav-text">
                    Whitelist
                  </NavLink>
                </Menu.Item>
              )}
            </Menu>
          </Header>
          <Layout>
            <Sider
              width={this.props.siderWidth}
              breakpoint="xl"
              collapsedWidth="10"
              style={{ background: 'white' }}
            />
            <Content
              className="main-content"
              style={{
                padding: 24,
                margin: 0,
                minHeight: 280,
              }}
            >
              {this.state.pendingAlerts === [] ? (
                <></>
              ) : (
                <PendingAlerts
                  netid={this.props.netid}
                  pendingAlerts={this.state.pendingAlerts}
                />
              )}
              <PendingRequests />
              <Switch>
                <Route exact path="/">
                  <Redirect to="/dash" />
                </Route>

                <Route exact path="/dash">
                  <Dashboard
                    userPrivileges={this.props.userPrivileges}
                    netid={this.props.netid}
                  />
                </Route>

                <Route exact path="/linkhubs">
                  <LinkHubDashboard />
                </Route>

                <Route
                  exact
                  path="/linkhubs/:linkHubId/edit"
                  render={(props) => (
                    <LinkHubEditor linkhubId={props.match.params.linkHubId} />
                  )}
                />

                <Route
                  exact
                  path="/stats/:id"
                  render={(props) => <Stats id={props.match.params.id} />}
                />

                <Route exact path="/orgs">
                  <Orgs userPrivileges={this.props.userPrivileges} />
                </Route>

                <Route exact path="/orgs/:id/manage">
                  <ManageOrg
                    userNetid={this.props.netid}
                    userPrivileges={this.props.userPrivileges}
                  />
                </Route>

                <Route
                  exact
                  path="/orgs/:id/stats"
                  render={(props) => <OrgStats id={props.match.params.id} />}
                />

                <Route exact path="/request-power-user-role">
                  {this.state.showRequestPowerUserRoleTab && (
                    <RoleRequestForm
                      userPrivileges={this.props.userPrivileges}
                      netid={this.props.netid}
                      name="power_user"
                    />
                  )}
                </Route>

                <Route exact path="/faq">
                  <Faq />
                </Route>

                <Route
                  exact
                  path="/roles/:name"
                  render={(props) => (
                    <Role
                      userPrivileges={this.props.userPrivileges}
                      name={props.match.params.name}
                    />
                  )}
                />

                {!this.state.showAdminTab ? (
                  <></>
                ) : (
                  <>
                    <Route exact path="/admin">
                      <Admin />
                    </Route>
                    <Route exact path="/admin/stats">
                      <AdminStats />
                    </Route>
                    <Route exact path="/admin/link_security">
                      <LinkSecurity />
                    </Route>
                    <Route exact path="/admin/role_requests/power_user">
                      <PendingRoleRequests
                        name="power_user"
                        userPrivileges={this.props.userPrivileges}
                      />
                    </Route>
                  </>
                )}
              </Switch>
            </Content>
            <Sider
              width={this.props.siderWidth}
              breakpoint="xl"
              collapsedWidth="10"
              style={{ background: 'white' }}
            />
          </Layout>
          <Footer
            style={{
              display: 'flex',
              justifyContent: 'center',
              textAlign: 'center',
              color: 'rgb(162, 162, 162)',
              backgroundColor: 'rgb(18, 18, 18)',
            }}
          >
            <div style={{ width: '50%' }}>
              <p>
                &copy; {new Date().getFullYear()}{' '}
                <a href="https://rutgers.edu">
                  Rutgers, The State University of New Jersey
                </a>
                . All rights reserved. Rutgers is an equal access/equal
                opportunity institution. Individuals with disabilities are
                encouraged to direct suggestions, comments, or complaints
                concerning any accessibility issues with Rutgers websites to{' '}
                <a href="mailto:accessibility@rutgers.edu">
                  accessibility@rutgers.edu
                </a>{' '}
                or complete the{' '}
                <a href="https://rutgers.ca1.qualtrics.com/jfe/form/SV_57iH6Rfeocz51z0">
                  Report Accessibility Barrier or Provide Feedback Form
                </a>
                .
              </p>
            </div>
          </Footer>
        </Layout>
      </HashRouter>
    );
  }
}
