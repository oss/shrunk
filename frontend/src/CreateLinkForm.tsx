/**
 * Implements the [[CreateLinkForm]] component.
 * @packageDocumentation
 */

import React from 'react';
import moment from 'moment';
import { Form, Input, Button, DatePicker, Space, Tooltip } from 'antd';
import { LinkOutlined, MinusCircleOutlined, PlusOutlined, QuestionCircleOutlined } from '@ant-design/icons';

import { serverValidateAlias, serverValidateLongUrl } from './Validators';
import './Base.less';
import './FixAliasRemoveButton.less';

/**
 * Displays a label with the text "Alias" and a tooltip with extended help text
 * @param _props Props
 */
const AliasLabel: React.FC = (_props) => {
    const aliasHelp = `
        You are now able to create multiple aliases for each shortened URL. For example, you may
        create distinct aliases for Twitter and Facebook if you wish to track the number of impressions
        from each platform. Each alias may have an optional description to help you keep track.`;
    return (
        <Tooltip title={aliasHelp}>
            Alias <QuestionCircleOutlined />
        </Tooltip>
    );
}

/**
 * The final values of the create link form
 * @interface
 */
interface CreateLinkFormValues {
    /**
     * The link title
     * @property
     */
    title: string;

    /**
     * The long URL
     * @property
     */
    long_url: string;

    /**
     * The expiration time. Absent if the link has no expiration time
     * @property
     */
    expiration_time?: moment.Moment;

    /**
     * The link's aliases. The `alias` field of an array element is absent
     * if the alias should be generated randomly by the server
     * @property
     */
    aliases: { alias?: string, description: string }[];
}

/**
 * Props for the [[CreateLinkForm]] component
 * @interface
 */
export interface Props {
    /** The user's privileges. Used to determine whether the user is allowed
     * to set custom aliases
     * @property
     */
    userPrivileges: Set<string>;

    /**
     * Callback called after the user submits the form and the new link is created
     * @property
     */
    onFinish: () => Promise<void>;
}

/**
 * State for the [[CreateLinkForm]] component
 * @interface
 */
interface State { }

/**
 * The [[CreateLinkForm]] component allows the user to create a new link
 * @class
 */
export class CreateLinkForm extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {};
    }

    /**
     * Executes API requests to create a new link and then calls the `onFinish` callback
     * @param values The values from the form
     */
    createLink = async (values: CreateLinkFormValues): Promise<void> => {
        const create_link_req: Record<string, string> = {
            title: values.title,
            long_url: values.long_url,
        };

        if (values.expiration_time !== undefined) {
            create_link_req.expiration_time = values.expiration_time.format();
        }

        const create_link_resp = await fetch('/api/v1/link', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(create_link_req),
        }).then(resp => resp.json());

        const link_id: string = create_link_resp.id;

        await Promise.all(values.aliases.map(async (alias) => {
            const create_alias_req: any = { description: alias.description };
            if (alias.alias !== undefined) {
                create_alias_req.alias = alias.alias;
            }

            await fetch(`/api/v1/link/${link_id}/alias`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(create_alias_req),
            });
        }));

        await this.props.onFinish();
    }

    render(): React.ReactNode {
        const initialValues = { aliases: [{ description: '' }] };
        const mayUseCustomAliases = this.props.userPrivileges.has('power_user') || this.props.userPrivileges.has('admin');
        return (
            <div className='dropdown-form'>
                <Form layout='vertical' initialValues={initialValues} onFinish={this.createLink}>
                    <Form.Item
                        label='Title'
                        name='title'
                        rules={[{ required: true, message: 'Please input a title.' }]}>
                        <Input placeholder='Title' />
                    </Form.Item>

                    <Form.Item
                        label='Long URL'
                        name='long_url'
                        rules={[
                            { required: true, message: 'Please input a URL.' },
                            { type: 'url', message: 'Please enter a valid URL.' },
                            { validator: serverValidateLongUrl },
                        ]}>
                        <Input placeholder='Long URL' prefix={<LinkOutlined />} />
                    </Form.Item>

                    <Form.Item label='Expiration time' name='expiration_time'>
                        <DatePicker
                            format='YYYY-MM-DD HH:mm:ss'
                            disabledDate={current => current && current < moment().startOf('day')}
                            showTime={{ defaultValue: moment() }} />
                    </Form.Item>

                    <Form.List name='aliases'>
                        {(fields, { add, remove }) => (
                            <div className='fix-alias-remove-button'>
                                {fields.map((field, index) => (
                                    <Space key={field.key} style={{ display: 'flex', marginBottom: 8 }} align='start'>
                                        {!mayUseCustomAliases ? <></> :
                                            <Form.Item
                                                label={index === 0 ? <AliasLabel /> : ''}
                                                name={[field.name, 'alias']}
                                                fieldKey={field.fieldKey}
                                                rules={[
                                                    { min: 5, message: 'Alias may be no shorter than 5 characters.' },
                                                    { max: 60, message: 'Alias may be no longer than 60 characters.' },
                                                    {
                                                        pattern: /^[a-zA-Z0-9_.,-]*$/,
                                                        message: 'Alias may consist only of numbers, letters, and the punctuation marks “.,-_”.',
                                                    },
                                                    { validator: serverValidateAlias },
                                                ]}>
                                                <Input placeholder='Alias' />
                                            </Form.Item>}

                                        <Form.Item
                                            label={index === 0 ? (!mayUseCustomAliases ? <AliasLabel /> : 'Description') : ''}
                                            name={[field.name, 'description']}
                                            fieldKey={field.fieldKey}>
                                            <Input placeholder='Description' />
                                        </Form.Item>

                                        <Button
                                            disabled={fields.length === 1}
                                            type='text'
                                            icon={<MinusCircleOutlined />}
                                            onClick={() => remove(field.name)} />
                                    </Space>
                                ))}

                                <Form.Item>
                                    <Button block type='dashed' onClick={add}>
                                        <PlusOutlined /> Add an alias
                                    </Button>
                                </Form.Item>
                            </div>
                        )}
                    </Form.List>

                    <Form.Item>
                        <Button type='primary' htmlType='submit' style={{ width: '100%' }}>Shrink!</Button>
                    </Form.Item>
                </Form>
            </div>
        );
    }
}
