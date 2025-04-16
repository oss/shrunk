/* eslint-disable react/no-unused-state */
/**
 * Implements the [[Dashboard]] component
 * @packageDocumentation
 */

import React from 'react';

import {
  Row,
  Col,
  Button,
  Typography,
  Input,
  Space,
  Form,
  Select,
  DatePicker,
  Radio,
  RadioChangeEvent,
  Drawer,
  Pagination,
  Empty,
} from 'antd/lib';
import { PlusCircleFilled, FilterOutlined } from '@ant-design/icons';

import dayjs, { Dayjs } from 'dayjs';
import { listOrgs, OrgInfo } from '../api/Org';
import { LinkInfo } from '../components/LinkInfo';
import { CreateLinkDrawer } from '../drawers/CreateLinkDrawer';
import { serverValidateNetId } from '../lib/validators';
import LinkCard from '../components/LinkCard';

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

  showType: 'links' | 'tracking_pixels';

  owner: string | null;
}

/**
 * Props for the [[Dashboard]] component.
 * @interface
 */
interface Props {
  userPrivileges: Set<string>;
  // eslint-disable-next-line react/no-unused-prop-types
  netid: string;

  demo?: boolean;
  mockData?: LinkInfo[];
}

/**
 * State of the [[Dashboard]] component.
 * @interface
 */
interface State {
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

  orgDropdownOpen: boolean;

  orgLoading: boolean;
}

export class Dashboard extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      userOrgs: null,
      linkInfo: this.props.mockData === undefined ? null : this.props.mockData,
      linksPerPage: 10,
      query: {
        queryString: '',
        set: { set: 'user' },
        show_expired_links: false,
        show_deleted_links: false,
        sort: { key: 'relevance', order: 'descending' },
        begin_time: null,
        end_time: null,
        showType: 'links',
        owner: null,
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
      orgDropdownOpen: false,
      orgLoading: false,
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
    if (this.props.demo) {
      return;
    }

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

  sortByType = (e: RadioChangeEvent) => {
    const key = e.target.value;
    this.setState(
      {
        query: { ...this.state.query, showType: key },
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

  showLinksInRange = (
    dates: NoUndefinedRangeValueType<Dayjs> | null,
    _: [string, string],
  ) => {
    this.setState(
      {
        query: {
          ...this.state.query,
          begin_time: dates[0],
          end_time: dates[1],
        },
      },
      () => this.setQuery(this.state.query),
    );
  };

  /**
   * Executes a search query and updates component state with the results
   * @method
   * @param newQuery The new query
   */
  setQuery = async (newQuery: SearchQuery): Promise<void> => {
    if (this.props.demo) {
      return;
    }

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
    if (this.props.demo) {
      this.setState({ currentPage: newPage });
      return;
    }

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
      show_type: query.showType,
    };

    if (query.begin_time !== null) {
      req.begin_time = query.begin_time.format();
    }

    if (query.end_time !== null) {
      req.end_time = query.end_time.format();
    }

    if (query.owner !== null || query.owner === '') {
      req.owner = query.owner;
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
    const result = await fetch('/api/v1/config', {
      method: 'GET',
    }).then((resp) => resp.json());

    const isEnabled = result.tracking_pixel;
    this.setState({ trackingPixelEnabled: isEnabled });
  };

  updateOrg = async (value: string): Promise<void> => {
    this.setState({ orgLoading: true });
    setTimeout(() => {
      if (value.startsWith('org_')) {
        const orgId = value.slice(4);
        this.showByOrg({ set: 'org', org: orgId });
      } else {
        this.showByOrg({ set: value as 'user' | 'shared' | 'all' });
      }
      this.setState({ orgLoading: false });
    }, 300);
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
              <Button
                icon={<FilterOutlined />}
                onClick={() => {
                  if (this.props.demo) {
                    return;
                  }
                  this.setState({ filterModalVisible: true });
                }}
              >
                Filter
              </Button>
              <Input.Search
                style={{ width: 500 }}
                placeholder="Find a shortend link by its alias"
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
                onClick={() => {
                  if (this.props.demo) {
                    return;
                  }

                  this.setState({ isCreateModalOpen: true });
                }}
              >
                Shrink
              </Button>
            </Space>
          </Col>
          <Col span={24}>
            <Row gutter={[16, 8]}>
              {this.state.linkInfo === null ||
              this.state.linkInfo.length === 0 ? (
                <Col span={24}>
                  <Empty />
                </Col>
              ) : (
                this.state.linkInfo.map((link: LinkInfo) => (
                  <Col span={24}>
                    <LinkCard linkInfo={link} />
                  </Col>
                ))
              )}
            </Row>
          </Col>
          <Col span={24}>
            <Pagination
              align="center"
              defaultCurrent={1}
              current={this.state.currentPage}
              showSizeChanger={false}
              total={this.state.totalLinks}
              onChange={this.setPage}
            />
          </Col>
        </Row>

        <CreateLinkDrawer
          title="Create Link"
          visible={this.state.isCreateModalOpen}
          onCancel={() => this.setState({ isCreateModalOpen: false })}
          onFinish={async () => {
            await this.refreshResults();
            this.setState({ isCreateModalOpen: false });
          }}
          userPrivileges={this.props.userPrivileges}
          userOrgs={this.state.userOrgs ? this.state.userOrgs : []}
          tracking_pixel_ui_enabled={this.state.trackingPixelEnabled}
        />

        <Drawer
          title="Filter Links"
          width={720}
          open={this.state.filterModalVisible}
          onClose={() => this.setState({ filterModalVisible: false })}
          placement="left"
        >
          <Form
            layout="vertical"
            initialValues={{
              orgSelect: this.state.query.set.set,
              show_expired: 'hide',
              show_deleted: 'hide',
              links_vs_pixels: 'links',
              sortKey: 'relevance',
              sortOrder: 'descending',
            }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="orgSelect" label="Links">
                  <Select onChange={this.updateOrg}>
                    <Select.Option value="user">My Links</Select.Option>
                    <Select.Option value="shared">Shared with Me</Select.Option>
                    {this.props.userPrivileges.has('admin') && (
                      <Select.Option value="all">All Links</Select.Option>
                    )}
                    {this.state.userOrgs?.length && (
                      <Select.OptGroup label="My Organizations">
                        {this.state.userOrgs.map((info) => (
                          <Select.Option key={info.id} value={`org_${info.id}`}>
                            <em>{info.name}</em>
                          </Select.Option>
                        ))}
                      </Select.OptGroup>
                    )}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="owner"
                  label="Owner"
                  rules={[{ validator: serverValidateNetId }]}
                >
                  <Input
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      this.setState({
                        query: { ...this.state.query, owner: e.target.value },
                      });
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="sortKey" label="Sort by">
                  <Select
                    value={this.state.sortKey}
                    onChange={this.sortLinksByKey}
                    style={{ width: '100%' }}
                  >
                    <Select.Option value="relevance">Relevance</Select.Option>
                    <Select.Option value="created_time">
                      Time created
                    </Select.Option>
                    <Select.Option value="title">Title</Select.Option>
                    <Select.Option value="visits">
                      Number of visits
                    </Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="dateRange" label="Creation Date">
                  <DatePicker.RangePicker
                    format="YYYY-MM-DD"
                    value={[this.state.beginTime, this.state.endTime]}
                    onChange={this.showLinksInRange}
                    style={{ width: '100%' }}
                    allowEmpty={[false, true]} // Allow the second date to be empty
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="show_expired" label="Expired Links">
                  <Radio.Group
                    optionType="button"
                    buttonStyle="solid"
                    options={[
                      { label: 'Show', value: 'show' },
                      { label: 'Hide', value: 'hide' },
                    ]}
                    defaultValue="hide"
                    onChange={(e) =>
                      this.showExpiredLinks(e.target.value === 'show')
                    }
                  />
                </Form.Item>
              </Col>
              {this.props.userPrivileges.has('admin') && (
                <Col span={12}>
                  <Form.Item name="show_deleted" label="Deleted Links">
                    <Radio.Group
                      optionType="button"
                      buttonStyle="solid"
                      options={[
                        { label: 'Show', value: 'show' },
                        { label: 'Hide', value: 'hide' },
                      ]}
                      defaultValue="hide"
                      onChange={(e) =>
                        this.showDeletedLinks(e.target.value === 'show')
                      }
                    />
                  </Form.Item>
                </Col>
              )}
              <Col span={12}>
                <Form.Item name="links_vs_pixels" label="Link Type">
                  <Radio.Group
                    optionType="button"
                    buttonStyle="solid"
                    options={[
                      { label: 'Links', value: 'links' },
                      { label: 'Tracking Pixels', value: 'tracking_pixels' },
                    ]}
                    defaultValue={this.state.query.showType}
                    onChange={this.sortByType}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Drawer>
      </>
    );
  }
}
