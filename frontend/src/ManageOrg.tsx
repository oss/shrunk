import React from 'react';
import { Row, Col, Button, Popconfirm, Spin, Dropdown, Form, Input, Checkbox, Tooltip } from 'antd';
import {
    ExclamationCircleFilled, DeleteOutlined, PlusCircleFilled,
    LineChartOutlined, CloseOutlined, UpOutlined, DownOutlined,
} from '@ant-design/icons';
import { RouteComponentProps } from 'react-router';
import { Link, withRouter } from 'react-router-dom';
import moment from 'moment';

import { MemberInfo, OrgInfo, getOrgInfo } from './api/Org';
import { OrgAdminTag } from './OrgCommon';
import './Base.less';
import './ManageOrg.less';

export type Props = RouteComponentProps<{ id: string }> & {
    userNetid: string;
    userPrivileges: Set<string>;
}

interface State {
    orgInfo: OrgInfo | null;
    adminsCount: number;
    addMemberFormVisible: boolean;
}

const AddMemberForm: React.FC<{
    isAdmin: boolean,
    onCreate: (netid: string, is_admin: boolean) => Promise<void>,
}> = (props) => {
    const serverValidateNetid = async (_rule: any, value: string): Promise<void> => {
        if (!value) {
            return;
        }
        const result = await fetch('/api/v1/org/validate_netid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ netid: value }),
        }).then(resp => resp.json());
        if (!result['valid']) {
            throw new Error(result['reason']);
        }
    };
    const onFinish = async (values: { netid: string, is_admin: boolean }) => await props.onCreate(values.netid, values.is_admin);
    return (
        <div className='dropdown-form'>
            <Form
                layout='inline'
                initialValues={{ name: '' }}
                onFinish={onFinish}>
                <Input.Group compact>
                    <Form.Item
                        name='netid'
                        rules={[
                            { required: true, message: 'Please input a NetID.' },
                            { validator: serverValidateNetid }]}>
                        <Input placeholder='NetID' />
                    </Form.Item>

                    {!props.isAdmin ? <></> :
                        <Form.Item name='is_admin' valuePropName='checked' className='admin-checkbox'>
                            <Checkbox defaultChecked={false}>Admin?</Checkbox>
                        </Form.Item>}

                    <Form.Item>
                        <Button type='primary' htmlType='submit' icon={<PlusCircleFilled />} />
                    </Form.Item>
                </Input.Group>
            </Form>
        </div>
    );
}

const MemberRow: React.FC<{
    isAdmin: boolean,
    adminsCount: number,
    memberInfo: MemberInfo,
    onDelete: (netid: string) => Promise<void>,
    onChangeAdmin: (netid: string, admin: boolean) => Promise<void>,
}> = (props) => {
    const mayNotRemoveMember = props.memberInfo.is_admin && props.adminsCount === 1;
    return (
        <Row className='primary-row'>
            <Col span={20}>
                <span className='title'>{props.memberInfo.netid}</span>
                {props.memberInfo.is_admin ? <OrgAdminTag title='This member is an administrator.' /> : <></>}
                <span>Added: {moment(props.memberInfo.timeCreated).format('DD MMM YYYY')}</span>
            </Col>

            <Col span={4} className='btn-col'>
                {!props.isAdmin ? <></> :
                    props.memberInfo.is_admin ?
                        mayNotRemoveMember ?
                            <Tooltip
                                placement='top'
                                title='You may not remove the last administrator from an organization.'>
                                <Button disabled type='text' icon={<DownOutlined />} />
                            </Tooltip> :
                            <Tooltip
                                placement='top'
                                title='Remove administrator privileges from this member.'>
                                <Button
                                    type='text'
                                    icon={<DownOutlined />}
                                    onClick={async () => await props.onChangeAdmin(props.memberInfo.netid, false)} />
                            </Tooltip> :
                        <Tooltip
                            placement='top'
                            title='Make this member an administrator.'>
                            <Button
                                type='text'
                                icon={<UpOutlined />}
                                onClick={async () => await props.onChangeAdmin(props.memberInfo.netid, true)} />
                        </Tooltip>}

                {!props.isAdmin ? <></> :
                    mayNotRemoveMember ?
                        <Tooltip
                            placement='top'
                            title='You may not remove the last administrator from an organization.'>
                            <Button danger disabled type='text' icon={<CloseOutlined />} />
                        </Tooltip> :
                        <Popconfirm
                            placement='top'
                            title='Are you sure you want to remove this member?'
                            onConfirm={async () => await props.onDelete(props.memberInfo.netid)}
                            icon={<ExclamationCircleFilled style={{ color: 'red' }} />}>
                            <Button danger type='text' icon={<CloseOutlined />} />
                        </Popconfirm>}
            </Col>
        </Row>
    );
}

class ManageOrgInner extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            orgInfo: null,
            adminsCount: 0,
            addMemberFormVisible: false,
        };
    }

    async componentDidMount(): Promise<void> {
        await this.refreshOrgInfo();
    }

    async componentDidUpdate(prevProps: Props): Promise<void> {
        if (this.props != prevProps) {
            await this.refreshOrgInfo();
        }
    }

    refreshOrgInfo = async (): Promise<void> => {
        const orgInfo = await getOrgInfo(this.props.match.params.id);
        const adminsCount = orgInfo.members.filter(member => member.is_admin).length;
        this.setState({ orgInfo, adminsCount });
    }

    onAddMember = async (netid: string, is_admin: boolean): Promise<void> => {
        await fetch(`/api/v1/org/${this.props.match.params.id}/member/${netid}`, { method: 'PUT' });
        if (is_admin) {
            await fetch(`/api/v1/org/${this.props.match.params.id}/member/${netid}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_admin: true }),
            });
        }
        this.setState({ addMemberFormVisible: false });
        await this.refreshOrgInfo();
    }

    onDeleteMember = async (netid: string): Promise<void> => {
        await fetch(`/api/v1/org/${this.props.match.params.id}/member/${netid}`, { method: 'DELETE' });
        await this.refreshOrgInfo();
    }

    onChangeAdmin = async (netid: string, admin: boolean): Promise<void> => {
        await fetch(`/api/v1/org/${this.props.match.params.id}/member/${netid}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_admin: admin }),
        });
        await this.refreshOrgInfo();
    }

    leaveOrg = async (): Promise<void> => {
        await fetch(`/api/v1/org/${this.props.match.params.id}/member/${this.props.userNetid}`, { method: 'DELETE' });
        this.props.history.push('/orgs');
    }

    deleteOrg = async (): Promise<void> => {
        await fetch(`/api/v1/org/${this.props.match.params.id}`, { method: 'DELETE' });
        this.props.history.push('/orgs');
    }

    render(): React.ReactNode {
        if (this.state.orgInfo === null) {
            return (<Spin size='large' />);
        }

        const isAdmin = this.state.orgInfo.is_admin || this.props.userPrivileges.has('admin');
        const userMayNotLeave = this.state.orgInfo.is_admin && this.state.adminsCount === 1;
        return (
            <>
                <Row className='primary-row'>
                    <Col span={12}>
                        {this.state.orgInfo === null ? <Spin size='small' /> :
                            <span className='page-title'>Manage organization <em>{this.state.orgInfo.name}</em></span>}
                    </Col>

                    <Col span={12} className='btn-col'>
                        <Dropdown
                            overlay={<AddMemberForm isAdmin={isAdmin} onCreate={this.onAddMember} />}
                            visible={this.state.addMemberFormVisible}
                            onVisibleChange={flag => this.setState({ addMemberFormVisible: flag })}
                            trigger={['click']}>
                            <Button type='primary'><PlusCircleFilled /> Add a Member</Button>
                        </Dropdown>

                        <Button type='primary'>
                            <Link to={`/orgs/${this.props.match.params.id}/stats`}>
                                <LineChartOutlined /> Org Stats
                            </Link>
                        </Button>

                        {!this.state.orgInfo.is_member ? <></> :
                            userMayNotLeave ?
                                <Tooltip
                                    placement='bottom'
                                    title='You may not remove the last administrator from an organization.'>
                                    <Button danger disabled>
                                        <CloseOutlined /> Leave Org
                                    </Button>
                                </Tooltip> :
                                <Popconfirm
                                    placement='bottom'
                                    title='Are you sure you want to leave this organization?'
                                    onConfirm={this.leaveOrg}
                                    icon={<ExclamationCircleFilled style={{ color: 'red' }} />}>
                                    <Button danger>
                                        <CloseOutlined /> Leave Org
                                    </Button>
                                </Popconfirm>}

                        {!isAdmin ? <></> :
                            <Popconfirm
                                placement='bottom'
                                title='Are you sure you want to delete this organization?'
                                onConfirm={this.deleteOrg}
                                icon={<ExclamationCircleFilled style={{ color: 'red' }} />}>
                                <Button danger>
                                    <DeleteOutlined /> Delete Org
                                </Button>
                            </Popconfirm>}
                    </Col>
                </Row>

                {this.state.orgInfo.members.map(member =>
                    <MemberRow
                        key={member.netid}
                        isAdmin={isAdmin}
                        adminsCount={this.state.adminsCount}
                        memberInfo={member}
                        onDelete={this.onDeleteMember}
                        onChangeAdmin={this.onChangeAdmin} />)}
            </>
        );
    }
}

export const ManageOrg = withRouter(ManageOrgInner);
