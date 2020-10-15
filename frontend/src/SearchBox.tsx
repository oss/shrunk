import React, { useState } from 'react';
import { Form, Input, Button, Dropdown, Select, Radio, Checkbox } from 'antd';
import { SettingOutlined, SearchOutlined } from '@ant-design/icons';

export type SearchSet = { set: 'user' | 'all' } | { set: 'org', org: string };

export interface SearchQuery {
    query?: string;
    set: SearchSet;
    show_expired_links: boolean;
    show_deleted_links: boolean;
    sort: { key: string, order: string };
}

export interface Props {
    userPrivileges: Set<string>;
    userOrgNames: string[];
    setQuery: (newQuery: SearchQuery) => Promise<void>;
}

export const SearchBox: React.FC<Props> = (props) => {
    const isAdmin = props.userPrivileges.has('admin');
    const sortOptions = [
        { label: 'Ascending', value: 'ascending' },
        { label: 'Descending', value: 'descending' },
    ];

    const [dropdownVisible, setDropdownVisible] = useState(false);
    const [query, setQuery] = useState('');
    const [org, setOrg] = useState<number | string>(isAdmin ? 1 : 0);
    const [showExpired, setShowExpired] = useState(false);
    const [showDeleted, setShowDeleted] = useState(false);
    const [sortKey, setSortKey] = useState('created_time');
    const [sortOrder, setSortOrder] = useState('descending');

    const dropdown = (
        <div className='dropdown-form'>
            <Form layout='vertical' initialValues={{ org: isAdmin ? 1 : 0, sortKey: 'created_time', sortOrder: 'descending' }}>
                <Form.Item name='org' label='Organization'>
                    <Select value={org} onChange={setOrg}>
                        <Select.Option value={0}>
                            <em>My links</em>
                        </Select.Option>
                        {!isAdmin ? <></> :
                            <Select.Option value={1}>
                                <em>All links</em>
                            </Select.Option>}
                        {props.userOrgNames.map(name =>
                            <Select.Option key={name} value={name}>
                                {name}
                            </Select.Option>)}
                    </Select>
                </Form.Item>
                <Form.Item name='show_expired'>
                    <Checkbox checked={showExpired} onChange={e => setShowExpired(e.target.checked)}>
                        Show expired links?
                    </Checkbox>
                </Form.Item>
                {!isAdmin ? <></> :
                    <Form.Item name='show_deleted'>
                        <Checkbox checked={showDeleted} onChange={e => setShowDeleted(e.target.checked)}>
                            Show deleted links?
                    </Checkbox>
                    </Form.Item>}
                <Form.Item name='sortKey' label='Sort by'>
                    <Select value={sortKey} onChange={setSortKey}>
                        <Select.Option value='created_time'>
                            Time created
                        </Select.Option>
                        <Select.Option value='title'>
                            Title
                        </Select.Option>
                        <Select.Option value='visits'>
                            Number of visits
                        </Select.Option>
                    </Select>
                </Form.Item>
                <Form.Item name='sortOrder' label='Sort order'>
                    <Radio.Group
                        value={sortOrder}
                        onChange={e => setSortOrder(e.target.value)}
                        options={sortOptions}
                        optionType='button' />
                </Form.Item>
            </Form>
        </div>
    );

    const doSearch = async (): Promise<void> => {
        const searchSet: SearchSet = org === 0 ?
            { set: 'user' } :
            org === 1 ?
                { set: 'all' } :
                { set: 'org', org: org as string };

        const searchQuery: SearchQuery = {
            set: searchSet,
            show_expired_links: showExpired,
            show_deleted_links: showDeleted,
            sort: { key: sortKey, order: sortOrder },
        };

        if (query !== '') {
            searchQuery.query = query;
        }

        await props.setQuery(searchQuery);
    };

    return (
        <Form layout='inline'>
            <Input.Group compact>
                <Form.Item name='query'>
                    <Input placeholder='Search' value={query} onChange={e => setQuery(e.target.value)} />
                </Form.Item>
                <Form.Item>
                    <Dropdown
                        overlay={dropdown}
                        visible={dropdownVisible}
                        onVisibleChange={setDropdownVisible}
                        placement='bottomRight'
                        trigger={['click']}>
                        <Button icon={<SettingOutlined />} />
                    </Dropdown>
                </Form.Item>
                <Form.Item>
                    <Button icon={<SearchOutlined />} onClick={doSearch} />
                </Form.Item>
            </Input.Group>
        </Form>
    );
}
