import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import './LinkHubComponent.less';

export interface DisplayLink {
  title: string;
  url: string;
}

interface Props {
  title: string;
  links: DisplayLink[];
}

export default function LinkHubComponent(props: Props) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: '#2A3235',
      }}
    >
      <div style={{ textAlign: 'center', width: '100%' }}>
        <p
          className="rubik-bold"
          style={{
            fontSize: '3em',
            color: 'rgb(255,255,255)',
            marginTop: '25px',
          }}
        >
          {props.title}
        </p>
        <div
          style={{ display: 'flex', justifyContent: 'center', width: '100%' }}
        >
          <div style={{ minWidth: '400px', width: '30%' }}>
            {props.links.map((value, _) => {
              return (
                <a href={value.url}>
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
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
