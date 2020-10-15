import React from 'react';
import { Row, Col, Pagination, Spin, Dropdown, Button } from 'antd';
import { PlusCircleFilled } from '@ant-design/icons';

import { listOrgs } from './api/Org';
import { SearchQuery, SearchBox } from './SearchBox';
import { LinkRow } from './LinkRow';
import { LinkInfo } from './LinkInfo';
import { QrCodeModal } from './QrCode';
import { EditLinkModal, EditLinkFormValues } from './EditLinkModal';
import { CreateLinkForm } from './CreateLinkForm';
import './Dashboard.less';

export interface Props {
    userPrivileges: Set<string>;
}

export interface State {
    userOrgNames: string[] | null;

    linkInfo: LinkInfo[] | null;
    linksPerPage: number;

    query: SearchQuery | null;
    // Our position in the search results in terms of pages (used for pagination). Starts from 1.
    currentPage: number;
    totalPages: number;
    // Our position in the search results in terms of links (used for searching)
    currentOffset: number;
    totalLinks: number;

    editModalState: { visible: boolean, linkInfo: LinkInfo | null };
    qrModalState: { visible: boolean, linkInfo: LinkInfo | null };

    createLinkDropdownVisible: boolean;
}

export class Dashboard extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            userOrgNames: null,
            linkInfo: null,
            linksPerPage: 10,
            query: {
                set: { set: this.props.userPrivileges.has('admin') ? 'all' : 'user' },
                show_expired_links: false,
                show_deleted_links: false,
                sort: { key: 'created_time', order: 'descending' },
            },
            totalPages: 0,
            totalLinks: 0,
            currentPage: 1,
            currentOffset: 0,
            editModalState: {
                visible: false,
                linkInfo: null,
            },
            qrModalState: {
                visible: false,
                linkInfo: null,
            },
            createLinkDropdownVisible: false,
        };
    }

    async componentDidMount(): Promise<void> {
        await Promise.all([this.fetchUserOrgs(), this.refreshResults()]);
    }

    fetchUserOrgs = async (): Promise<void> => {
        const orgs = await listOrgs('user');
        this.setState({ userOrgNames: orgs.map(org => org.name) });
    }

    setQuery = async (newQuery: SearchQuery): Promise<void> => {
        const results = await this.doQuery(newQuery, 0, this.state.linksPerPage);
        const totalPages = Math.ceil(results.count / this.state.linksPerPage);
        this.setState({
            linkInfo: results.results,
            query: newQuery,
            currentPage: 1,
            totalPages,
            currentOffset: this.state.linksPerPage,
            totalLinks: results.count,
        });
    }

    doQuery = async (query: SearchQuery, skip: number, limit: number): Promise<{ count: number, results: LinkInfo[] }> => {
        const result = await fetch('/api/v1/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: query.query,
                set: query.set,
                show_expired_links: query.show_expired_links,
                show_deleted_links: query.show_deleted_links,
                sort: query.sort,
                pagination: { skip, limit },
            }),
        }).then(resp => resp.json());
        return {
            count: result.count,
            results: result.results.map((result: any) => ({
                ...result,
                created_time: new Date(result.created_time),
                expiration_time: !result.expiration_time ? null : new Date(result.expiration_time),
                deletion_info: !result.deletion_info ? null : {
                    deleted_by: result.deletion_info.deleted_by,
                    deleted_time: new Date(result.deletion_info.deleted_time),
                },
            }) as LinkInfo),
        };
    }

    setPage = async (newPage: number): Promise<void> => {
        if (this.state.query === null) {
            throw new Error('attempted to set page with this.state.query === null');
        }

        const skip = (newPage - 1) * this.state.linksPerPage;
        const results = await this.doQuery(this.state.query, skip, this.state.linksPerPage);
        const totalPages = Math.ceil(results.count / this.state.linksPerPage);
        this.setState({
            linkInfo: results.results,
            currentPage: newPage,
            totalPages,
            currentOffset: newPage * this.state.linksPerPage,
            totalLinks: results.count,
        });
    }

    refreshResults = async (): Promise<void> => {
        await this.setPage(this.state.currentPage);
    }

    showEditModal = (linkInfo: LinkInfo): void => {
        this.setState({
            editModalState: {
                visible: true,
                linkInfo,
            },
        });
    }

    hideEditModal = (): void => {
        this.setState({
            editModalState: {
                ...this.state.editModalState,
                visible: false,
            },
        });

        setTimeout(() => {
            this.setState({
                editModalState: {
                    ...this.state.editModalState,
                    linkInfo: null,
                },
            })
        }, 500);
    }

    showQrModal = (linkInfo: LinkInfo): void => {
        this.setState({
            qrModalState: {
                visible: true,
                linkInfo,
            },
        });
    }

    hideQrModal = (): void => {
        this.setState({
            qrModalState: {
                ...this.state.qrModalState,
                visible: false,
            },
        });

        setTimeout(() => {
            this.setState({
                qrModalState: {
                    ...this.state.qrModalState,
                    linkInfo: null,
                },
            })
        }, 500);
    }

    doEditLink = async (values: EditLinkFormValues): Promise<void> => {
        const oldLinkInfo = this.state.editModalState.linkInfo;
        if (oldLinkInfo === null) {
            throw new Error('oldLinkInfo should not be null')
        }

        // Create the request to edit title, long_url, and expiration_time
        const patch_req: Record<string, any> = {};
        if (values.title !== oldLinkInfo.title) {
            patch_req.title = values.title;
        }
        if (values.long_url !== oldLinkInfo.long_url) {
            patch_req.long_url = values.long_url;
        }
        if (values.expiration_time !== oldLinkInfo.expiration_time) {
            patch_req.expiration_time = values.expiration_time === null ? null :
                values.expiration_time.format();
        }

        const promises = [];

        promises.push(fetch(`/api/v1/link/${oldLinkInfo.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch_req),
        }));

        const oldAliases = new Map(oldLinkInfo.aliases.map(alias => [alias.alias, alias]));
        const newAliases = new Map(values.aliases.map(alias => [alias.alias, alias]));

        // Delete aliases that no longer exist
        for (const alias of oldAliases.keys()) {
            if (!newAliases.has(alias)) {
                promises.push(fetch(`/api/v1/link/${oldLinkInfo.id}/alias/${alias}`, { method: 'DELETE' }));
            }
        }

        // Create/update aliases
        for (const [alias, info] of newAliases.entries()) {
            const isNew = !oldAliases.has(alias);
            const isDescriptionChanged = oldAliases.has(alias) && info.description !== oldAliases.get(alias)?.description;
            if (isNew || isDescriptionChanged) {
                promises.push(fetch(`/api/v1/link/${oldLinkInfo.id}/alias`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        alias,
                        description: info.description,
                    }),
                }));
            }
        }

        // Await all the requests and refresh search results
        await Promise.all(promises);
        await this.refreshResults();
    }

    render(): React.ReactNode {
        return (
            <>
                <Row className='primary-row'>
                    <Col span={4}>
                        <span className='page-title'>Dashboard</span>
                    </Col>

                    <Col span={16} className='vertical-center-col'>
                        {this.state.userOrgNames === null ? <></> :
                            <SearchBox
                                userPrivileges={this.props.userPrivileges}
                                userOrgNames={this.state.userOrgNames}
                                setQuery={this.setQuery} />}
                    </Col>

                    <Col span={4} className='btn-col'>
                        <Dropdown
                            overlay={<CreateLinkForm
                                userPrivileges={this.props.userPrivileges}
                                onFinish={async () => {
                                    this.setState({ createLinkDropdownVisible: false });
                                    await this.refreshResults();
                                }} />}
                            visible={this.state.createLinkDropdownVisible}
                            onVisibleChange={flag => this.setState({ createLinkDropdownVisible: flag })}
                            placement='bottomRight'
                            trigger={['click']}>
                            <Button type='primary'><PlusCircleFilled /> Shrink a Link</Button>
                        </Dropdown>
                    </Col>
                </Row>

                {this.state.linkInfo === null ? <Spin size='large' /> :
                    <div className='dashboard-links'>
                        {this.state.linkInfo.map(linkInfo =>
                            <LinkRow
                                key={linkInfo.id}
                                linkInfo={linkInfo}
                                showEditModal={this.showEditModal}
                                showQrModal={this.showQrModal}
                                refreshResults={this.refreshResults} />)}

                        <Pagination
                            className='pagination'
                            defaultCurrent={1}
                            current={this.state.currentPage}
                            showSizeChanger={false}
                            total={this.state.totalLinks}
                            onChange={this.setPage} />
                    </div>}

                {this.state.editModalState.linkInfo === null ? <></> :
                    <EditLinkModal
                        visible={this.state.editModalState.visible}
                        userPrivileges={this.props.userPrivileges}
                        linkInfo={this.state.editModalState.linkInfo}
                        onOk={async (values) => { await this.doEditLink(values); this.hideEditModal(); }}
                        onCancel={this.hideEditModal} />}

                {this.state.qrModalState.linkInfo === null ? <></> :
                    <QrCodeModal
                        visible={this.state.qrModalState.visible}
                        width={256}
                        linkInfo={this.state.qrModalState.linkInfo}
                        onCancel={this.hideQrModal} />}
            </>
        );
    }
}
