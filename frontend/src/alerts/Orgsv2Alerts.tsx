import React from 'react';
import { Link } from 'react-router-dom';

import { Alert } from './PendingAlerts';

const NewUser: React.FC<{ closePopup: () => Promise<void> }> = (props) => {
    return (
        <>
            <p>Put some explanation here</p>
            Head to the <Link onClick={async (_ev) => await props.closePopup()} to='/orgs'>Orgs</Link> page to check it out!
        </>
    );
}

export const Orgsv2AlertNewUser: Alert = {
    title: 'Want to create an organziation?',
    body: NewUser,
};

const CurrentUser: React.FC<{ closePopup: () => Promise<void> }> = (props) => {
    return (
        <>
            You can now
            <ul>
                <li>choose which links are shared with an organization</li>
                <li>share a link with a single user</li>
                <li>request access to a link from the link's owner</li>
            </ul>
            head to the <Link onClick={async (_ev) => await props.closePopup()} to='/orgs'>Orgs</Link> page to check it out!
        </>
    );
}

export const Orgsv2AlertCurrentUser: Alert = {
    title: 'Updates to organizations feature',
    body: CurrentUser,
};
