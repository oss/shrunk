/**
 * Implements the [[Shrunk]] component
 * @packageDocumentation
 */

import React from 'react';
import { HashRouter, Switch, Route, Redirect, Link, NavLink } from 'react-router-dom';
import { createBrowserHistory, Location } from 'history';
import { Layout, Menu } from 'antd';

const { SubMenu } = Menu;
const { Header, Content, Footer, Sider } = Layout;

import { Dashboard } from './Dashboard';
import { Stats } from './Stats';
import { Admin } from './Admin';
import { AdminStats } from './AdminStats';
import { Role } from './Role';
import { Orgs } from './Orgs';
import { ManageOrg } from './ManageOrg';
import { OrgStats } from './OrgStats';
import { Faq } from './Faq';
import './antd_themed.less';
import './Shrunk.less';

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
     * This determines which tabs in the navbar are highlighted. This is determined
     * based on the active route.
     * @property
     */
    selectedKeys: Array<string>;
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
        const showWhitelistTab = !showAdminTab && this.props.userPrivileges.has('facstaff');
        this.state = {
            showAdminTab,
            showWhitelistTab,
            selectedKeys: ['dashboard'],
        };
    }

    componentDidMount(): void {
        const history = createBrowserHistory();
        this.setSelectedKeysFromLocation(history.location);
        history.listen(({ location }) => this.setSelectedKeysFromLocation(location));
    }

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
        } else if (route.startsWith('#/faq')) {
            key = 'faq';
        }

        if (key === null) {
            throw new Error(`unknown route ${route}`);
        }

        this.setState({ selectedKeys: [key] });
    }

    render(): React.ReactNode {
        return (
            <HashRouter>
                <Layout>
                    <Header className='header'>
                        <div className='logo'>
                            <Link to='/dash'>
                                <img alt='Rutgers' src='/app/static/img/RU_LOGOTYPE_REVWHITE.png' width='175px' />
                            </Link>
                        </div>
                        <Menu theme='dark' mode='horizontal' selectedKeys={this.state.selectedKeys}>
                            <Menu.Item key='dash'>
                                <NavLink to='/dash' className='nav-text'>Dashboard</NavLink>
                            </Menu.Item>
                            {!this.state.showAdminTab ? <></> :
                                <Menu.Item key='admin'>
                                    <NavLink to='/admin' className='nav-text'>Admin</NavLink>
                                </Menu.Item>}
                            {!this.state.showWhitelistTab ? <></> :
                                <Menu.Item key='whitelist'>
                                    <NavLink to='/roles/whitelisted' className='nav-text'>Whitelist</NavLink>
                                </Menu.Item>}
                            <Menu.Item key='orgs'>
                                <NavLink to='/orgs' className='nav-text'>Organizations</NavLink>
                            </Menu.Item>
                            <Menu.Item key='faq'>
                                <NavLink to='/faq' className='nav-text'>FAQ</NavLink>
                            </Menu.Item>
                            <SubMenu key='user' title={this.props.netid} style={{ float: 'right' }}>
                                <Menu.Item key='logout'>
                                    <a href='/app/logout'>Logout</a>
                                </Menu.Item>
                            </SubMenu>
                        </Menu>
                    </Header>
                    <Layout>
                        <Sider width={this.props.siderWidth} style={{ background: 'white' }} />
                        <Content
                            className='main-content'
                            style={{
                                padding: 24,
                                margin: 0,
                                minHeight: 280,
                            }}>
                            <Switch>
                                <Route exact path='/'>
                                    <Redirect to='/dash' />
                                </Route>

                                <Route exact path='/dash'>
                                    <Dashboard userPrivileges={this.props.userPrivileges} />
                                </Route>

                                <Route
                                    exact
                                    path='/stats/:id'
                                    render={(props) => <Stats id={props.match.params.id} />} />

                                <Route exact path='/orgs'>
                                    <Orgs userPrivileges={this.props.userPrivileges} />
                                </Route>

                                <Route
                                    exact
                                    path='/orgs/:id/manage'>
                                    <ManageOrg userNetid={this.props.netid} userPrivileges={this.props.userPrivileges} />
                                </Route>

                                <Route
                                    exact
                                    path='/orgs/:id/stats'
                                    render={(props) => <OrgStats id={props.match.params.id} />} />

                                <Route exact path='/faq'>
                                    <Faq />
                                </Route>

                                <Route
                                    exact
                                    path='/roles/:name'
                                    render={(props) => <Role userPrivileges={this.props.userPrivileges} name={props.match.params.name} />} />

                                {!this.state.showAdminTab ? <></> :
                                    <>
                                        <Route exact path='/admin'>
                                            <Admin />
                                        </Route>
                                        <Route exact path='/admin/stats'>
                                            <AdminStats />
                                        </Route>
                                    </>}
                            </Switch>
                        </Content>
                        <Sider width={this.props.siderWidth} style={{ background: 'white' }} />
                    </Layout>
                    <Footer style={{ textAlign: 'center', color: '#f0f0f0' }}>
                        &copy;{new Date().getFullYear()}&mdash;Rutgers, The State University of New Jersey&mdash;Questions? Bugs? Contact us:&nbsp;
                            <a href='mailto:oss@oss.rutgers.edu'>oss@oss.rutgers.edu</a>
                    </Footer>
                </Layout>
            </HashRouter >
        );
    }
}
