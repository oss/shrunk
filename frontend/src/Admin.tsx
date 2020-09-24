import React from 'react';
import { Row, Col, Spin } from 'antd';
import { Link } from 'react-router-dom';

import './Base.less';

export interface Props { }

interface RoleInfo {
    name: string;
    display_name: string;
}

interface State {
    roles: RoleInfo[] | null;
}

export class Admin extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            roles: null,
        };
    }

    async componentDidMount(): Promise<void> {
        await fetch('/api/v1/role')
            .then(resp => resp.json())
            .then(json => this.setState({ roles: json['roles'] as RoleInfo[] }));
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

                {this.state.roles === null ? <Spin size='large' /> :
                    this.state.roles.map(role =>
                        <Row key={role.name} className='primary-row'>
                            <Col span={24}>
                                <Link to={`/roles/${role.name}`} className='title'>
                                    {role.display_name}
                                </Link>
                            </Col>
                        </Row>)}
            </>
        );
    }
}
