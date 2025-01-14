/**
 * Implements the [[Dashboard]] component
 * @packageDocumentation
 */

import React from 'react';

import {
  Row,
  Col,
  Spin,
  Button,
  Typography,
  Table,
  Input,
  Space,
  Modal,
  Form,
  Select,
  Checkbox,
  DatePicker,
  Tooltip,
  Dropdown,
} from 'antd/lib';
import {
  CopyOutlined,
  PlusCircleFilled,
  FilterOutlined,
  EyeOutlined,
  DeleteOutlined,
  TeamOutlined,
  ShareAltOutlined,
  EditOutlined,
  SlidersOutlined,
} from '@ant-design/icons';

import dayjs from 'dayjs';
import { getOrgInfo, listOrgs, OrgInfo } from '../api/Org';
import { LinkInfo } from '../components/LinkInfo';
import { CreateLinkForm } from '../components/CreateLinkForm';

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
  begin_time: dayjs.Dayjs | null;

  /**
   * The end of the time range to search
   * @property
   */
  end_time: dayjs.Dayjs | null;
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
  CollaboratorLinkModalState: {
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
   * Whether the tracking pixel feature is enabled
   * @property
   */
  trackingPixelEnabled: boolean;

  isCreateModalOpen: boolean;

  filterModalVisible: boolean;

  showExpired: boolean;

  showDeleted: boolean;

  sortKey: string;

  sortOrder: string;

  beginTime: dayjs.Dayjs | null;

  endTime: dayjs.Dayjs | null;

  selectedOrg: number | string;

  orgDropdownOpen: boolean;

  orgLoading: boolean;

  visibleColumns: Set<string>;

  customizeDropdownOpen: boolean;
}

// TODO: Add title column
// TODO: Next page does not work
// TODO: Add option to full-screen for more information

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
        sort: { key: 'relevance', order: 'descending' },
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
      CollaboratorLinkModalState: {
        visible: false,
        entities: [],
        linkInfo: null,
        isLoading: false,
      },
      qrModalState: {
        visible: false,
        linkInfo: null,
      },
      trackingPixelEnabled: false,
      isCreateModalOpen: false,
      filterModalVisible: false,
      showExpired: false,
      showDeleted: false,
      sortKey: 'relevance',
      sortOrder: 'descending',
      beginTime: null,
      endTime: null,
      selectedOrg: this.props.userPrivileges.has('admin') ? 1 : 0,
      orgDropdownOpen: false,
      orgLoading: false,
      visibleColumns: new Set([
        'longUrl',
        'owner',
        'dateCreated',
        'uniqueVisits',
        'totalVisits',
      ]),
      customizeDropdownOpen: false,
    };
  }

  async componentDidMount(): Promise<void> {
    await Promise.all([this.fetchUserOrgs(), this.refreshResults()]);
    await this.trackingPixelEnabledOnUI();
  }

  onSearch = async () => {
    this.setQuery(this.state.query);
  };

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
  updateQueryString = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const newQueryString = e.target.value;
    this.setState({
      query: { ...this.state.query, queryString: newQueryString },
    });
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
   */
  showExpiredLinks = (show_expired_links: boolean) => {
    this.setState(
      {
        showExpired: show_expired_links,
        query: { ...this.state.query, show_expired_links },
      },
      () => this.setQuery(this.state.query),
    );
  };

  /**
   * Updates deleted links being shown/not shown in the state and executes a search query
   */
  showDeletedLinks = (show_deleted_links: boolean) => {
    this.setState(
      {
        showDeleted: show_deleted_links,
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
  showLinksAfter = (begin_time: dayjs.Dayjs) => {
    this.setState({ query: { ...this.state.query, begin_time } }, () =>
      this.setQuery(this.state.query),
    );
  };

  /**
   * Updates the end time in the state and executes a search query
   * @method
   * @param end_time View links created before this date
   */
  showLinksBefore = (end_time: dayjs.Dayjs) => {
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
   * Check if tracking pixel ui is enabled
   * @method
   */
  trackingPixelEnabledOnUI = async () => {
    const result = await fetch('/api/v1/link/tracking_pixel_ui_enabled', {
      method: 'GET',
    }).then((resp) => resp.json());

    const is_enabled = result.enabled;
    this.setState({ trackingPixelEnabled: is_enabled });
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
      CollaboratorLinkModalState: {
        visible: this.state.CollaboratorLinkModalState.visible,
        entities: this.state.CollaboratorLinkModalState.entities,
        linkInfo: this.state.CollaboratorLinkModalState.linkInfo,
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
      CollaboratorLinkModalState: {
        visible: this.state.CollaboratorLinkModalState.visible,
        entities: this.state.CollaboratorLinkModalState.entities,
        linkInfo: this.state.CollaboratorLinkModalState.linkInfo,
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
  showCollaboratorLinkModal = async (linkInfo: LinkInfo): Promise<void> => {
    this.setState({
      CollaboratorLinkModalState: {
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
  hideCollaboratorLinkModal = (): void => {
    this.setState({
      CollaboratorLinkModalState: {
        ...this.state.CollaboratorLinkModalState,
        visible: false,
      },
    });

    // We set a timeout for this to prevent the contents of the modal
    // from changing while the modal-close animation is still in progress.
    setTimeout(() => {
      this.setState({
        CollaboratorLinkModalState: {
          ...this.state.CollaboratorLinkModalState,
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
   * Executes API request to add people the link is shared with
   * @param values The form values from the edit link form
   * @throws Error if the value of `this.state.CollaboratorLinkModalState.linkInfo` is `null`
   */
  doShareLinkWithEntity = async (values: any): Promise<void> => {
    this.setState({
      CollaboratorLinkModalState: {
        visible: this.state.CollaboratorLinkModalState.visible,
        entities: this.state.CollaboratorLinkModalState.entities,
        linkInfo: this.state.CollaboratorLinkModalState.linkInfo,
        isLoading: true,
      },
    });

    const oldLinkInfo = this.state.CollaboratorLinkModalState.linkInfo;
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
      CollaboratorLinkModalState: {
        visible: this.state.CollaboratorLinkModalState.visible,
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
   * @throws Error if the value of `this.state.CollaboratorLinkModalState.linkInfo` is `null`
   */
  doUnshareLinkWithEntity = async (
    _id: string,
    type: string,
    permission: string,
  ): Promise<void> => {
    const oldLinkInfo = this.state.CollaboratorLinkModalState.linkInfo;
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
      CollaboratorLinkModalState: {
        visible: this.state.CollaboratorLinkModalState.visible,
        entities: await this.getLinkACL(oldLinkInfo),
        linkInfo: oldLinkInfo,
        isLoading: this.state.CollaboratorLinkModalState.isLoading,
      },
    });
  };

  updateOrg = async (value: any): Promise<void> => {
    this.setState({ orgLoading: true });
    setTimeout(() => {
      this.setState({ selectedOrg: value });
      const searchSet: SearchSet =
        value === 0
          ? { set: 'user' }
          : value === 1
          ? { set: 'all' }
          : value === 2
          ? { set: 'shared' }
          : { set: 'org', org: value as string };
      this.showByOrg(searchSet);
      this.setState({ orgLoading: false });
    }, 300);
  };

  handleColumnVisibilityChange = (selectedColumns: string[]) => {
    this.setState({ visibleColumns: new Set(selectedColumns) });
  };

  handleCustomizeClick = () => {
    this.setState((prevState) => ({
      customizeDropdownOpen: !prevState.customizeDropdownOpen,
    }));
  };

  render(): React.ReactNode {
    return (
      <>
        <Row>
          <Typography.Title>URL Shortener</Typography.Title>
        </Row>
        <Row gutter={[16, 16]} justify="space-between">
          <Col span={12}>
            <Space>
              <Dropdown
                trigger={['click']}
                open={this.state.customizeDropdownOpen}
                menu={{
                  items: [
                    { label: 'Long URL', key: 'longUrl' },
                    { label: 'Owner', key: 'owner' },
                    { label: 'Date Created', key: 'dateCreated' },
                    { label: 'Date Expires', key: 'dateExpires' },
                    { label: 'Unique Visits', key: 'uniqueVisits' },
                    { label: 'Total Visits', key: 'totalVisits' },
                  ].map((item) => ({
                    key: item.key,
                    label: (
                      <Checkbox
                        checked={this.state.visibleColumns.has(item.key)}
                        onChange={(e) => {
                          const newColumns = new Set(this.state.visibleColumns);
                          if (e.target.checked) {
                            newColumns.add(item.key);
                          } else {
                            newColumns.delete(item.key);
                          }
                          this.setState({ visibleColumns: newColumns });
                        }}
                      >
                        {item.label}
                      </Checkbox>
                    ),
                  })),
                }}
              >
                <Button
                  icon={<SlidersOutlined />}
                  onClick={this.handleCustomizeClick}
                >
                  Customize
                </Button>
              </Dropdown>
              <Button
                icon={<FilterOutlined />}
                onClick={() => this.setState({ filterModalVisible: true })}
              >
                Filter
              </Button>
              <Input.Search
                style={{ width: 500 }}
                placeholder="Find a shortened link"
                onChange={this.updateQueryString}
                onSearch={this.onSearch}
              />
            </Space>
          </Col>
          <Col style={{ textAlign: 'right' }}>
            <Space>
              <Button
                type="primary"
                icon={<PlusCircleFilled />}
                onClick={() => this.setState({ isCreateModalOpen: true })}
              >
                Create Link
              </Button>
            </Space>
          </Col>
          <Col span={24}>
            {this.state.linkInfo === null ? (
              <Spin size="large" />
            ) : (
              <Table
                scroll={{ x: 'calc(700px + 50%)' }}
                columns={[
                  {
                    title: 'Aliases',
                    dataIndex: 'aliases',
                    key: 'aliases',
                    width: '30%',
                    fixed: 'left',
                    render: (_, record) => (
                      <Row gutter={[0, 8]}>
                        <Col span={24}>
                          <Typography.Title level={5} style={{ margin: 0 }}>
                            {record.title}
                          </Typography.Title>
                        </Col>
                        {record.aliases.map((aliasObj) => {
                          const isDev = process.env.NODE_ENV === 'development';
                          const protocol = isDev ? 'http' : 'https';
                          const shortUrl = `${protocol}://${
                            document.location.host
                          }/${aliasObj.alias.toString()}`;
                          return (
                            <Col span={24}>
                              <Button
                                type="text"
                                onClick={() =>
                                  navigator.clipboard.writeText(shortUrl)
                                }
                              >
                                <Space>
                                  <CopyOutlined />
                                  <Typography key={aliasObj.alias}>
                                    {shortUrl}
                                  </Typography>
                                </Space>
                              </Button>
                            </Col>
                          );
                        })}
                      </Row>
                    ),
                  },
                  ...(this.state.visibleColumns.has('longUrl')
                    ? [
                        {
                          title: 'Long URL',
                          dataIndex: 'longUrl',
                          key: 'longUrl',
                          width: '40%',
                          fixed: 'left',
                          render: (_, record) => (
                            <Typography.Link href={record.longUrl} ellipsis>
                              {record.longUrl}
                            </Typography.Link>
                          ),
                        },
                      ]
                    : []),
                  ...(this.state.visibleColumns.has('owner')
                    ? [
                        {
                          title: 'Owner',
                          dataIndex: 'owner',
                          key: 'owner',
                          width: '15%',
                          sorter: (a, b) => a.owner.localeCompare(b.owner),
                        },
                      ]
                    : []),
                  ...(this.state.visibleColumns.has('dateCreated')
                    ? [
                        {
                          title: 'Date Created',
                          dataIndex: 'dateCreated',
                          key: 'dateCreated',
                          width: '15%',
                          sorter: (a, b) =>
                            dayjs(a.dateCreated).unix() -
                            dayjs(b.dateCreated).unix(),
                        },
                      ]
                    : []),
                  ...(this.state.visibleColumns.has('dateExpires')
                    ? [
                        {
                          title: 'Date Expires',
                          dataIndex: 'dateExpires',
                          key: 'dateExpires',
                          width: '15%',
                          render: (_, record) =>
                            record.dateExpires
                              ? dayjs(record.dateExpires).format('MMM DD, YYYY')
                              : 'Never',
                          sorter: (a, b) => {
                            if (!a.dateExpires) return 1;
                            if (!b.dateExpires) return -1;
                            return (
                              dayjs(a.dateExpires).unix() -
                              dayjs(b.dateExpires).unix()
                            );
                          },
                        },
                      ]
                    : []),
                  ...(this.state.visibleColumns.has('uniqueVisits')
                    ? [
                        {
                          title: 'Unique Visits',
                          dataIndex: 'uniqueVisits',
                          key: 'uniqueVisits',
                          width: '15%',
                          sorter: (a, b) => a.uniqueVisits - b.uniqueVisits,
                        },
                      ]
                    : []),
                  ...(this.state.visibleColumns.has('totalVisits')
                    ? [
                        {
                          title: 'Total Visits',
                          dataIndex: 'totalVisits',
                          key: 'totalVisits',
                          width: '15%',
                          sorter: (a, b) => a.totalVisits - b.totalVisits,
                        },
                      ]
                    : []),
                  {
                    title: 'Actions',
                    key: 'actions',
                    fixed: 'right',
                    width: '25%',
                    render: (_, record) => (
                      <Space>
                        <Tooltip title="View">
                          <Button
                            type="text"
                            icon={<EyeOutlined />}
                            href={`/app/#/links/${record.key}/view`}
                          />
                        </Tooltip>
                        <Tooltip title="Edit">
                          <Button
                            type="text"
                            icon={<EditOutlined />}
                            target="_blank"
                            href={`/app/#/links/${record.key}/view?mode=edit`}
                          />
                        </Tooltip>
                        <Tooltip title="Collaborate">
                          <Button
                            type="text"
                            icon={<TeamOutlined />}
                            target="_blank"
                            href={`/app/#/links/${record.key}/view?mode=collaborate`}
                          />
                        </Tooltip>
                        <Tooltip title="Share">
                          <Button
                            type="text"
                            icon={<ShareAltOutlined />}
                            target="_blank"
                            href={`/app/#/links/${record.key}/view?mode=share`}
                          />
                        </Tooltip>
                        <Tooltip title="Delete">
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                          />
                        </Tooltip>
                      </Space>
                    ),
                  },
                ].filter((col) => !col.hidden)}
                dataSource={this.state.linkInfo.map((link) => ({
                  key: link.id,
                  title: link.title,
                  aliases: link.aliases,
                  longUrl: link.long_url,
                  owner: link.owner,
                  dateCreated: dayjs(link.created_time).format('MMM DD, YYYY'),
                  uniqueVisits: link.unique_visits,
                  totalVisits: link.visits,
                  dateExpires: link.expiration_time,
                }))}
                pagination={{
                  total: this.state.totalLinks,
                  current: this.state.currentPage,
                  onChange: (page) => this.setPage(page),
                }}
              />
            )}
          </Col>
        </Row>

        <Modal
          open={this.state.isCreateModalOpen}
          onCancel={() => this.setState({ isCreateModalOpen: false })}
          width="50%"
          title="Create Link"
          footer={null}
        >
          <CreateLinkForm
            onFinish={async () => {
              await this.refreshResults();
              this.setState({ isCreateModalOpen: false });
            }}
            userPrivileges={this.props.userPrivileges}
            userOrgs={this.state.userOrgs}
            refreshResults={this.refreshResults}
          />
        </Modal>

        <Modal
          title="Filter Links"
          open={this.state.filterModalVisible}
          onCancel={() => this.setState({ filterModalVisible: false })}
          footer={null}
        >
          <Form
            layout="vertical"
            initialValues={{
              orgSelect: this.props.userPrivileges.has('admin') ? 1 : 0,
              sortKey: 'relevance',
              sortOrder: 'descending',
            }}
          >
            <Form.Item name="orgSelect" label="Filter by organization">
              <Select value={this.state.selectedOrg} onChange={this.updateOrg}>
                <Select.Option value={0}>My Links</Select.Option>
                <Select.Option value={2}>Shared with Me</Select.Option>
                {!this.props.userPrivileges.has('admin') ? null : (
                  <Select.Option value={1}>All Links</Select.Option>
                )}
                {this.state.userOrgs?.length ? (
                  <Select.OptGroup label="My Organizations">
                    {this.state.userOrgs.map((info) => (
                      <Select.Option key={info.id} value={info.id}>
                        <em>{info.name}</em>
                      </Select.Option>
                    ))}
                  </Select.OptGroup>
                ) : null}
              </Select>
            </Form.Item>
            <Form.Item name="sortKey" label="Sort by">
              <Select
                value={this.state.sortKey}
                onChange={this.sortLinksByKey}
                style={{ width: '100%' }}
              >
                <Select.Option value="relevance">Relevance</Select.Option>
                <Select.Option value="created_time">Time created</Select.Option>
                <Select.Option value="title">Title</Select.Option>
                <Select.Option value="visits">Number of visits</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="show_expired">
              <Checkbox
                checked={this.state.showExpired}
                onChange={(e) => this.showExpiredLinks(e.target.checked)}
              >
                Show expired links?
              </Checkbox>
            </Form.Item>
            {this.props.userPrivileges.has('admin') && (
              <Form.Item name="show_deleted">
                <Checkbox
                  checked={this.state.showDeleted}
                  onChange={(e) => this.showDeletedLinks(e.target.checked)}
                >
                  Show deleted links?
                </Checkbox>
              </Form.Item>
            )}
            <Form.Item name="beginTime" label="Created after">
              <DatePicker
                format="YYYY-MM-DD"
                value={this.state.beginTime}
                onChange={this.showLinksAfter}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item name="endTime" label="Created before">
              <DatePicker
                format="YYYY-MM-DD"
                value={this.state.endTime}
                onChange={this.showLinksBefore}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Form>
        </Modal>
      </>
    );
  }
}
