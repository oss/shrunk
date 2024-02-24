/**
 * Implements the [[Dashboard]] component
 * @packageDocumentation
 */

import React from 'react';

import {
  Row,
  Col,
  Pagination,
  Spin,
  Dropdown,
  Button,
  message,
} from 'antd/lib';
import { PlusCircleFilled } from '@ant-design/icons';

import moment from 'moment';
import { getOrgInfo, listOrgs, OrgInfo } from '../api/Org';
import { SearchBox } from '../components/SearchBox';
import { LinkRow } from '../components/LinkRow';
import { LinkInfo } from '../components/LinkInfo';
import { QrCodeModal } from '../components/QrCode';
import { EditLinkModal, EditLinkFormValues } from '../components/EditLinkModal';
import { ShareLinkModal } from '../components/ShareLinkModal';
import { CreateLinkForm } from '../components/CreateLinkForm';
import { OrgsSelect } from '../components/OrgsSelect';
import { FilterDropdown } from '../components/FilterDropdown';

import './Dashboard.less';

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
 * The type of the `set` parameter in the search query.
 * @type
 */
export type SearchSet =
  | { set: 'user' | 'shared' | 'all' }
  | { set: 'org'; org: string };

/**
 * The type of a search query
 * @interface
 */
export interface SearchQuery {
  /**
   * An array that holds query strings
   * @property
   */
  queryString: string;

  /**
   * The set of links to search (c.f. [[SearchSet]])
   * @property
   */
  set: SearchSet;

  /**
   * Whether to show expired links
   * @property
   */
  show_expired_links: boolean;

  /** Whether to show deleted links
   * @property
   */
  show_deleted_links: boolean;

  /**
   * The sort order and key
   * @property
   */
  sort: { key: string; order: string };

  /**
   * The beginning of the time range to search
   * @property
   */
  begin_time: moment.Moment | null;

  /**
   * The end of the time range to search
   * @property
   */
  end_time: moment.Moment | null;
}

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
  query: SearchQuery;

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
        queryString: '',
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
   * Updates the query string state and executes a search query
   * @method
   * @param newQueryString The new query string
   */
  updateQueryString = (newQueryString: string) => {
    this.setState(
      { query: { ...this.state.query, queryString: newQueryString } },
      () => this.setQuery(this.state.query),
    );
  };

  /**
   * Updates the query string in the state and executes a search query
   * @method
   * @param orgs The organization of which links will be shown
   */
  showByOrg = (orgs: SearchSet) => {
    this.setState({ query: { ...this.state.query, set: orgs } }, () =>
      this.setQuery(this.state.query),
    );
  };

  /**
   * Updates expired links being shown/not shown in the state and executes a search query
   * @method
   * @param show_expired_links Whether expired links are shown or not
   */
  showExpiredLinks = (show_expired_links: boolean) => {
    this.setState(
      {
        query: { ...this.state.query, show_expired_links },
      },
      () => this.setQuery(this.state.query),
    );
  };

  /**
   * Updates deleted links being shown/not shown in the state and executes a search query
   * @method
   * @param show_deleted_links Whether deleted links are shown or not
   */
  showDeletedLinks = (show_deleted_links: boolean) => {
    this.setState(
      {
        query: { ...this.state.query, show_deleted_links },
      },
      () => this.setQuery(this.state.query),
    );
  };

  /**
   * Updates the sort category in the state and executes a search query
   * @method
   * @param key Category that links can be sorted by
   */
  sortLinksByKey = (key: string) => {
    this.setState(
      {
        query: { ...this.state.query, sort: { ...this.state.query.sort, key } },
      },
      () => this.setQuery(this.state.query),
    );
  };

  /**
   * Updates the sort order in the state and executes a search query
   * @method
   * @param order Ascending or descending order
   */
  sortLinksByOrder = (order: string) => {
    this.setState(
      {
        query: {
          ...this.state.query,
          sort: { ...this.state.query.sort, order },
        },
      },
      () => this.setQuery(this.state.query),
    );
  };

  /**
   * Updates the beginning time in the state and executes a search query
   * @method
   * @param begin_time View links created after this date
   */
  showLinksAfter = (begin_time: moment.Moment) => {
    this.setState({ query: { ...this.state.query, begin_time } }, () =>
      this.setQuery(this.state.query),
    );
  };

  /**
   * Updates the end time in the state and executes a search query
   * @method
   * @param end_time View links created before this date
   */
  showLinksBefore = (end_time: moment.Moment) => {
    this.setState({ query: { ...this.state.query, end_time } }, () =>
      this.setQuery(this.state.query),
    );
  };

  /**
   * Executes a search query and updates component state with the results
   * @method
   * @param newQuery The new query
   */
  setQuery = async (newQuery: SearchQuery): Promise<void> => {
    const results = await this.doQuery(newQuery, 0, this.state.linksPerPage);

    const totalPages = Math.ceil(results.count / this.state.linksPerPage);
    this.setState({
      linkInfo: results.results,
      query: newQuery,
      currentPage: 1,
      totalPages,
      currentOffset: this.state.linksPerPage,
      totalLinks: results.count,
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
      this.state.linksPerPage,
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
    limit: number,
  ): Promise<{ count: number; results: LinkInfo[] }> => {
    const req: Record<string, any> = {
      query: query.queryString,
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
        (output: any) =>
        ({
          ...output,
          created_time: new Date(output.created_time),
          expiration_time: !output.expiration_time
            ? null
            : new Date(output.expiration_time),
          deletion_info: !output.deletion_info
            ? null
            : {
              deleted_by: output.deletion_info.deleted_by,
              deleted_time: new Date(output.deletion_info.deleted_time),
            },
        } as LinkInfo),
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

    const entities: Array<Entity> = [];
    for (let i = 0; i < sharingInfo.editors.length; i++) {
      if (sharingInfo.editors[i].type === 'netid') {
        entities.push({
          _id: sharingInfo.editors[i]._id,
          name: sharingInfo.editors[i]._id,
          type: 'netid',
          permission: 'editor',
        });
      } else if (sharingInfo.editors[i].type === 'org') {
        entities.push({
          _id: sharingInfo.editors[i]._id,
          name: (await getOrgInfo(sharingInfo.editors[i]._id)).name,
          type: 'org',
          permission: 'editor',
        });
      }
    }

    for (let i = 0; i < sharingInfo.viewers.length; i++) {
      if (
        sharingInfo.viewers[i].type === 'netid' &&
        !entities.some((entity) => entity._id === sharingInfo.viewers[i]._id) // don't show a person as a viewer if they're already an editor
      ) {
        entities.push({
          _id: sharingInfo.viewers[i]._id,
          name: sharingInfo.viewers[i]._id,
          type: 'netid',
          permission: 'viewer',
        });
      } else if (
        sharingInfo.viewers[i].type === 'org' &&
        !entities.some((entity) => entity._id === sharingInfo.viewers[i]._id) // don't show an org as a viewer if they're already an editor
      ) {
        entities.push({
          _id: sharingInfo.viewers[i]._id,
          name: (await getOrgInfo(sharingInfo.viewers[i]._id)).name,
          type: 'org',
          permission: 'viewer',
        });
      }
    }

    // sort the list of entities:
    // first sorts by permission (editor > viewer), then by type (org > netid), then alphabetically by id
    entities.sort(
      (entity1, entity2) =>
        entity1.permission.localeCompare(entity2.permission) ||
        entity2.type.localeCompare(entity1.type) ||
        entity1._id.localeCompare(entity2._id),
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
        linkInfo,
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
    const patchReq: Record<string, any> = {};
    if (values.title !== oldLinkInfo.title) {
      patchReq.title = values.title;
    }
    if (values.long_url !== oldLinkInfo.long_url) {
      patchReq.long_url = values.long_url;
    }
    if (values.owner !== oldLinkInfo.owner) {
      patchReq.owner = values.owner;
    }
    if (values.expiration_time !== oldLinkInfo.expiration_time) {
      patchReq.expiration_time =
        values.expiration_time === null
          ? null
          : values.expiration_time.format();
    }

    const promises = [];
    const patchRequest = await fetch(`/api/v1/link/${oldLinkInfo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patchReq),
    });

    // //get the status and the json message
    const patchRequestStatus = patchRequest.status;

    if (patchRequestStatus !== 204) {
      message.error(
        'There was an error editing the link. If modifying long URL, you might need to create a new link.',
        4,
      );
      return;
    }

    const oldAliases = new Map(
      oldLinkInfo.aliases.map((alias) => [alias.alias, alias]),
    );
    const newAliases = new Map(
      values.aliases.map((alias) => [alias.alias, alias]),
    );

    // Delete aliases that no longer exist
    for (const alias of oldAliases.keys()) {
      if (!newAliases.has(alias)) {
        promises.push(
          fetch(`/api/v1/link/${oldLinkInfo.id}/alias/${alias}`, {
            method: 'DELETE',
          }),
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
          }),
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
    const patchReq: Record<string, string | Record<string, string>> = {};
    const entry: Record<string, string> = {};

    patchReq.action = 'add';

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

    patchReq.entry = entry;
    patchReq.acl = values.permission;

    await fetch(`/api/v1/link/${oldLinkInfo.id}/acl`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(patchReq),
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
    permission: string,
  ): Promise<void> => {
    const oldLinkInfo = this.state.shareLinkModalState.linkInfo;
    if (oldLinkInfo === null) {
      throw new Error('oldLinkInfo should not be null');
    }

    // Create the request to add to ACL
    const patchReq: Record<string, string | Record<string, string>> = {};
    const entry: Record<string, string> = {};

    patchReq.action = 'remove';

    // building entry value in request body
    entry._id = _id;
    entry.type = type;

    patchReq.entry = entry;
    patchReq.acl = permission.concat('s');

    await fetch(`/api/v1/link/${oldLinkInfo.id}/acl`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(patchReq),
    });

    // removing an editor actually downgrades them to a viewer. So, we send another request to downgrade editors twice, once to make them viewer, and once to completely remove them
    if (permission === 'editor') {
      patchReq.acl = 'viewers';
      await fetch(`/api/v1/link/${oldLinkInfo.id}/acl`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(patchReq),
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
        <Row className="dashboard-title">
          <Col>
            <span className="page-title">URL Dashboard</span>
          </Col>
        </Row>
        <Row className="primary-row" gutter={[8, 24]}>
          <Col xs={{ span: 24 }} sm={{ span: 9 }}>
            {this.state.userOrgs === null ? (
              <></>
            ) : (
              <SearchBox updateQueryString={this.updateQueryString} />
            )}
          </Col>
          <Col>
            {this.state.userOrgs === null ? (
              <></>
            ) : (
              <OrgsSelect
                userPrivileges={this.props.userPrivileges}
                userOrgs={this.state.userOrgs}
                showByOrg={this.showByOrg}
              />
            )}
          </Col>
          <Col>
            {this.state.userOrgs === null ? (
              <></>
            ) : (
              <FilterDropdown
                userPrivileges={this.props.userPrivileges}
                showDeletedLinks={this.showDeletedLinks}
                showExpiredLinks={this.showExpiredLinks}
                sortLinksByKey={this.sortLinksByKey}
                sortLinksByOrder={this.sortLinksByOrder}
                showLinksAfter={this.showLinksAfter}
                showLinksBefore={this.showLinksBefore}
              />
            )}
          </Col>
          <Col className="shrink-link">
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
                netid={this.props.netid}
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

            <Pagination
              className="pagination-simple"
              defaultCurrent={1}
              current={this.state.currentPage}
              showSizeChanger={false}
              total={this.state.totalLinks}
              onChange={this.setPage}
              simple
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

        {!this.state.shareLinkModalState.linkInfo === null ? (
          <></>
        ) : (
          <ShareLinkModal
            visible={this.state.shareLinkModalState.visible}
            userPrivileges={this.props.userPrivileges}
            people={this.state.shareLinkModalState.entities}
            isLoading={this.state.shareLinkModalState.isLoading}
            linkInfo={this.state.shareLinkModalState.linkInfo}
            onAddEntity={async (values: any) =>
              this.doShareLinkWithEntity(values)
            }
            onRemoveEntity={async (
              _id: string,
              type: string,
              permission: string,
            ) => this.doUnshareLinkWithEntity(_id, type, permission)}
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
