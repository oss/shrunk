import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import LinkHubComponent, { DisplayLink } from '../components/LinkHubComponent';

export default function LinkHubPage() {
  const [title, setTitle] = useState('');
  const [links, setLinks] = useState<DisplayLink[]>([]);

  let { alias } = useParams<{ alias: string }>();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/v1/linkhub/${alias}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();
        setTitle(data.title);
        setLinks(data.links);
      } catch (error) {}
    };

    fetchData();
  }, [alias]);

  return <LinkHubComponent title={title} links={links} />;
}
