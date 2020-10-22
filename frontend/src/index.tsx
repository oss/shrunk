/**
 * This is the entry point for the Shrunk SPA. It fetches the `shrunk_params`
 * cookie, decodes and parses it, and then renders the [[Shrunk]] component
 * @packageDocumentation
 */

import React from 'react';
import ReactDOM from 'react-dom';
import Cookies from 'js-cookie';

import { Shrunk } from './Shrunk';

/**
 * The parameters contained in the `shrunk_params` cookie.
 * @interface
 */
interface ShrunkParams {
    /**
     * The NetID of the user.
     * @property
     */
    netid: string;

    /**
     * A list of strings describing the user's privileges. Valid privileges are
     *   * `"admin"`
     *   * `"power_user"`
     *   * `"facstaff"`
     * @property
     */
    userPrivileges: Array<string>;
}

/**
 * Load the `shrunk_params` cookie, decode it from base64, and parse it as JSON.
 * @function
 * @throws Error if the `shrunk_params` cookie does not exist
 * @returns An object containing the SPA parameters
 */
const loadShrunkParams = () => {
    const cookie = Cookies.get('shrunk_params');
    if (cookie === undefined) {
        throw new Error('shrunk_params cookie not found');
    }
    const decoded = atob(cookie);
    return JSON.parse(decoded) as ShrunkParams;
}

const shrunkParams = loadShrunkParams();

ReactDOM.render(<Shrunk
    siderWidth={200}
    netid={shrunkParams.netid}
    userPrivileges={new Set(shrunkParams.userPrivileges)} />,
    document.getElementById('react'));
