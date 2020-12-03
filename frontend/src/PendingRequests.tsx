import React from 'react';
import { Row, Col, Modal, Button } from 'antd';
import moment from 'moment';

import './Base.less';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';

export interface PendingRequest {
    link_id: string;
    title: string;
    request_token: string;
    requesting_netid: string;
    request_time: Date;
}

const PendingRequestRow: React.FC<{
    singletonRow: boolean,
    request: PendingRequest,
    onAccept: (request_token: string) => Promise<void>,
    onDeny: (request_token: string) => Promise<void>,
}> = (props) => {
    const request = props.request;
    return (
        <Row className={props.singletonRow ? '' : 'primary-row'}>
            <Col span={20}>
                <Row>
                    <Col>
                        <span style={{ fontWeight: 'bold' }}>{request.requesting_netid}</span> has requested access to edit &ldquo;{request.title}&rdquo;
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <span style={{
                            fontVariantCaps: 'small-caps',
                            fontVariantNumeric: 'oldstyle-nums',
                            fontSize: 'small',
                            color: 'gray',
                        }}>
                            Requested at {moment(request.request_time).format('D MMMM YYYY, h:mm a')}
                        </span>
                    </Col>
                </Row>
            </Col>
            <Col span={4} className='btn-col'>
                <Button
                    type='text'
                    icon={<CheckOutlined />}
                    onClick={async (_ev) => await props.onAccept(request.request_token)} />
                <Button
                    danger
                    type='text'
                    icon={<CloseOutlined />}
                    onClick={async (_ev) => await props.onDeny(request.request_token)} />
            </Col>
        </Row>
    );
}

export interface Props { }

interface State {
    pendingRequests: Array<PendingRequest> | null;
    hidden: boolean;
}

export class PendingRequests extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            pendingRequests: null,
            hidden: false,
        };
    }

    async componentDidMount(): Promise<void> {
        await this.updatePendingRequests();
    }

    updatePendingRequests = async (): Promise<void> => {
        const pendingRequests = await fetch('/api/v1/request/pending')
            .then(resp => resp.json());
        this.setState({
            pendingRequests: pendingRequests['requests'].map((req: any) => ({
                ...req,
                request_time: new Date(req.request_time),
            })),
        });
    }

    acceptRequest = async (request_token: string): Promise<void> => {
        await fetch(`/api/v1/request/resolve/${request_token}/accept`);
        await this.updatePendingRequests();
    }

    denyRequest = async (request_token: string): Promise<void> => {
        await fetch(`/api/v1/request/resolve/${request_token}/deny`);
        await this.updatePendingRequests();
    }

    render(): React.ReactNode {
        if (this.state.pendingRequests === null) {
            return (<></>);
        }

        return (
            <Modal
                visible={!this.state.hidden && this.state.pendingRequests.length > 0}
                title='You have pending access requests'
                footer={null}
                onCancel={() => this.setState({ hidden: true })}>
                {this.state.pendingRequests.map(request =>
                    <PendingRequestRow
                        singletonRow={this.state.pendingRequests!.length === 1}
                        key={request.request_token}
                        request={request}
                        onAccept={this.acceptRequest}
                        onDeny={this.denyRequest}
                    />)}
            </Modal>
        );
    }
}
