import React from 'react';
import { Row, Col, Checkbox, Popconfirm, Button, Dropdown, Form, Input } from 'antd';
import { Link } from 'react-router-dom';
import { ExclamationCircleFilled, DeleteOutlined, LineChartOutlined, ToolOutlined, PlusCircleFilled } from '@ant-design/icons';
import moment from 'moment';

import { OrgInfo, listOrgs, createOrg, deleteOrg } from './api/Org';
import { OrgAdminTag, OrgMemberTag } from './OrgCommon';

import './Base.less';

export interface Props {
    userPrivileges: Set<string>;
}

interface State {
    showAll: boolean;
    orgs: OrgInfo[];
    createOrgFormVisible: boolean;
}

const CreateOrgForm: React.FC<{ onCreate: (name: string) => Promise<void> }> = (props) => {
    const serverValidateOrgName = async (_rule: any, value: string): Promise<void> => {
        if (!value) {
            return;
        }
        const result = await fetch('/api/v1/org/validate_name', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: value }),
        }).then(resp => resp.json());
        if (!result.valid) {
            throw new Error(result.reason);
        }
    };
    const onFinish = async (values: { name: string }) => await props.onCreate(values.name);
    return (
        <div className='dropdown-form'>
            <Form
                layout='inline'
                initialValues={{ name: '' }}
                onFinish={onFinish}>
                <Input.Group compact>
                    <Form.Item
                        name='name'
                        rules={[
                            { required: true, message: 'Please input a name.' },
                            { pattern: /^[a-zA-Z0-9_.,-]*$/, message: 'Name must consist of letters, numbers, and the characters "_.,-".' },
                            { validator: serverValidateOrgName }]}>
                        <Input placeholder='Name' />
                    </Form.Item>

                    <Form.Item>
                        <Button type='primary' htmlType='submit' icon={<PlusCircleFilled />} />
                    </Form.Item>
                </Input.Group>
            </Form>
        </div>
    );
}

const OrgRow: React.FC<{
    showAll: boolean,
    orgInfo: OrgInfo,
    onDelete: (id: string) => Promise<void>
}> = (props) => {
    return (
        <Row className='primary-row' >
            <Col span={20}>
                <span className='title'>{props.orgInfo.name}</span>
                {props.orgInfo.is_admin ? <OrgAdminTag title='You are an administrator of this organization.' /> : <></>}
                {props.showAll && props.orgInfo.is_member ? <OrgMemberTag /> : <></>}
                <span>Created: {moment(props.orgInfo.timeCreated).format('DD MMM YYYY')}</span>
            </Col>
            <Col span={4} className='btn-col'>
                <Button type='text'>
                    <Link to={`/orgs/${props.orgInfo.id}/manage`}>
                        <ToolOutlined />
                    </Link>
                </Button>

                <Button type='text'>
                    <Link to={`/orgs/${props.orgInfo.id}/stats`}>
                        <LineChartOutlined />
                    </Link>
                </Button>

                <Popconfirm
                    placement='top'
                    title='Are you sure you want to delete this organization?'
                    onConfirm={async () => await props.onDelete(props.orgInfo.id)}
                    icon={<ExclamationCircleFilled style={{ color: 'red' }} />}>
                    <Button danger type='text' icon={<DeleteOutlined />} />
                </Popconfirm>
            </Col>
        </Row >
    );
}

export class Orgs extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            showAll: false,
            orgs: [],
            createOrgFormVisible: false,
        };
    }

    async componentDidMount(): Promise<void> {
        await this.refreshOrgs();
    }

    async componentDidUpdate(_prevProps: Props, prevState: State): Promise<void> {
        if (prevState.showAll !== this.state.showAll) {
            await this.refreshOrgs();
        }
    }

    refreshOrgs = async (): Promise<void> => {
        await listOrgs(this.state.showAll ? 'all' : 'user')
            .then(orgs => this.setState({ orgs }));
    }

    onCreateOrg = async (name: string): Promise<void> => {
        await createOrg(name);
        this.setState({ createOrgFormVisible: false });
        await this.refreshOrgs();
    }

    onDeleteOrg = async (id: string): Promise<void> => {
        await deleteOrg(id);
        await this.refreshOrgs();
    }

    render(): React.ReactNode {
        const mayCreateOrg = this.props.userPrivileges.has('admin') || this.props.userPrivileges.has('facstaff');
        const isAdmin = this.props.userPrivileges.has('admin');
        return (
            <>
                <Row className='primary-row'>
                    <Col span={16}>
                        <span className='page-title'>Orgs</span>
                    </Col>

                    <Col span={8} className='btn-col'>
                        {!mayCreateOrg ? <></> :
                            <Dropdown
                                overlay={<CreateOrgForm onCreate={this.onCreateOrg} />}
                                visible={this.state.createOrgFormVisible}
                                onVisibleChange={flag => this.setState({ createOrgFormVisible: flag })}
                                placement='bottomRight'
                                trigger={['click']}>
                                <Button type='primary'><PlusCircleFilled /> Create an Org</Button>
                            </Dropdown>}

                        {!isAdmin ? <></> :
                            <Checkbox
                                defaultChecked={false}
                                onChange={(ev) => this.setState({ showAll: ev.target.checked })}>
                                Show all orgs?
                            </Checkbox>}
                    </Col>
                </Row>

                {this.state.orgs.map(org =>
                    <OrgRow
                        key={org.id}
                        showAll={this.state.showAll}
                        orgInfo={org}
                        onDelete={this.onDeleteOrg} />)}
            </>
        );
    }
}