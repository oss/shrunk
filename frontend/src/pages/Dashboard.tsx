/**
 * Implements the [[Dashboard]] component
 * @packageDocumentation
 */

import React from 'react';

import { Row, Col, Pagination, Spin, Dropdown, Button, Space } from 'antd';
import { PlusCircleFilled } from '@ant-design/icons';

import { getOrgInfo, listOrgs, OrgInfo } from '../api/Org';
import { SearchQuery, SearchBox } from '../components/SearchBox';
import { LinkRow } from '../components/LinkRow';
import { LinkInfo } from '../components/LinkInfo';
import { QrCodeModal } from '../components/QrCode';
import { EditLinkModal, EditLinkFormValues } from '../components/EditLinkModal';
import { ShareLinkModal } from '../components/ShareLinkModal';
import { CreateLinkForm } from '../components/CreateLinkForm';

import './Dashboard.less';
import { arrayMax } from 'highcharts';

/**
 * The final values of the share link form
 * @type
 */
export type Entity = {
  /**
   * The id of the entity the link is shared with
   * @property
   */
  _id: string;
  /**
   * The name of the entity. For an organization, it would be the organization name. For a netid, it would be the netid.
   */
  name: string;
  /**
   * The type of entity the link is shared with (netid/org)
   * @property
   */
  type: string;
  /**
   * The permission of the entity the link is shared with (viewer/editor)
   * @property
   */
  permission: string;
};

/**
 * Props for the [[Dashboard]] component.
 * @interface
 */
export interface Props {
  userPrivileges: Set<string>;
  netid: string;
}

/**
 * State of the [[Dashboard]] component.
 * @interface
 */
export interface State {
  /**
   * The organizations of which the user is a member. This is used in the
   * advanced search settings menu.
   * @property
   */
  userOrgs: OrgInfo[] | null;

  /**
   * An array of [[LinkInfo]] objects for the current search results.
   * @property
   */
  linkInfo: LinkInfo[] | null;

  /**
   * The number of links to display per page. Currently this is constant,
   * but that may change in the future.
   * @property
   */
  linksPerPage: number;

  /**
   * The current search query.
   * @property
   */
  query: SearchQuery | null;

  /**
   * The current page in the search results. Starts from `1`.
   * @property
   */
  currentPage: number;

  /**
   * The total number of pages of results for the current query.
   * @property
   */
  totalPages: number;

  /**
   * The current offset in the search result, in terms of number of links.
   * @property
   */
  currentOffset: number;

  /**
   * The total number of links returned by the current query.
   * @property
   */
  totalLinks: number;

  /**
   * The current state of the create link form
   * @property
   */
  createLinkState: { visible: boolean };

  /**
   * The current state of the edit modal.
   * @property
   */
  editModalState: { visible: boolean; linkInfo: LinkInfo | null };

  /**
   * The current state of the share link modal. Contains the netids and orgs.
   * @property
   */
  shareLinkModalState: {
    visible: boolean;
    entities: Array<Entity>;
    linkInfo: LinkInfo | null;
    isLoading: boolean;
  };

  /**
   * The current state of the QR code modal.
   * @property
   */
  qrModalState: { visible: boolean; linkInfo: LinkInfo | null };

  /**
   * Whether the create link dropdown is visible.
   * @property
   */
  createLinkDropdownVisible: boolean;
}

/**
 * The [[Dashboard]] component implements most of Shrunk's core functionality.
 * It allows the user to
 *   * Search for links
 *   * Create, edit, and delete links
 *   * Navigate to the stats page for link
 *   * Create QR codes
 * @class
 */
export class Dashboard extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      userOrgs: null,
      linkInfo: null,
      linksPerPage: 10,
      query: {
        set: { set: this.props.userPrivileges.has('admin') ? 'all' : 'user' },
        show_expired_links: false,
        show_deleted_links: false,
        sort: { key: 'created_time', order: 'descending' },
        begin_time: null,
        end_time: null,
      },
      totalPages: 0,
      totalLinks: 0,
      currentPage: 1,
      currentOffset: 0,
      createLinkState: {
        visible: false,
      },
      editModalState: {
        visible: false,
        linkInfo: null,
      },
      shareLinkModalState: {
        visible: false,
        entities: [],
        linkInfo: null,
        isLoading: false,
      },
      qrModalState: {
        visible: false,
        linkInfo: null,
      },
      createLinkDropdownVisible: false,
    };
  }

  async componentDidMount(): Promise<void> {
    await Promise.all([this.fetchUserOrgs(), this.refreshResults()]);
  }

  /**
   * Fetch the organizations of which the user is a member.
   * @method
   */
  fetchUserOrgs = async (): Promise<void> => {
    const userOrgs = await listOrgs('user');
    this.setState({ userOrgs });
  };

  /**
   * Executes a search query and updates component state with the results
   * @method
   * @param newQuery The new query
   */
  setQuery = async (newQuery: SearchQuery): Promise<void> => {
    const results = await this.doQuery(newQuery, 0, this.state.linksPerPage);
    
    // Filter out duplicate links
    const uniqueResults = results.results.filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i);

    const totalPages = Math.ceil(uniqueResults.length / this.state.linksPerPage);
    this.setState({
      linkInfo: uniqueResults,
      query: newQuery,
      currentPage: 1,
      totalPages,
      currentOffset: this.state.linksPerPage,
      totalLinks: uniqueResults.length,
    });
  };

  /**
   * Updates the current page of search results.
   * @method
   * @throws Error if the current query is `null`
   * @param newPage The new page
   */
  setPage = async (newPage: number): Promise<void> => {
    if (this.state.query === null) {
      throw new Error('attempted to set page with this.state.query === null');
    }

    const skip = (newPage - 1) * this.state.linksPerPage;
    const results = await this.doQuery(
      this.state.query,
      skip,
      this.state.linksPerPage
    );
    const totalPages = Math.ceil(results.count / this.state.linksPerPage);
    this.setState({
      linkInfo: results.results,
      currentPage: newPage,
      totalPages,
      currentOffset: newPage * this.state.linksPerPage,
      totalLinks: results.count,
    });
  };

  /**
   * Re-execute the currently active query.
   * @method
   */
  refreshResults = async (): Promise<void> => {
    await this.setPage(this.state.currentPage);
  };

  /**
   * Sends a search request to the server. Does not update component state.
   * Use [[setQuery]] or [[setPage]] if you want to update the current state
   * of the search results.
   * @method
   * @param query The query to execute
   * @param skip  The number of results to skip
   * @param limit The number of results to return
   * @returns The search results
   */
  doQuery = async (
    query: SearchQuery,
    skip: number,
    limit: number
  ): Promise<{ count: number; results: LinkInfo[] }> => {
    const req: Record<string, any> = {
      query: query.query,
      set: query.set,
      show_expired_links: query.show_expired_links,
      show_deleted_links: query.show_deleted_links,
      sort: query.sort,
      pagination: { skip, limit },
    };

    if (query.begin_time !== null) {
      req.begin_time = query.begin_time.format();
    }

    if (query.end_time !== null) {
      req.end_time = query.end_time.format();
    }

    const result = await fetch('/api/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
    }).then((resp) => resp.json());
    return {
      count: result.count,
      results: result.results.map(
        (result: any) =>
          ({
            ...result,
            created_time: new Date(result.created_time),
            expiration_time: !result.expiration_time
              ? null
              : new Date(result.expiration_time),
            deletion_info: !result.deletion_info
              ? null
              : {
                  deleted_by: result.deletion_info.deleted_by,
                  deleted_time: new Date(result.deletion_info.deleted_time),
                },
          } as LinkInfo)
      ),
    };
  };

  /**
   * Displays the edit link modal
   * @method
   * @param linkInfo The [[LinkInfo]] of the link to edit
   */
  showEditModal = (linkInfo: LinkInfo): void => {
    this.setState({
      editModalState: {
        visible: true,
        linkInfo,
      },
    });
  };

  /** Hides the edit link modal
   * @method
   */
  hideEditModal = (): void => {
    this.setState({
      editModalState: {
        ...this.state.editModalState,
        visible: false,
      },
    });

    // We set a timeout for this to prevent the contents of the modal
    // from changing while the modal-close animation is still in progress.
    setTimeout(() => {
      this.setState({
        editModalState: {
          ...this.state.editModalState,
          linkInfo: null,
        },
      });
    }, 500);
  };

  /**
   * Retrieves viewer/editor data for a link and reorganizes it in a displayable manner.
   * @param linkInfo
   */
  getLinkACL = async (linkInfo: LinkInfo): Promise<Entity[]> => {
    this.setState({
      shareLinkModalState: {
        visible: this.state.shareLinkModalState.visible,
        entities: this.state.shareLinkModalState.entities,
        linkInfo: this.state.shareLinkModalState.linkInfo,
        isLoading: true, // set isLoading to true
      },
    });

    const sharingInfo = await fetch(`/api/v1/link/${linkInfo.id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }).then((resp) => resp.json());

    var entities: Array<Entity> = [];
    for (var i = 0; i < sharingInfo.editors.length; i++) {
      if (sharingInfo.editors[i].type === 'netid')
        entities.push({
          _id: sharingInfo.editors[i]._id,
          name: sharingInfo.editors[i]._id,
          type: 'netid',
          permission: 'editor',
        });
      else if (sharingInfo.editors[i].type === 'org')
        entities.push({
          _id: sharingInfo.editors[i]._id,
          name: (await getOrgInfo(sharingInfo.editors[i]._id)).name,
          type: 'org',
          permission: 'editor',
        });
    }

    for (var i = 0; i < sharingInfo.viewers.length; i++) {
      if (
        sharingInfo.viewers[i].type === 'netid' &&
        !entities.some((entity) => entity._id === sharingInfo.viewers[i]._id) // don't show a person as a viewer if they're already an editor
      )
        entities.push({
          _id: sharingInfo.viewers[i]._id,
          name: sharingInfo.viewers[i]._id,
          type: 'netid',
          permission: 'viewer',
        });
      else if (
        sharingInfo.viewers[i].type === 'org' &&
        !entities.some((entity) => entity._id === sharingInfo.viewers[i]._id) // don't show an org as a viewer if they're already an editor
      )
        entities.push({
          _id: sharingInfo.viewers[i]._id,
          name: (await getOrgInfo(sharingInfo.viewers[i]._id)).name,
          type: 'org',
          permission: 'viewer',
        });
    }

    // sort the list of entities:
    // first sorts by permission (editor > viewer), then by type (org > netid), then alphabetically by id
    entities.sort(
      (entity1, entity2) =>
        entity1.permission.localeCompare(entity2.permission) ||
        entity2.type.localeCompare(entity1.type) ||
        entity1._id.localeCompare(entity2._id)
    );

    this.setState({
      shareLinkModalState: {
        visible: this.state.shareLinkModalState.visible,
        entities: this.state.shareLinkModalState.entities,
        linkInfo: this.state.shareLinkModalState.linkInfo,
        isLoading: false, // set isLoading to false
      },
    });
    return entities;
  };

  /**
   * Displays the share link modal
   * @method
   * @param linkInfo The [[LinkInfo]] of the link to manage sharing
   */
  showShareLinkModal = async (linkInfo: LinkInfo): Promise<void> => {
    this.setState({
      shareLinkModalState: {
        visible: true,
        entities: await this.getLinkACL(linkInfo),
        linkInfo: linkInfo,
        isLoading: false,
      },
    });
  };

  /** Hides the share link modal
   * @method
   */
  hideShareLinkModal = (): void => {
    this.setState({
      shareLinkModalState: {
        ...this.state.shareLinkModalState,
        visible: false,
      },
    });

    // We set a timeout for this to prevent the contents of the modal
    // from changing while the modal-close animation is still in progress.
    setTimeout(() => {
      this.setState({
        shareLinkModalState: {
          ...this.state.shareLinkModalState,
          entities: [],
          linkInfo: null,
        },
      });
    }, 500);
  };

  /**
   * Show the QR code modal
   * @method
   * @param linkInfo The [[LinkInfo]] of the link for which to generate QR codes
   */
  showQrModal = (linkInfo: LinkInfo): void => {
    this.setState({
      qrModalState: {
        visible: true,
        linkInfo,
      },
    });
  };

  /**
   * Hide the QR code modal
   * @method
   */
  hideQrModal = (): void => {
    this.setState({
      qrModalState: {
        ...this.state.qrModalState,
        visible: false,
      },
    });

    // We set a timeout for this to prevent the contents of the modal
    // from changing while the modal-close animation is still in progress.
    setTimeout(() => {
      this.setState({
        qrModalState: {
          ...this.state.qrModalState,
          linkInfo: null,
        },
      });
    }, 500);
  };

  /**
   * Executes API requests to update a link
   * @param values The form values from the edit link form
   * @throws Error if the value of `this.state.editModalState.linkInfo` is `null`
   */
  doEditLink = async (values: EditLinkFormValues): Promise<void> => {
    const oldLinkInfo = this.state.editModalState.linkInfo;
    if (oldLinkInfo === null) {
      throw new Error('oldLinkInfo should not be null');
    }

    // Create the request to edit title, long_url, and expiration_time
    const patch_req: Record<string, any> = {};
    if (values.title !== oldLinkInfo.title) {
      patch_req.title = values.title;
    }
    if (values.long_url !== oldLinkInfo.long_url) {
      patch_req.long_url = values.long_url;
    }
    if (values.owner !== oldLinkInfo.owner) {
      patch_req.owner = values.owner;
    }
    if (values.expiration_time !== oldLinkInfo.expiration_time) {
      patch_req.expiration_time =
        values.expiration_time === null
          ? null
          : values.expiration_time.format();
    }

    const promises = [];

    promises.push(
      fetch(`/api/v1/link/${oldLinkInfo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch_req),
      })
    );

    const oldAliases = new Map(
      oldLinkInfo.aliases.map((alias) => [alias.alias, alias])
    );
    const newAliases = new Map(
      values.aliases.map((alias) => [alias.alias, alias])
    );

    // Delete aliases that no longer exist
    for (const alias of oldAliases.keys()) {
      if (!newAliases.has(alias)) {
        promises.push(
          fetch(`/api/v1/link/${oldLinkInfo.id}/alias/${alias}`, {
            method: 'DELETE',
          })
        );
      }
    }

    // Create/update aliases
    for (const [alias, info] of newAliases.entries()) {
      const isNew = !oldAliases.has(alias);
      const isDescriptionChanged =
        oldAliases.has(alias) &&
        info.description !== oldAliases.get(alias)?.description;
      if (isNew || isDescriptionChanged) {
        promises.push(
          fetch(`/api/v1/link/${oldLinkInfo.id}/alias`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              alias,
              description: info.description,
            }),
          })
        );
      }
    }

    // Await all the requests and refresh search results
    await Promise.all(promises);
    await this.refreshResults();
  };

  /**
   * Executes API request to add people the link is shared with
   * @param values The form values from the edit link form
   * @throws Error if the value of `this.state.shareLinkModalState.linkInfo` is `null`
   */
  doShareLinkWithEntity = async (values: any): Promise<void> => {
    this.setState({
      shareLinkModalState: {
        visible: this.state.shareLinkModalState.visible,
        entities: this.state.shareLinkModalState.entities,
        linkInfo: this.state.shareLinkModalState.linkInfo,
        isLoading: true,
      },
    });

    const oldLinkInfo = this.state.shareLinkModalState.linkInfo;
    if (oldLinkInfo === null) {
      throw new Error('oldLinkInfo should not be null');
    }

    // Create the request to add to ACL
    const patch_req: Record<string, string | Record<string, string>> = {};
    const entry: Record<string, string> = {};

    patch_req.action = 'add';

    // building entry value in request body
    if (values.hasOwnProperty('netid')) {
      entry._id = values.netid;
      entry.type = 'netid';
    } else if (values.hasOwnProperty('organization')) {
      entry._id = values.organization;
      entry.type = 'org';
    } else {
      throw new Error('Invalid entity.');
    }

    patch_req.entry = entry;
    patch_req.acl = values.permission;

    await fetch(`/api/v1/link/${oldLinkInfo.id}/acl`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(patch_req),
    });

    // update the state with the new ACL list, which rerenders the link sharing modal with the updated list
    this.setState({
      shareLinkModalState: {
        visible: this.state.shareLinkModalState.visible,
        entities: await this.getLinkACL(oldLinkInfo),
        linkInfo: oldLinkInfo,
        isLoading: false,
      },
    });
  };

  /**
   * Executes API request to add people the link is shared with
   * @param _id The _id of the entity being removed
   * @param type Whether the entity is a netid or an org
   * @throws Error if the value of `this.state.shareLinkModalState.linkInfo` is `null`
   */
  doUnshareLinkWithEntity = async (
    _id: string,
    type: string,
    permission: string
  ): Promise<void> => {
    const oldLinkInfo = this.state.shareLinkModalState.linkInfo;
    if (oldLinkInfo === null) {
      throw new Error('oldLinkInfo should not be null');
    }

    // Create the request to add to ACL
    const patch_req: Record<string, string | Record<string, string>> = {};
    const entry: Record<string, string> = {};

    patch_req.action = 'remove';

    // building entry value in request body
    entry._id = _id;
    entry.type = type;

    patch_req.entry = entry;
    patch_req.acl = permission.concat('s');

    await fetch(`/api/v1/link/${oldLinkInfo.id}/acl`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(patch_req),
    });

    // removing an editor actually downgrades them to a viewer. So, we send another request to downgrade editors twice, once to make them viewer, and once to completely remove them
    if (permission === 'editor') {
      patch_req.acl = 'viewers';
      await fetch(`/api/v1/link/${oldLinkInfo.id}/acl`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(patch_req),
      });
    }

    // update the state with the new ACL list, which rerenders the link sharing modal with the updated list
    this.setState({
      shareLinkModalState: {
        visible: this.state.shareLinkModalState.visible,
        entities: await this.getLinkACL(oldLinkInfo),
        linkInfo: oldLinkInfo,
        isLoading: this.state.shareLinkModalState.isLoading,
      },
    });
  };

  render(): React.ReactNode {
    return (
      <>
        <Row className="primary-row">
          <Col span={20}>
           <Space>
              <span className="page-title">Dashboard</span>
              {this.state.userOrgs === null ? (
                <></>
              ) : (
                <SearchBox
                  userPrivileges={this.props.userPrivileges}
                  userOrgs={this.state.userOrgs}
                  setQuery={this.setQuery}
                />
              )}
            </Space> 
          </Col>

          <Col span={4} className="btn-col">
            <Dropdown
              overlay={
                <CreateLinkForm
                  userPrivileges={this.props.userPrivileges}
                  onFinish={async () => {
                    this.setState({ createLinkDropdownVisible: false });
                    await this.refreshResults();
                  }}
                />
              }
              visible={this.state.createLinkDropdownVisible}
              onVisibleChange={(flag) =>
                this.setState({ createLinkDropdownVisible: flag })
              }
              placement="bottomRight"
              trigger={['click']}
            >
              <Button type="primary">
                <PlusCircleFilled /> Shrink a Link
              </Button>
            </Dropdown>
          </Col>
        </Row>

        {this.state.linkInfo === null ? (
          <Spin size="large" />
        ) : (
          <div className="dashboard-links">
            {this.state.linkInfo.map((linkInfo) => (
              <LinkRow
                key={linkInfo.id}
                linkInfo={linkInfo}
                showEditModal={this.showEditModal}
                showShareLinkModal={this.showShareLinkModal}
                showQrModal={this.showQrModal}
                refreshResults={this.refreshResults}
              />
            ))}

            <Pagination
              className="pagination"
              defaultCurrent={1}
              current={this.state.currentPage}
              showSizeChanger={false}
              total={this.state.totalLinks}
              onChange={this.setPage}
            />
          </div>
        )}

        {this.state.editModalState.linkInfo === null ? (
          <></>
        ) : (
          <EditLinkModal
            visible={this.state.editModalState.visible}
            userPrivileges={this.props.userPrivileges}
            netid={this.props.netid}
            linkInfo={this.state.editModalState.linkInfo}
            onOk={async (values) => {
              await this.doEditLink(values);
              this.hideEditModal();
            }}
            onCancel={this.hideEditModal}
          />
        )}

        {!this.state.shareLinkModalState.visible ? (
          <></>
        ) : (
          <ShareLinkModal
            visible={this.state.shareLinkModalState.visible}
            userPrivileges={this.props.userPrivileges}
            people={this.state.shareLinkModalState.entities}
            isLoading={this.state.shareLinkModalState.isLoading}
            onAddEntity={async (values: any) =>
              await this.doShareLinkWithEntity(values)
            }
            onRemoveEntity={async (
              _id: string,
              type: string,
              permission: string
            ) => await this.doUnshareLinkWithEntity(_id, type, permission)}
            onOk={this.hideShareLinkModal}
            onCancel={this.hideShareLinkModal}
          />
        )}

        {this.state.qrModalState.linkInfo === null ? (
          <></>
        ) : (
          <QrCodeModal
            visible={this.state.qrModalState.visible}
            width={256}
            linkInfo={this.state.qrModalState.linkInfo}
            onCancel={this.hideQrModal}
          />
        )}
      </>
    );
  }
}
