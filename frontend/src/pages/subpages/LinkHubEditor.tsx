import React, { useState } from 'react';
import LinkHubComponent, {
  DisplayLink,
} from '../../components/LinkHubComponent';
import { Button, Form, Input } from 'antd/lib';
import {
  DeleteOutlined,
  PlusCircleOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';

interface PLinkHubEditRow {
  link: DisplayLink;
  index: number;
  onDisplayLinkChange(value: DisplayLink, index: number): void;
  onDeleteDisplayLink(index: number): void;
}

function LinkHubEditRow(props: PLinkHubEditRow) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '400px',
        justifyContent: 'space-between',
        marginBottom: '10px',
      }}
    >
      <div style={{ marginRight: '10px' }}>
        <input
          type="text"
          name={`linkhub-link-title-${props.index}`}
          defaultValue={props.link.title}
          style={{ border: 'none', width: '256px' }}
          onChange={(e: any) => {
            const displayLink: DisplayLink = {
              title: e.target.value,
              url: props.link.url,
            };
            props.onDisplayLinkChange(displayLink, props.index);
          }}
        />
        <br />
        <input
          type="text"
          name={`linkhub-link-url-${props.index}`}
          defaultValue={props.link.url}
          style={{ border: 'none', width: '256px' }}
          onChange={(e: any) => {
            const displayLink: DisplayLink = {
              title: props.link.title,
              url: e.target.value,
            };
            props.onDisplayLinkChange(displayLink, props.index);
          }}
        />
      </div>
      <DeleteOutlined
        onClick={() => {
          props.onDeleteDisplayLink(props.index);
        }}
      />
    </div>
  );
}

interface PLinkHubEditor {
  alias: string;
}

export default function LinkHubEditor(props: PLinkHubEditor) {
  const [title, setTitle] = useState('StarCraft II Tournament @ RU');
  const [links, setLinks] = useState<DisplayLink[]>([
    {
      title: 'Graphic Design Application',
      url: 'https://google.com/',
      originId: Math.random(),
    },
    {
      title: 'Caster Application',
      url: 'https://google.com/',
      originId: Math.random(),
    },
    {
      title: 'Marketing Application',
      url: 'https://google.com/',
      originId: Math.random(),
    },
  ]);

  function onTitleChange(e: any) {
    setTitle(e.target.value);
  }

  function onDisplayLinkChange(value: DisplayLink, index: number) {
    let newLinks: DisplayLink[] = JSON.parse(JSON.stringify(links));
    newLinks[index] = value;
    setLinks(newLinks);
  }

  function onDeleteDisplayLink(index: number) {
    let newLinks: DisplayLink[] = JSON.parse(JSON.stringify(links));
    newLinks.splice(index, 1);
    setLinks(newLinks);
  }

  function addDisplayLink(value: DisplayLink) {
    let newLinks: DisplayLink[] = JSON.parse(JSON.stringify(links));
    newLinks.push(value);
    setLinks(newLinks);
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ marginRight: '64px' }}>
        <Form.Item label="Title" name="linkhub-title">
          <Input max={64} defaultValue={title} onChange={onTitleChange} />
        </Form.Item>
        <div>
          {links.map((value, index) => {
            return (
              <LinkHubEditRow
                link={value}
                index={index}
                key={value.originId}
                onDisplayLinkChange={onDisplayLinkChange}
                onDeleteDisplayLink={onDeleteDisplayLink}
              />
            );
          })}
        </div>
        <Button
          style={{ marginRight: '10px' }}
          type="default"
          onClick={() => {
            const link: DisplayLink = {
              title: 'click here to sell your soul',
              url: 'https://overwatch.blizzard.com/en-us/',
              originId: Math.random(), // TODO: This is stupid; clean this up later.
            };
            addDisplayLink(link);
          }}
        >
          <PlusCircleOutlined /> Add
        </Button>
        <Button type="primary" onClick={() => {}}>
          <CloudUploadOutlined /> Publish
        </Button>
      </div>
      <div
        style={{
          width: '400px',
          height: '710px',
          textAlign: 'center',
        }}
      >
        <LinkHubComponent title={title} links={links} />
        <p style={{ marginTop: '10px' }}>
          <a href="https://go.rutgers.edu/h/{props.alias}">
            go.rutgers.edu/h/{props.alias}
          </a>
        </p>
      </div>
    </div>
  );
}
