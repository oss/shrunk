import React, { useState } from 'react';
import LinkHubComponent, {
  DisplayLink,
} from '../../components/LinkHubComponent';
import { Button, Form, Input } from 'antd/lib';
import {
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';

interface PLinkHubEditRow {
  link: DisplayLink;
  key: number;
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
          name={`linkhub-link-title-${props.key}`}
          defaultValue={props.link.title}
          style={{ border: 'none' }}
        />
        <br />
        <input
          type="text"
          name={`linkhub-link-url-${props.key}`}
          defaultValue={props.link.url}
          style={{ border: 'none' }}
        />
      </div>
      <div style={{ display: 'flex' }}>
        <EditOutlined style={{ marginRight: '5px' }} />
        <DeleteOutlined style={{ marginRight: '5px' }} />
      </div>
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

  function onTitleChange(e: any) {
    setTitle(e.target.value);
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <div style={{ marginRight: '20px' }}>
        <p>
          Your LinkHub is live at{' '}
          <a href="https://go.rutgers.edu/h/{props.alias}">
            go.rutgers.edu/h/{props.alias}
          </a>
        </p>
        <Form.Item label="Title" name="linkhub-title">
          <Input
            max={64}
            defaultValue="My Collection of Links"
            onChange={onTitleChange}
          />
        </Form.Item>
        <div>
          {links.map((value, key) => {
            return <LinkHubEditRow link={value} key={key} />;
          })}
        </div>
        <Button
          style={{ marginRight: '10px' }}
          type="default"
          onClick={() => {}}
        >
          <PlusCircleOutlined /> Add
        </Button>
        <Button type="primary" onClick={() => {}}>
          <SaveOutlined /> Save
        </Button>
      </div>
      <div
        style={{
          border: 'solid',
          borderWidth: '5px',
          borderRadius: '20px',
          width: '21vw',
          height: '40vw',
        }}
      >
        <LinkHubComponent title={title} links={links} />
      </div>
    </div>
  );
}
