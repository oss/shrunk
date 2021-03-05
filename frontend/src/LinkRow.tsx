/**
 * Implements the [[LinkRow]] component
 * @packageDocumentation
 */

import React from 'react';
import { Row, Col, Button, Popconfirm, Tooltip, Tag } from 'antd';
import { CopyFilled, DeleteOutlined, LineChartOutlined, EditOutlined, QrcodeOutlined, ExclamationCircleFilled, TeamOutlined } from '@ant-design/icons';
import CopyToClipboard from 'react-copy-to-clipboard';
import { Link } from 'react-router-dom';
import moment from 'moment';

import { LinkInfo } from './LinkInfo';
import './LinkRow.less';

/**
 * Props for the [[LinkRow]] component
 * @interface
 */
export interface Props {
    /**
     * [[LinkInfo]] of the link to display
     * @property
     */
    linkInfo: LinkInfo;

    /**
     * Callback called when the edit modal should be displayed
     * @property
     */
    showEditModal: (linkInfo: LinkInfo) => void;

    /**
     * Callback called when the QR modal should be displayed
     * @property
     */
    showQrModal: (linkInfo: LinkInfo) => void;

    /**
     * Callback called when the search results should be refreshed
     * (e.g. after link is updated)
     * @property
     */
    refreshResults: () => void;
}

/**
 * State for the [[LinkRow]] component
 * @interface
 */
export interface State { }

/**
 * The [[LinkRow]] component displays the information for a single link
 * on the dashboard. It provides buttons for editing and deleting the link,
 * and viewing link stats or QR codes
 * @class
 */
export class LinkRow extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {};
    }

    /**
     * Execute API requests to delete the link, then refresh search results
     * @method
     */
    confirmDelete = async (): Promise<void> => {
        // Delete link
        await fetch(`/api/v1/link/${this.props.linkInfo.id}`, { method: 'DELETE' });
        
        // Delete alias link
        var alias_name;
        {this.props.linkInfo.aliases.map(alias => { alias_name = `${alias.alias}`;})}
        await fetch(`/api/v1/link/${this.props.linkInfo.id}/alias/${alias_name}`, { method: 'DELETE' });

        await this.props.refreshResults();
    }

    requestEditAccess = async (): Promise<void> => {
        await fetch(`/api/v1/link/${this.props.linkInfo.id}/request_edit_access`, { method: 'POST' });
    }

    render(): React.ReactNode {
        const isLinkDeleted = this.props.linkInfo.deletion_info !== null;
        const isLinkExpired = this.props.linkInfo.is_expired;
        const titleClassName = isLinkDeleted || isLinkExpired ? 'title deleted' : 'title';

        console.log(this.props.linkInfo.may_edit);

        return (
            <Row className='primary-row' style={{ alignItems: 'center' }}>
                <Col span={20}>
                    <Row>
                        <Col span={24}>
                            <span className={titleClassName}>
                                {this.props.linkInfo.title}
                            </span>

                            {isLinkDeleted ? <Tag color='red'>Deleted</Tag> : <></>}
                            {isLinkExpired ? <Tag color='gray'>Expired</Tag> : <></>}
                            {!this.props.linkInfo.may_edit ? <Tag color='gray'>View-only</Tag> : <></>}

                            <span className='info'>
                                Owner: {this.props.linkInfo.owner}
                            </span>

                            <span className='info'>
                                Visits: {this.props.linkInfo.visits}
                            </span>

                            <span className='info'>
                                Unique visits: {this.props.linkInfo.unique_visits}
                            </span>

                            {this.props.linkInfo.expiration_time === null ? <></> :
                                <span className='info'>
                                    Expires: {moment(this.props.linkInfo.expiration_time).format('DD MMM YYYY')}
                                </span>}

                            <span className='info'>
                                Created: {moment(this.props.linkInfo.created_time).format('DD MMM YYYY')}
                            </span>
                        </Col>
                    </Row>
                    {this.props.linkInfo.aliases.map(alias => {
                        const short_url = `https://${document.location.host}/${alias.alias}`;
                        const className = (isLinkDeleted || isLinkExpired || alias.deleted) ? 'alias deleted' : 'alias';
                        return (
                            <Row key={alias.alias}>
                                <Col>
                                    <div className={className}>
                                        <CopyToClipboard text={short_url}>
                                            <Tooltip title='Copy shortened URL.'>
                                                <Button type='text' icon={<CopyFilled />} />
                                            </Tooltip>
                                        </CopyToClipboard>
                                        {alias.description ? <em>({alias.description})</em> : ''}&nbsp;
                                        <a href={short_url}>{short_url}</a>
                                        &rarr;
                                        <a href={this.props.linkInfo.long_url}>{this.props.linkInfo.long_url}</a>
                                    </div>
                                </Col>
                            </Row>
                        );
                    })}
                </Col>

                <Col span={4} className='btn-col'>
                    {isLinkDeleted || !this.props.linkInfo.may_edit ? <></> :
                        <Button type='text' icon={<EditOutlined />} onClick={_ev => this.props.showEditModal(this.props.linkInfo)} />}
                    <Button type='text'>
                        <Link to={`/stats/${this.props.linkInfo.id}`}>
                            <LineChartOutlined />
                        </Link>
                    </Button>
                    <Button type='text' icon={<QrcodeOutlined />} onClick={_ev => this.props.showQrModal(this.props.linkInfo)} />
                    {isLinkDeleted || !this.props.linkInfo.may_edit ? <></> :
                        <Popconfirm
                            placement='top'
                            title='Are you sure you want to delete this link?'
                            onConfirm={this.confirmDelete}
                            icon={<ExclamationCircleFilled style={{ color: 'red' }} />}>
                            <Button danger type='text' icon={<DeleteOutlined />} />
                        </Popconfirm>}
                    {this.props.linkInfo.may_edit ? <></> :
                        <Popconfirm
                            placement='top'
                            title='Request access to edit this link?'
                            onConfirm={this.requestEditAccess}>
                            <Tooltip title='Request edit access'>
                                <Button type='text' icon={<TeamOutlined />} />
                            </Tooltip>
                        </Popconfirm>
                    }
                </Col>
            </Row >
        );
    }
}
