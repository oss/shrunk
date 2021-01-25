import React from 'react';
import { Modal, Button } from 'antd';

import { Orgsv2AlertNewUser, Orgsv2AlertCurrentUser } from './Orgsv2Alerts';

export interface Alert {
    title: string;
    body: React.FunctionComponent<{ closePopup: () => Promise<void> }>;
}

const ALERTS: Map<string, Alert> = new Map([
    ['orgsv2_newuser', Orgsv2AlertNewUser],
    ['orgsv2_currentuser', Orgsv2AlertCurrentUser],
]);

export interface Props {
    netid: string;
    pendingAlerts: Array<string>;
}

interface State {
    numberViewed: number;
}

export class PendingAlerts extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            numberViewed: 0,
        };
    }

    nextAlert = async (alertViewed: string): Promise<void> => {
        if (this.props.pendingAlerts[this.state.numberViewed] !== alertViewed) {
            throw new Error('something went wrong');
        }

        await fetch(`/api/v1/alert/${this.props.netid}/${alertViewed}`, { method: 'PUT' });
        this.setState({ numberViewed: this.state.numberViewed + 1 });
    }

    render(): React.ReactNode {
        const currentAlertName = this.props.pendingAlerts[this.state.numberViewed];
        const currentAlert = ALERTS.get(currentAlertName);
        if (currentAlert === undefined) {
            return (<></>);
        }

        const nextAlert = async () => this.nextAlert(currentAlertName);

        return (
            <Modal
                visible={this.state.numberViewed !== this.props.pendingAlerts.length}
                title={currentAlert.title}
                footer={[
                    <Button key='ok' type='primary' onClick={nextAlert}>
                        OK
                    </Button>,
                ]}
                onCancel={nextAlert}>
                <currentAlert.body closePopup={nextAlert} />
            </Modal>
        );
    }
}
