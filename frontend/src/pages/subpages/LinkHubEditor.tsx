import React, { useEffect, useState } from 'react';
import LinkHubComponent, {
  DisplayLink,
} from '../../components/LinkHubComponent';
import {
  Typography,
  Button,
  Card,
  Form,
  Input,
  Tabs,
  Checkbox,
} from 'antd/lib';
import {
  CloudUploadOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import EditLinkFromLinkHubModal, {
  EditLinkData,
} from '../../components/EditLinkFromLinkHubModal';
import { NotFoundException } from '../../exceptions/NotFoundException';
import { serverValidateLinkHubAlias } from '../../Validators';

interface PLinkHubEditRow {
  link: DisplayLink;
  index: number;
  onOpenEditDisplayLink(index: number, newLink: DisplayLink): void;
  onDeleteDisplayLink(index: number): void;
  disabled?: boolean;
}

function LinkHubEditRow(props: PLinkHubEditRow) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '10px',
      }}
    >
      <div style={{ marginRight: '10px', width: '100%' }}>
        <p style={{ margin: 0 }}>{props.link.title}</p>
        <p style={{ margin: 0 }}>{props.link.url}</p>
      </div>
      <EditOutlined
        onClick={() => {
          props.onOpenEditDisplayLink(props.index, props.link);
        }}
      />
      <DeleteOutlined
        style={{ marginLeft: '8px' }}
        onClick={() => {
          props.onDeleteDisplayLink(props.index);
        }}
      />
    </div>
  );
}

interface PLinkHubEditor {
  linkhubId: string;
}

async function getLinkHub(linkhubId: string): Promise<any> {
  const resp = await fetch(`/api/v1/linkhub/${linkhubId}/private`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (resp.status === 404) {
    throw new NotFoundException('LinkHub does not exist');
  }

  const result = await resp.json();

  return result;
}

async function addLinkToLinkHub(linkhubId: string, title: string, url: string) {
  const resp = await fetch(`/api/v1/linkhub/${linkhubId}/add-element`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: title,
      url: url,
    }),
  });
  const result = await resp.json();

  return result;
}

async function setLinkFromLinkHub(
  linkhubId: string,
  index: number,
  title: string,
  url: string,
) {
  const resp = await fetch(`/api/v1/linkhub/${linkhubId}/set-element`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: title,
      url: url,
      index: index,
    }),
  });
  const result = await resp.json();

  return result;
}

async function changeLinkHubTitle(linkhubId: string, title: string) {
  const resp = await fetch(`/api/v1/linkhub/${linkhubId}/title`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: title,
    }),
  });
  const result = await resp.json();

  return result;
}

async function deleteLinkAtIndex(linkhubId: string, index: number) {
  const resp = await fetch(`/api/v1/linkhub/${linkhubId}/element`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      index: index,
    }),
  });
  const result = await resp.json();

  return result;
}

async function changeLinkHubAlias(linkhubId: string, alias: string) {
  const resp = await fetch(`/api/v1/linkhub/${linkhubId}/alias`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      alias: alias,
    }),
  });
  const result = await resp.json();

  return result;
}

async function publishLinkHub(linkhubId: string, value: boolean) {
  const resp = await fetch(`/api/v1/linkhub/${linkhubId}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      value: value,
    }),
  });
  const result = await resp.json();

  return result['publish-status'];
}

export default function LinkHubEditor(props: PLinkHubEditor) {
  const [foundLinkHub, setFoundLinkHub] = useState<boolean>(false);

  const [title, setTitle] = useState<string>();
  const [oldTitle, setOldTitle] = useState<string>(); // Used for detecting changes

  const [alias, setAlias] = useState<string>();
  const [oldAlias, setOldAlias] = useState<string>();

  const [isPublished, setIsPublished] = useState<boolean>(false);

  const [links, setLinks] = useState<DisplayLink[]>([]);
  const [backgroundColor, setBackgroundColor] = useState<string>('#2A3235');

  const [editLinkData, setEditLinkData] = useState<EditLinkData>();
  const [isEditLinkModalVisible, setIsEditLinkModalVisible] =
    useState<boolean>(false);

  useEffect(() => {
    getLinkHub(props.linkhubId)
      .then((value: any) => {
        setTitle(value.title);
        setOldTitle(value.title);
        setAlias(value.alias);
        setOldAlias(value.alias);
        setIsPublished(value.is_public);

        const fetchingLinks: DisplayLink[] = [];
        value.links.map((value: any) => {
          fetchingLinks.push({
            url: value.url,
            title: value.title,
          });
        });
        setLinks(fetchingLinks);
        setFoundLinkHub(true);
      })
      .catch((e: NotFoundException) => {
        return;
      });
  }, []);

  const { Title } = Typography;

  function addDisplayLink(value: DisplayLink) {
    let newLinks: DisplayLink[] = JSON.parse(JSON.stringify(links));
    newLinks.push(value);
    setLinks(newLinks);
    addLinkToLinkHub(props.linkhubId, value.title, value.url);
  }

  function onTitleChange(e: any) {
    setTitle(e.target.value);
  }

  function onAliasChange(e: any) {
    // TODO: Check if alias is valid or not.
    setAlias(e.target.value);
  }

  function onProfileSave() {
    if (title === undefined || alias === undefined) {
      return;
    }

    changeLinkHubTitle(props.linkhubId, title);
    changeLinkHubAlias(props.linkhubId, alias);
    setOldTitle(title);
    setOldTitle(alias);
  }

  function isProfileSaved() {
    return title === oldTitle && alias === oldAlias;
  }

  function onDisplayLinkChange(value: DisplayLink, index: number) {
    let newLinks: DisplayLink[] = JSON.parse(JSON.stringify(links));
    value.originId = newLinks[index].originId;
    newLinks[index] = value;
    setLinks(newLinks);
  }

  function onOpenEditDisplayLink(index: number, newLink: DisplayLink) {
    setEditLinkData({ index: index, displayLink: newLink });
    setIsEditLinkModalVisible(true);
  }

  function onDeleteDisplayLink(index: number) {
    let newLinks: DisplayLink[] = JSON.parse(JSON.stringify(links));
    newLinks.splice(index, 1);
    setLinks(newLinks);

    deleteLinkAtIndex(props.linkhubId, index);
  }

  function onAddDisplayLink() {
    const link: DisplayLink = {
      title: 'New Link',
      url: 'https://rutgers.edu',
      originId: Math.random(), // TODO: This is stupid; clean this up later.
    };
    addDisplayLink(link);
  }

  function onPublish(e: any) {
    publishLinkHub(props.linkhubId, !isPublished).then((value) => {
      setIsPublished(value);
    });
  }

  if (!foundLinkHub) {
    return <div>Couldn't find a LinkHub</div>;
  }

  if (title === undefined) {
    return <></>;
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          height: '100%',
          width: '100%',
        }}
      >
        <div style={{ marginRight: '64px', width: '30%' }}>
          <Tabs defaultActiveKey="edit">
            <Tabs.TabPane tab="Edit" key="edit">
              <Button
                icon={<PlusCircleOutlined />}
                style={{ marginRight: '10px', width: '100%' }}
                type="default"
                onClick={onAddDisplayLink}
              >
                Add
              </Button>
              <div
                style={{
                  width: '100%',
                  height: '500px',
                  marginBottom: '8px',
                }}
              >
                {links.map((value, index) => {
                  return (
                    <LinkHubEditRow
                      link={value}
                      index={index}
                      key={value.originId}
                      onOpenEditDisplayLink={onOpenEditDisplayLink}
                      onDeleteDisplayLink={onDeleteDisplayLink}
                    />
                  );
                })}
                {links.length === 0 ? (
                  <p
                    style={{
                      textAlign: 'center',
                      paddingTop: '16px',
                      paddingBottom: '16px',
                    }}
                  >
                    You have no links.
                  </p>
                ) : (
                  <></>
                )}
              </div>
            </Tabs.TabPane>
            <Tabs.TabPane disabled tab="Design" key="design" />
            <Tabs.TabPane disabled tab="Stats" key="stats" />
            <Tabs.TabPane tab="Settings" key="settings">
              <Form layout="vertical">
                <Title level={3}>Profile</Title>
                <Form.Item label="Title" name="linkhub-title">
                  <Input
                    max={64}
                    defaultValue={title}
                    onChange={onTitleChange}
                  />
                </Form.Item>
                <Form.Item
                  label="Alias"
                  name="linkhub-alias"
                  rules={[
                    { required: true, message: 'Alias cannot be empty.' },
                    { validator: serverValidateLinkHubAlias },
                  ]}
                >
                  <Input
                    addonBefore={`${window.location.origin}/h/`}
                    max={32}
                    defaultValue={alias}
                    onChange={onAliasChange}
                  />
                </Form.Item>
                <Form.Item>
                  <Button disabled={isProfileSaved()} onClick={onProfileSave}>
                    Save
                  </Button>
                </Form.Item>
                <Title level={3}>Visibility</Title>
                <Form.Item name="linkhub-visibility">
                  <div style={{ marginBottom: '12px' }}>
                    <p style={{ margin: 0, marginBottom: '4px' }}>
                      You can publish your LinkHub to be viewed by others.
                    </p>
                    <Checkbox
                      defaultChecked={isPublished}
                      checked={isPublished}
                      onChange={onPublish}
                    >
                      Publish
                    </Checkbox>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <p style={{ margin: 0, marginBottom: '4px' }}>
                      Deleting your LinkHub is irreversible.
                    </p>
                    <Button danger>Delete</Button>
                  </div>
                </Form.Item>
              </Form>
            </Tabs.TabPane>
          </Tabs>
        </div>
        <div>
          <Card
            title="Live Preview"
            extra={<a href="https://playvalorant.com/">View Desktop Layout</a>}
          >
            <div
              style={{
                borderRadius: '18px',
                overflow: 'hidden',
                width: '400px',
                height: '710px',
              }}
            >
              <LinkHubComponent
                title={title}
                links={links}
                backgroundColor={backgroundColor}
              />
            </div>
            <p
              style={{
                margin: '0',
                paddingTop: '10px',
                textAlign: 'center',
              }}
            >
              <a href={`${window.location.origin}/h/${alias}`}>
                {window.location.origin}/h/{alias}
              </a>
            </p>
          </Card>
        </div>
      </div>
      {editLinkData !== undefined ? (
        <EditLinkFromLinkHubModal
          editLinkData={editLinkData}
          onOkay={(value: DisplayLink) => {
            onDisplayLinkChange(value, editLinkData.index);
            setIsEditLinkModalVisible(false);
            setLinkFromLinkHub(
              props.linkhubId,
              editLinkData.index,
              value.title,
              value.url,
            );
          }}
          onCancel={() => {
            setIsEditLinkModalVisible(false);
          }}
          visible={isEditLinkModalVisible}
        />
      ) : (
        <></>
      )}
    </>
  );
}
