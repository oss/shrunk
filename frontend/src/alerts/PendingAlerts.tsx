/**
 * Implements the [[PendingAlerts]] component
 * @packageDocumentation
 */

import React from 'react';
import { Modal, Button } from 'antd';

import { Orgsv2AlertNewUser, Orgsv2AlertCurrentUser } from './Orgsv2Alerts';

/**
 * Information required to display an alert box
 * @interface
 */
export interface Alert {
  /**
   * The title of the modal
   * @property
   */
  title: string;

  /**
   * The component to display in the modal's content area
   * @property
   */
  body: React.FunctionComponent<{ closePopup: () => Promise<void> }>;
}

/**
 * The registered alert types
 * @constant
 */
const ALERTS: Map<string, Alert> = new Map([
  ['orgsv2_newuser', Orgsv2AlertNewUser],
  ['orgsv2_currentuser', Orgsv2AlertCurrentUser],
]);

/**
 * Props for the [[PendingAlerts]] component
 * @interface
 */
export interface Props {
  /**
   * The user's NetID
   * @property
   */
  netid: string;

  /**
   * List of alert names to be displayed
   * @property
   */
  pendingAlerts: Array<string>;
}

/**
 * State for the [[PendingAlerts]] component
 * @interface
 */
interface State {
  /**
   * Number of alerts viewed so far.
   * @property
   */
  numberViewed: number;
}

/**
 * The [[PendingAlerts]] component implements a modal that displays
 * alerts to the user and marks these alerts as viewed on the server
 * @class
 */
export class PendingAlerts extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      numberViewed: 0,
    };
  }

  /**
   * Execute API request to mark an alert as viewed serverside, and update
   * the component state accordingly
   * @method
   * @param alertViewed The identifier of the alert viewed
   */
  nextAlert = async (alertViewed: string): Promise<void> => {
    if (this.props.pendingAlerts[this.state.numberViewed] !== alertViewed) {
      throw new Error('something went wrong');
    }

    await fetch(`/api/v1/alert/${this.props.netid}/${alertViewed}`, {
      method: 'PUT',
    });
    this.setState({ numberViewed: this.state.numberViewed + 1 });
  };

  render(): React.ReactNode {
    const currentAlertName = this.props.pendingAlerts[this.state.numberViewed];
    const currentAlert = ALERTS.get(currentAlertName);
    if (currentAlert === undefined) {
      return <></>;
    }

    const nextAlert = async () => this.nextAlert(currentAlertName);

    return (
      <Modal
        visible={this.state.numberViewed !== this.props.pendingAlerts.length}
        title={currentAlert.title}
        footer={[
          <Button key="ok" type="primary" onClick={nextAlert}>
            OK
          </Button>,
        ]}
        onCancel={nextAlert}
      >
        <currentAlert.body closePopup={nextAlert} />
      </Modal>
    );
  }
}
