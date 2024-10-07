import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import './Dashboard.css';
import { SearchBox } from '../components/SearchBox';
import LinkHubRow from '../components/LinkHubRow';

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
    history.push(`/linkhubs/${result.id}/edit`);
  }

  searchLinkHubs(props.netid).then((value) => {
    if (value.length === 0) {
      createLinkHub();
    } else {
      history.push(`/linkhubs/${value[0]._id}/edit`);
    }
  });

  return <></>;
}
