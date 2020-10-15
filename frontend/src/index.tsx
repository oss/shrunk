import React from 'react';
import ReactDOM from 'react-dom';
import Cookies from 'js-cookie';

import { Shrunk } from './Shrunk';

interface ShrunkParams {
    netid: string;
    userPrivileges: Array<string>;
}

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
