/* eslint-disable react/forbid-dom-props */
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import LinkHubComponent, { DisplayLink } from '../components/LinkHubComponent';
import NotFoundException from '../exceptions/NotFoundException';
import ServiceDisabledException from '../exceptions/ServiceDisabledException';

async function getLinkHub(alias: string): Promise<any> {
  const resp = await fetch(`/api/v1/linkhub/${alias}/public`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (resp.status === 404) {
    throw new NotFoundException('LinkHub does not exist');
  } else if (resp.status === 503) {
    throw new ServiceDisabledException('Service is disabled');
  }

  const result = await resp.json();

  return result;
}

export default function LinkHubPage() {
  const [isFound, setIsFound] = useState(true);
  const [title, setTitle] = useState('');
  const [links, setLinks] = useState<DisplayLink[]>([]);

  const { alias } = useParams<{ alias: string }>();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getLinkHub(alias);
        setTitle(data.title);
        setLinks(data.links);
      } catch (error) {
        if (error instanceof NotFoundException) {
          setIsFound(false);
        }
      }
    };

    fetchData();
  }, [alias]);

  if (!isFound) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: '#EB4034',
          color: '#fff',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0, fontSize: '2em' }}>
          This LinkHub is currently unavailable or does not exist.
        </p>
      </div>
    );
  }

  return <LinkHubComponent title={title} links={links} />;
}
