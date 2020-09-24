import React from 'react';
import { Row, Col, Button, Popconfirm, Tooltip, Tag } from 'antd';
import { CopyFilled, DeleteOutlined, LineChartOutlined, EditOutlined, QrcodeOutlined, ExclamationCircleFilled } from '@ant-design/icons';
import CopyToClipboard from 'react-copy-to-clipboard';
import { Link } from 'react-router-dom';
import moment from 'moment';

import { LinkInfo } from './LinkInfo';
import './LinkRow.less';

export interface Props {
    linkInfo: LinkInfo;
    showEditModal: (linkInfo: LinkInfo) => void;
    showQrModal: (linkInfo: LinkInfo) => void;
    refreshResults: () => void;
}

export interface State { }

export class LinkRow extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {};
    }

    confirmDelete = async (): Promise<void> => {
        await fetch(`/api/v1/link/${this.props.linkInfo.id}`, { method: 'DELETE' });
        await this.props.refreshResults();
    }

    render(): React.ReactNode {
        const isLinkDeleted = this.props.linkInfo.deletion_info !== null;
        const isLinkExpired = this.props.linkInfo.is_expired;
        const titleClassName = isLinkDeleted || isLinkExpired ? 'title deleted' : 'title';

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
                    {isLinkDeleted ? <></> :
                        <Button type='text' icon={<EditOutlined />} onClick={_ev => this.props.showEditModal(this.props.linkInfo)} />}
                    <Button type='text'>
                        <Link to={`/stats/${this.props.linkInfo.id}`}>
                            <LineChartOutlined />
                        </Link>
                    </Button>
                    <Button type='text' icon={<QrcodeOutlined />} onClick={_ev => this.props.showQrModal(this.props.linkInfo)} />
                    {isLinkDeleted ? <></> :
                        <Popconfirm
                            placement='top'
                            title='Are you sure you want to delete this link?'
                            onConfirm={this.confirmDelete}
                            icon={<ExclamationCircleFilled style={{ color: 'red' }} />}>
                            <Button danger type='text' icon={<DeleteOutlined />} />
                        </Popconfirm>}
                </Col>
            </Row >
        );
    }
}
