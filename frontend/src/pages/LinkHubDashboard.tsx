/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';

async function searchLinkHubs(netid: string) {
  const resp = await fetch(`/api/v1/linkhub/netid/${netid}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await resp.json();

  return result.results;
}

interface ILinkHubDashboard {
  netid: string;
}

// Leadership has requested that only one user can own one LinkHub.

export default function LinkHubDashboard(props: ILinkHubDashboard) {
  const history = useHistory();

  const [linkHubs, setLinkHubs] = useState<any[]>([]);

  useEffect(() => {
    searchLinkHubs(props.netid).then((value: any) => {
      setLinkHubs(value);
    });
  }, []);

  async function createLinkHub(): Promise<any> {
    const result = await fetch('/api/v1/linkhub', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Untitled LinkHub',
      }),
    }).then((resp) => resp.json());
    history.push(`/app/linkhubs/${result.id}/edit`);
  }

  searchLinkHubs(props.netid).then((value) => {
    if (value.length === 0) {
      createLinkHub();
    } else {
      history.push(`/app/linkhubs/${value[0]._id}/edit`);
    }
  });

  return <></>;
}
