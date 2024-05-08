import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import LinkHubComponent, { DisplayLink } from '../components/LinkHubComponent';

interface Props {
  // alias?: string;
}

export default function LinkHubPage(props: Props) {
  const [title, setTitle] = useState('StarCraft II Tournament @ RU');
  const [links, setLinks] = useState<DisplayLink[]>([
    {
      title: 'Graphic Design Application',
      url: 'https://google.com/',
    },
    {
      title: 'Caster Application',
      url: 'https://google.com/',
    },
    {
      title: 'Marketing Application',
      url: 'https://google.com/',
    },
  ]);
  const [owners, setOwners] = useState([]);

  let { alias } = useParams<{ alias: string }>();

  useEffect(() => {
    fetch(`/api/v1/linkhub/${alias}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }).then((data) => {
      console.log(data);
    });
  });

  return <LinkHubComponent title={title} links={links} />;
}
