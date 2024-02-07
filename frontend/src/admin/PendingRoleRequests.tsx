/**
 * Implement the [[PendingRoleRequests]] component to display the pending requests for a given role
 * @packageDocumentation
 */
import React, { Component } from 'react';

export interface Props {
    /**
     * The role name (The internal identifier, not the display name)
     * @property
     */
    name: string;
}

interface RoleRequestInfo {
    /**
     * The entity making the request
     * @property
     */
    entity: string;

    /**
     * The title of the entity
     * @property
     */

    /**
     * The time at which the request was made
     * @property
     */
    time_requested: Date;

}

export interface State {

}


export class PendingRoleRequests extends Component<Props> {
    render() {
        return (
            <div>
                <h1>{this.props.name}</h1>
            </div>
        );
    }
}
