import React from 'react';
import { Row, Col, Spin, Button, Popconfirm, Form, Input } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';
import base32 from 'hi-base32';

export interface Props {
    userPrivileges: Set<string>;
    name: string;
}

interface RoleText {
    title: string;
    invalid: string;
    grant_title: string;
    grantee_text: string;
    grant_button: string;
    revoke_title: string;
    revoke_button: string;
    empty: string;
    granted_by: string;
    allow_comment: boolean;
    comment_prompt: string;
}

interface EntityInfo {
    entity: string;
    granted_by: string;
    comment: string | null;
}

const GrantForm: React.FC<{
    role: string,
    roleText: RoleText,
    onCreate: (entity: string, comment: string) => Promise<void>,
}> = (props) => {
    const [form] = Form.useForm();
    const serverValidateEntity = async (_rule: any, value: string): Promise<void> => {
        if (!value) {
            return;
        }
        const entity = base32.encode(value);
        const result = await fetch(`/api/v1/role/${props.role}/validate_entity/${entity}`)
            .then(resp => resp.json());
        if (!result.valid) {
            throw new Error(result.reason);
        }
    };
    const onFinish = async (values: { entity: string, comment?: string }): Promise<void> => {
        const comment = values.comment ? values.comment : '';
        await props.onCreate(values.entity, comment);
        form.resetFields();
    };
    return (
        <Form form={form} layout='vertical' onFinish={onFinish}>
            {!props.roleText.allow_comment ? <></> :
                <Form.Item
                    name='comment'
                    rules={[{ required: true, message: 'Please enter a comment.' }]}>
                    <Input.TextArea rows={4} placeholder={props.roleText.comment_prompt} />
                </Form.Item>}

            <Input.Group compact>
                <Form.Item
                    name='entity'
                    rules={[
                        { required: true, message: 'Please enter a value.' },
                        { validator: serverValidateEntity }]}>
                    <Input placeholder={props.roleText.grantee_text} />
                </Form.Item>

                <Form.Item>
                    <Button type='primary' htmlType='submit'>
                        {props.roleText.grant_button}
                    </Button>
                </Form.Item>
            </Input.Group>
        </Form>
    );
}

const EntityRow: React.FC<{
    roleText: RoleText,
    info: EntityInfo,
    onRevoke: (entity: string) => Promise<void>,
}> = (props) => {
    return (
        <Row className='primary-row' >
            <Col span={20}>
                <Row>
                    <Col span={24}>
                        <span className='title'>{props.info.entity}</span>
                    </Col>
                </Row>
                <Row>
                    <Col span={24}>
                        <span><em>{props.roleText.granted_by}:</em>&nbsp;{props.info.granted_by}</span>
                    </Col>
                </Row>
                {props.info.comment === null || props.info.comment === '' ? <></> :
                    <Row>
                        <Col span={24}>
                            <span><em>Comment:</em>&nbsp;{props.info.comment}</span>
                        </Col>
                    </Row>}
            </Col>
            <Col span={4} className='btn-col'>
                <Popconfirm
                    placement='top'
                    title='Are you sure?'
                    onConfirm={async () => await props.onRevoke(props.info.entity)}
                    icon={<ExclamationCircleFilled style={{ color: 'red' }} />}>
                    <Button danger>
                        {props.roleText.revoke_button}
                    </Button>
                </Popconfirm>
            </Col>
        </Row >
    );
}

interface State {
    hasPermission: boolean;
    roleText: RoleText | null;
    entities: EntityInfo[] | null;
}

export class Role extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasPermission: true,
            roleText: null,
            entities: null,
        };
    }

    async componentDidMount(): Promise<void> {
        this.updateHasPermission();
        await this.updateRoleInfo();
    }

    async componentDidUpdate(prevProps: Props): Promise<void> {
        if (prevProps !== this.props) {
            this.updateHasPermission();
            await this.updateRoleInfo();
        }
    }

    updateHasPermission = (): void => {
        let hasPermission = false;

        if (this.props.name === 'whitelisted' && this.props.userPrivileges.has('facstaff')) {
            hasPermission = true;
        }

        if (this.props.userPrivileges.has('admin')) {
            hasPermission = true;
        }

        this.setState({ hasPermission });
    }

    updateRoleInfo = async (): Promise<void> => {
        const updateText = this.updateRoleText();
        const updateEntities = this.updateRoleEntities();
        await Promise.all([updateText, updateEntities]);
    }

    updateRoleText = async (): Promise<void> => {
        const result = await fetch(`/api/v1/role/${this.props.name}/text`).then(resp => resp.json());
        this.setState({ roleText: result['text'] as RoleText });
    }

    updateRoleEntities = async (): Promise<void> => {
        const result = await fetch(`/api/v1/role/${this.props.name}/entity`).then(resp => resp.json());
        this.setState({ entities: result['entities'] as EntityInfo[] });
    }

    onGrant = async (entity: string, comment: string): Promise<void> => {
        const encodedEntity = base32.encode(entity);
        await fetch(`/api/v1/role/${this.props.name}/entity/${encodedEntity}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comment }),
        });
        await this.updateRoleEntities();
    }

    onRevoke = async (entity: string): Promise<void> => {
        const encodedEntity = base32.encode(entity);
        await fetch(`/api/v1/role/${this.props.name}/entity/${encodedEntity}`, { method: 'DELETE' });
        await this.updateRoleEntities();
    }

    render(): React.ReactNode {
        if (!this.state.hasPermission) {
            return (
                <Row className='primary-row'>
                    <Col span={24}>
                        <span className='page-title'>
                            You do not have permission to edit this role.
                        </span>
                    </Col>
                </Row>
            );
        }

        if (this.state.roleText === null) {
            return (<Spin size='large' />);
        }

        return (
            <>
                <Row className='primary-row'>
                    <Col span={24}>
                        <span className='page-title'>
                            {this.state.roleText.grant_title}
                        </span>
                    </Col>
                </Row>

                <Row className='primary-row'>
                    <Col span={24}>
                        <GrantForm
                            role={this.props.name}
                            roleText={this.state.roleText}
                            onCreate={this.onGrant} />
                    </Col>
                </Row>

                {this.state.entities === null ? <Spin size='large' /> :
                    this.state.entities.map(entity =>
                        <EntityRow
                            key={entity.entity}
                            roleText={this.state.roleText!}
                            info={entity}
                            onRevoke={this.onRevoke} />)}
            </>
        );
    }
}
