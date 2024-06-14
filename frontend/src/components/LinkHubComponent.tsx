import React from 'react';
import './LinkHubComponent.less';

export interface DisplayLink {
  originId?: number; // Used for keys when displaying a link.
  title: string;
  url: string;
}

interface Props {
  title: string;
  links: DisplayLink[];
  backgroundColor?: string;
}

export default function LinkHubComponent(props: Props) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundColor:
          props.backgroundColor === undefined
            ? '#2A3235'
            : props.backgroundColor,
      }}
    >
      <div style={{ textAlign: 'center', width: '100%' }}>
        <p
          className="rubik-bold"
          style={{
            fontSize: '3em',
            color: 'rgb(255,255,255)',
            marginTop: '25px',
            lineHeight: '1.2em',
          }}
        >
          {props.title}
        </p>
        <div
          style={{ display: 'flex', justifyContent: 'center', width: '100%' }}
        >
          <div style={{ minWidth: '400px', width: '30%' }}>
            {props.links.map((value, index) => (
              <a href={value.url} key={index}>
                <div
                  style={{
                    border: 'solid',
                    backgroundColor: 'rgb(255,255,255)',
                    borderColor: 'rgb(0,0,0)',
                    borderRadius: '20px',
                    borderWidth: '3px',
                    padding: '10px',
                    marginBottom: '10px',
                  }}
                >
                  <p style={{ margin: 0 }} className="rubik-normal">
                    {value.title}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
