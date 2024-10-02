import React, { useEffect, useState } from 'react';
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
  DeleteOutlined,
  EditOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import { useHistory } from 'react-router-dom';
import LinkHubComponent, {
  DisplayLink,
} from '../../components/LinkHubComponent';
import EditLinkFromLinkHubModal, {
  EditLinkData,
} from '../../modals/EditLinkFromLinkHubModal';
import { serverValidateLinkHubAlias } from '../../Validators';
import ShareLinkHubModal from '../../modals/ShareLinkHubModal';
import { Entity, ShareLinkModal } from '../../modals/ShareLinkModal';
import { getOrgInfo } from '../../api/Org';
import {
  getLinkHub,
  addCollaboratorToBackend,
  removeCollaboratorToBackend,
  addLinkToLinkHub,
  changeLinkHubTitle,
  changeLinkHubAlias,
  deleteLinkAtIndex,
  publishLinkHub,
  deleteLinkHub,
  setLinkFromLinkHub,
} from '../../api/LinkHub';

interface PLinkHubEditRow {
  link: DisplayLink;
  index: number;
  onOpenEditDisplayLink(index: number, newLink: DisplayLink): void;
  onDeleteDisplayLink(index: number): void;
}

// TOOD: Fetch elements when adding or removing a link to prevent mis-syncs.

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

export default function LinkHubEditor(props: PLinkHubEditor) {
  const history = useHistory();

  const [foundLinkHub, setFoundLinkHub] = useState<boolean>(false);

  const [title, setTitle] = useState<string>();
  const [oldTitle, setOldTitle] = useState<string>(); // Used for detecting changes

  const [alias, setAlias] = useState<string>();
  const [oldAlias, setOldAlias] = useState<string>();

  const [collaborators, setCollaborators] = useState<Entity[]>();

  const [isPublished, setIsPublished] = useState<boolean>(false);

  const [links, setLinks] = useState<DisplayLink[]>([]);
  const [backgroundColor, setBackgroundColor] = useState<string>('#2A3235');

  const [editLinkData, setEditLinkData] = useState<EditLinkData>();
  const [isEditLinkModalVisible, setIsEditLinkModalVisible] =
    useState<boolean>(false);

  const [isShareModalVisible, setIsShareModalVisible] =
    useState<boolean>(false);

  function refreshCollaborators() {
    getLinkHub(props.linkhubId).then((data: any) => {
      const promises = [];
      const oldCollaborators = JSON.parse(JSON.stringify(data.collaborators));
      for (let i = 0; i < data.collaborators.length; i++) {
        if (oldCollaborators[i].type === 'org') {
          promises.push(
            getOrgInfo(oldCollaborators[i]._id).then((orgInfo) => {
              oldCollaborators[i].name = orgInfo.name;
            }),
          );
        } else if (oldCollaborators[i].type === 'netid') {
          oldCollaborators[i].name = oldCollaborators[i]._id;
        }
      }

      Promise.all(promises).then(() => {
        setCollaborators(oldCollaborators);
      });
    });
  }

  useEffect(() => {
    getLinkHub(props.linkhubId)
      .then((value: any) => {
        setTitle(value.title);
        setOldTitle(value.title);
        setAlias(value.alias);
        setOldAlias(value.alias);
        setIsPublished(value.is_public);
        refreshCollaborators();

        const fetchingLinks: DisplayLink[] = [];
        value.links.map((data: any) => {
          fetchingLinks.push({
            url: data.url,
            title: data.title,
          });
        });
        setLinks(fetchingLinks);
        setFoundLinkHub(true);
      })
      .catch(() => {});
  }, []);

  const { Title } = Typography;

  function addCollaborator(
    type: 'netid' | 'org',
    identifier: string,
    permission: string,
  ) {
    addCollaboratorToBackend(
      props.linkhubId,
      identifier,
      permission,
      type,
    ).then((value) => {
      if (value.success as boolean) {
        refreshCollaborators();
      }
    });
  }

  function removeCollaborator(type: 'netid' | 'org', identifier: string) {
    removeCollaboratorToBackend(props.linkhubId, identifier, type).then(
      (value) => {
        if (value.success as boolean) {
          refreshCollaborators();
        }
      },
    );
  }

  function addDisplayLink(value: DisplayLink) {
    const newLinks: DisplayLink[] = JSON.parse(JSON.stringify(links));
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
    setOldAlias(alias);
  }

  function isProfileSaved() {
    return title === oldTitle && alias === oldAlias;
  }

  function onDisplayLinkChange(value: DisplayLink, index: number) {
    const newLinks: DisplayLink[] = JSON.parse(JSON.stringify(links));
    value.originId = newLinks[index].originId;
    newLinks[index] = value;
    setLinks(newLinks);
  }

  function onOpenEditDisplayLink(index: number, newLink: DisplayLink) {
    setEditLinkData({ index, displayLink: newLink });
    setIsEditLinkModalVisible(true);
  }

  function onDeleteDisplayLink(index: number) {
    const newLinks: DisplayLink[] = JSON.parse(JSON.stringify(links));
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

  function onDelete(e: any) {
    deleteLinkHub(props.linkhubId).then((value) => {
      if (!value.success) {
        return;
      }

      history.push('/linkhubs');
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
                {links.map((value, index) => (
                  <LinkHubEditRow
                    link={value}
                    index={index}
                    key={value.originId}
                    onOpenEditDisplayLink={onOpenEditDisplayLink}
                    onDeleteDisplayLink={onDeleteDisplayLink}
                  />
                ))}
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
                <Form.Item
                  required={false}
                  label="Title"
                  name="linkhub-title"
                  rules={[
                    { required: true, message: 'Title cannot be empty.' },
                  ]}
                >
                  <Input
                    max={64}
                    defaultValue={title}
                    onChange={onTitleChange}
                  />
                </Form.Item>
                <Form.Item
                  required={false}
                  label="Alias"
                  name="linkhub-alias"
                  rules={[
                    { required: true, message: 'Alias cannot be empty.' },
                    { validator: serverValidateLinkHubAlias },
                  ]}
                  style={{ display: 'none' }}
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
                      Control access to your LinkHub
                    </p>
                    <Button
                      onClick={() => {
                        setIsShareModalVisible(true);
                      }}
                    >
                      Manage Access
                    </Button>
                  </div>
                  <div style={{ marginBottom: '12px', display: 'none' }}>
                    <p style={{ margin: 0, marginBottom: '4px' }}>
                      Deleting your LinkHub is irreversible.
                    </p>
                    <Button danger onClick={onDelete}>
                      Delete
                    </Button>
                  </div>
                </Form.Item>
              </Form>
            </Tabs.TabPane>
          </Tabs>
        </div>
        <div>
          <Card title="Live Preview">
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
      {collaborators !== undefined ? (
        <ShareLinkModal
          visible={isShareModalVisible}
          userPrivileges={undefined}
          people={collaborators}
          isLoading={false}
          linkInfo={null}
          onAddEntity={(value: any) => {
            addCollaborator(
              value.typeOfAdd as 'netid' | 'org',
              value.netid ? value.netid : value.organization,
              value.permission,
            );
          }}
          onRemoveEntity={(_id: string, type: string) => {
            removeCollaborator(type as 'netid' | 'org', _id);
          }}
          onOk={() => {
            setIsShareModalVisible(false);
          }}
          onCancel={() => {
            setIsShareModalVisible(false);
          }}
        />
      ) : (
        <></>
      )}
    </>
  );
}
