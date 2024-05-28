import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import LinkHubComponent, { DisplayLink } from '../components/LinkHubComponent';

interface Props {
  // alias?: string;
}

export default function LinkHubPage(props: Props) {
  const [title, setTitle] = useState('');
  const [links, setLinks] = useState<DisplayLink[]>([]);

  let { alias } = useParams<{ alias: string }>();

  useEffect(() => {
    const data = fetch(`/api/v1/linkhub/${alias}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }).then((resp) =>
      resp.json().then((data) => {
        setTitle(data['title']);
        setLinks(data['links']);
      }),
    );
  });

  return <LinkHubComponent title={title} links={links} />;
}
