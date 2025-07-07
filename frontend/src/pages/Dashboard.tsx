/* eslint-disable react/no-unused-state */
import React from 'react';

import {
  Button,
  Col,
  Drawer,
  Empty,
  Form,
  Pagination,
  Radio,
  RadioChangeEvent,
  Row,
  Select,
  Space,
  Typography,
} from 'antd/lib';
import dayjs, { Dayjs } from 'dayjs';
import { FilterIcon, PlusCircleIcon } from 'lucide-react';
import { searchLinks, updateUserFilterOptions } from '../api/links';
import { getOrganizations } from '../api/organization';
import { serverValidateNetId } from '../api/validators';
import DatePicker from '../components/date-picker';
import Input from '../components/input';
import CreateLinkDrawer from '../drawers/CreateLinkDrawer';
import { Link, SearchQuery, SearchSet } from '../interfaces/link';
import { Organization } from '../interfaces/organizations';
import LinkCard from '../components/LinkCard';
import useFuzzySearch from '../lib/hooks/useFuzzySearch';

interface Props {
  userPrivileges: Set<string>;
  // eslint-disable-next-line react/no-unused-prop-types
  mockData?: Link[];
  // eslint-disable-next-line react/no-unused-prop-types
  filterOptions?: SearchQuery;
  demo?: boolean;
  searchFunction?: (query: string) => Array<{ item: Link }>;
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
  userOrgs: Organization[] | null;

  /**
   * An array of [[LinkInfo]] objects for the current search results.
   * @property
   */
  linkInfo: Link[] | null;

  /**
   * The filtered links from server before fuzzy search is applied
   * @property
   */
  serverFilteredLinks: Link[] | null;

  /**
   * The current fuzzy search query string
   * @property
   */
  fuzzySearchQuery: string;

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

// TODO --> Migrate to functional component to remove need for wrapper component
class Dashboard extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      userOrgs: null,
      linkInfo: this.props.mockData === undefined ? null : this.props.mockData,
      serverFilteredLinks:
        this.props.mockData === undefined ? null : this.props.mockData,
      fuzzySearchQuery: '',
      linksPerPage: 10,
      query:
        this.props.filterOptions === undefined
          ? {
              queryString: '',
              set: { set: 'user' },
              show_expired_links: false,
              show_deleted_links: false,
              sort: { key: 'relevance', order: 'descending' },
              begin_time: null,
              end_time: null,
              showType: 'links',
              owner: null,
            }
          : this.props.filterOptions,
      totalPages: 0,
      totalLinks: 0,
      currentPage: 1,
      currentOffset: 0,
      isCreateModalOpen: false,
      filterModalVisible: false,
      showExpired:
        this.props.filterOptions === undefined
          ? false
          : this.props.filterOptions.show_expired_links,
      showDeleted:
        this.props.filterOptions === undefined
          ? false
          : this.props.filterOptions.show_deleted_links,
      sortKey: 'relevance',
      sortOrder: 'descending',
      beginTime: null,
      endTime: null,
      orgDropdownOpen: false,
      orgLoading: false,
    };
  }

  async componentDidMount(): Promise<void> {
    await this.fetchUserOrgs();
  }

  componentDidUpdate(prevProps: Readonly<Props>): void {
    // update config once /info loads
    if (
      this.props.filterOptions !== prevProps.filterOptions &&
      this.props.filterOptions
    ) {
      this.setState(
        {
          query: {
            ...this.props.filterOptions,
            begin_time: this.props.filterOptions.begin_time
              ? dayjs(this.props.filterOptions.begin_time)
              : null,
            end_time: this.props.filterOptions.end_time
              ? dayjs(this.props.filterOptions.end_time)
              : null,
          },
          showExpired: this.props.filterOptions.show_expired_links,
          showDeleted: this.props.filterOptions.show_deleted_links,
          sortKey: this.props.filterOptions.sort.key,
          sortOrder: this.props.filterOptions.sort.order,
          beginTime: this.props.filterOptions.begin_time
            ? dayjs(this.props.filterOptions.begin_time)
            : null,
          endTime: this.props.filterOptions.end_time
            ? dayjs(this.props.filterOptions.end_time)
            : null,
          currentPage: 1,
          fuzzySearchQuery: '', // Reset fuzzy search when filter options change
        },
        () => {
          this.refreshResults();
        },
      );
    }
  }

  /**
   * Update filter options for user
   */
  updateFilterOptions = async () => {
    await updateUserFilterOptions(this.state.query);
  };

  /**
   * Fetch the organizations of which the user is a member.
   * @method
   */
  fetchUserOrgs = async (): Promise<void> => {
    if (this.props.demo) {
      return;
    }

    const userOrgs = await getOrganizations('user');
    this.setState({ userOrgs });
  };

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
   * Updates the link type in the state and executes a search query
   * @method
   * @param e The radio change event
   */
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
    dates: [Dayjs | null, Dayjs | null] | null,
    _: [string, string],
  ) => {
    this.setState(
      {
        query: {
          ...this.state.query,
          begin_time: dates?.[0] ?? null,
          end_time: dates?.[1] ?? null,
        },
      },
      () => this.setQuery(this.state.query),
    );
  };

  /**
   * Updates the fuzzy search query string
   * @method
   * @param e The input change event
   */
  updateFuzzySearch = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void => {
    const searchQuery = e.target.value;
    this.setState({ fuzzySearchQuery: searchQuery }, () => {
      this.applyFuzzySearch();
    });
  };

  /**
   * Applies fuzzy search to the current server-filtered results
   * @method
   */
  applyFuzzySearch = (): void => {
    const { serverFilteredLinks, fuzzySearchQuery } = this.state;

    if (
      !fuzzySearchQuery.trim() ||
      !serverFilteredLinks ||
      !this.props.searchFunction
    ) {
      this.setState({ linkInfo: serverFilteredLinks });
      return;
    }

    const results = this.props.searchFunction(fuzzySearchQuery);

    // For O(1) lookups/order preservation
    const indexMap = new Map();
    serverFilteredLinks.forEach((link, index) => {
      indexMap.set(link._id, index);
    });

    const sortedFilteredLinks = results
      .map((result) => result.item)
      .sort((a, b) => {
        const indexA = indexMap.get(a._id) ?? -1;
        const indexB = indexMap.get(b._id) ?? -1;
        return indexA - indexB;
      });

    this.setState({ linkInfo: sortedFilteredLinks });
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
    await this.updateFilterOptions();

    const totalPages = Math.ceil(results.count / this.state.linksPerPage);
    this.setState({
      serverFilteredLinks: results.results,
      linkInfo: results.results,
      query: newQuery,
      currentPage: 1,
      totalPages,
      currentOffset: this.state.linksPerPage,
      totalLinks: results.count,
      fuzzySearchQuery: '', // Reset fuzzy search on new server query
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
      serverFilteredLinks: results.results,
      linkInfo: results.results,
      currentPage: newPage,
      totalPages,
      currentOffset: newPage * this.state.linksPerPage,
      totalLinks: results.count,
      fuzzySearchQuery: '', // Reset fuzzy search on page change
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
  ): Promise<{ count: number; results: Link[] }> => {
    const req: any = {
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

    if (query.owner) {
      req.owner = query.owner;
    }

    const result = await searchLinks(req);

    return {
      count: result.count,
      results: result.results.map(
        (output: any) =>
          ({
            ...output,
            owner:
              output.owner && output.owner.type === 'org'
                ? {
                    ...output.owner,
                    orgName: getOrgInfo(output.owner._id).then(
                      (org) => org.name,
                    ),
                  }
                : output.owner,
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
          } as Link),
      ),
    };
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
                icon={<FilterIcon />}
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
                placeholder="Search links by title, alias, URL, or owner"
                value={this.state.fuzzySearchQuery}
                onChange={this.updateFuzzySearch}
                allowClear
              />
            </Space>
          </Col>
          <Col style={{ textAlign: 'right' }}>
            <Space>
              <Button
                type="primary"
                icon={<PlusCircleIcon />}
                onClick={() => {
                  if (this.props.demo) {
                    return;
                  }

                  this.setState({ isCreateModalOpen: true });
                }}
              >
                Create
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
                this.state.linkInfo.map((link: Link) => (
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
              pageSize={this.state.linksPerPage}
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
              owner: this.state.query.owner,
              sortKey: this.state.query.sort.key,
              show_expired: this.state.showExpired ? 'show' : 'hide',
              show_deleted: this.state.showDeleted ? 'show' : 'hide',
              links_vs_pixels: this.state.query.showType,
              dateRange: [this.state.beginTime, this.state.endTime],
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
                    onChange={this.showLinksInRange}
                    style={{ width: '100%' }}
                    value={[
                      dayjs(this.state.beginTime),
                      dayjs(this.state.endTime),
                    ]}
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

// Wrapper component that uses the fuzzy search hook
const DashboardWithFuzzySearch: React.FC<Omit<Props, 'searchFunction'>> = (
  props,
) => {
  const [serverFilteredLinks, setServerFilteredLinks] = React.useState<Link[]>(
    [],
  );

  const { search } = useFuzzySearch(serverFilteredLinks, {
    keys: ['title', 'alias', 'long_url', 'owner'],
    threshold: 0.3,
    distance: 100,
  });

  const dashboardRef = React.useRef<Dashboard>(null);

  // Update server filtered links when Dashboard component updates them
  React.useEffect(() => {
    const updateServerLinks = () => {
      const currentServerLinks =
        dashboardRef.current?.state.serverFilteredLinks;
      if (currentServerLinks && currentServerLinks !== serverFilteredLinks) {
        setServerFilteredLinks(currentServerLinks);
      }
    };

    const interval = setInterval(updateServerLinks, 100);
    return () => clearInterval(interval);
  }, [serverFilteredLinks]);

  return (
    <Dashboard
      userPrivileges={props.userPrivileges}
      mockData={props.mockData}
      filterOptions={props.filterOptions}
      demo={props.demo}
      ref={dashboardRef}
      searchFunction={search}
    />
  );
};

export default DashboardWithFuzzySearch;
