/**
 * Implements the [[Orgsv2AlertNewUser]] and [[Orgsv2AlertCurrentUser]] components.
 * @packageDocumentation
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Alert } from './PendingAlerts';

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
  title: 'Want to share certain links with a group?',
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
    </ul>
    head to the{' '}
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
