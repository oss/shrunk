/**
 * Implements the [[PendingAlerts]] component
 * @packageDocumentation
 */

import React from 'react';
import { Modal, Button } from 'antd/lib';
import { Link } from 'react-router-dom';

/**
 * Alert regarding Orgsv2 shown to a user who is _not_ yet a member of any organizations.
 * @param props The props
 */
const NewUser: React.FC<{ closePopup: () => Promise<void> }> = (props) => (
  // TODO fill this out once all the Orgsv2 features are finalized
  <>
    <p>You can do so with an organization.</p>
    Head to the{' '}
    <Link onClick={async (_ev) => props.closePopup()} to="/orgs">
      Orgs
    </Link>{' '}
    page to check it out!
  </>
);

export const Orgsv2AlertNewUser: Alert = {
  title: 'Want to share specific links with a group?',
  body: NewUser,
};

/**
 * Alert regarding Orgsv2 shown to a user who _is_ a member of some organization.
 * @param props The props
 */
const CurrentUser: React.FC<{ closePopup: () => Promise<void> }> = (props) => (
  // TODO fill this out once all the Orgsv2 features are finalized
  <>
    You can now
    <ul>
      <li>share a specific link with an organization</li>
      <li>share a specific link with a single user</li>
      <li>request access to a link from the link&apos;s owner</li>
      <li>use go.rutgers.edu on mobile</li>
    </ul>
    Head to the{' '}
    <Link onClick={async (_ev) => props.closePopup()} to="/orgs">
      Orgs
    </Link>{' '}
    page to check it out!
  </>
);

export const Orgsv2AlertCurrentUser: Alert = {
  title: 'Updates to organizations feature',
  body: CurrentUser,
};

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
        open={this.state.numberViewed !== this.props.pendingAlerts.length}
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
