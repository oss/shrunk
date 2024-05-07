import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import './LinkHubViewer.less';

interface Props {
  // alias?: string;
}

interface DisplayLink {
  title: string;
  url: string;
}

export default function LinkHubViewer(props: Props) {
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

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100vw' }}>
      <div style={{ textAlign: 'center', width: '100%' }}>
        <p className="rubik-bold" style={{ fontSize: '3em' }}>
          {title}
        </p>
        <div
          style={{ display: 'flex', justifyContent: 'center', width: '100%' }}
        >
          <div style={{ minWidth: '400px', width: '30vw' }}>
            {links.map((value, _) => {
              return (
                <div
                  style={{
                    border: 'solid',
                    borderRadius: '20px',
                    marginBottom: '10px',
                  }}
                >
                  <p className="rubik-normal">{value.title}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
