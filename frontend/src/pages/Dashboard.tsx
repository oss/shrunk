/* eslint-disable react/no-unused-state */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Input as AntInput,
  Flex,
  Layout,
  Space,
  Affix,
  Tooltip,
  Tree,
  TreeSelect,
  Button,
  Col,
  Empty,
  Form,
  Pagination,
  Radio,
  RadioChangeEvent,
  Select,
  Typography,
  notification,
} from 'antd';
import type { TreeDataNode, TreeProps, InputRef } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import {
  PlusIcon,
  PlusCircleIcon,
  ArrowUpAZIcon,
  ArrowDownZAIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react';
import { searchLinks, updateUserFilterOptions } from '../api/links';
import { getOrganizations } from '../api/organization';
import { serverValidateNetId } from '../api/validators';
import DatePicker from '../components/date-picker';
import Input from '../components/input';
import CreateLinkDrawer from '../drawers/CreateLinkDrawer';
import { Link, SearchQuery, SearchSet } from '../interfaces/link';
import { Organization } from '../interfaces/organizations';
import LinkCard from '../components/LinkCard';

interface DataNode {
  title: string;
  key: string;
  value?: string;
}

interface Props {
  userPrivileges: Set<string>;
  mockData?: Link[];
  filterOptions?: SearchQuery;
  demo?: boolean;
}

interface Filters {
  title: string;
  alias: string;
  owner: string;
  url: string;
}

const filterKeys: Array<keyof Filters> = ['title', 'alias', 'owner', 'url'];

const DEFAULT_QUERY: SearchQuery = {
  queryString: '',
  alias: '',
  title: '',
  url: '',
  set: [{ set: 'user' }],
  show_expired_links: false,
  show_deleted_links: false,
  sort: { key: 'relevance', order: 'descending' },
  begin_time: null,
  end_time: null,
  showType: 'links',
  owner: null,
};

const findByValue = (
  nodes: (TreeDataNode & { value?: string })[],
  value: string,
): (TreeDataNode & { value?: string }) | undefined => {
  const directMatch = nodes.find((node) => node.value === value);
  if (directMatch) {
    return directMatch;
  }

  return nodes.reduce<(TreeDataNode & { value?: string }) | undefined>(
    (found, node) => {
      if (found) return found;
      return node.children ? findByValue(node.children, value) : undefined;
    },
    undefined,
  );
};

const getValueFromSearchSet = (search: SearchSet): string => {
  if (search.set === 'org') {
    return `org_${search.org}`;
  }
  return search.set;
};

export default function Dashboard({
  userPrivileges,
  mockData,
  filterOptions,
  demo,
}: Props) {
  const titleInputRef = useRef<InputRef>(null);
  const aliasInputRef = useRef<InputRef>(null);
  const urlInputRef = useRef<InputRef>(null);
  const ownerInputRef = useRef<InputRef>(null);

  const [api, contextHolder] = notification.useNotification();

  const [userOrgs, setUserOrgs] = useState<Organization[] | null>(null);
  const [linkInfo, setLinkInfo] = useState<Link[] | null>(
    mockData === undefined ? null : mockData,
  );
  const [linksPerPage] = useState<number>(10);
  const [query, setQuery] = useState<SearchQuery>(
    filterOptions ?? DEFAULT_QUERY,
  );

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalLinks, setTotalLinks] = useState<number>(0);
  const [isCreateModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [showExpired, setShowExpired] = useState<boolean>(
    filterOptions === undefined ? false : filterOptions.show_expired_links,
  );
  const [showDeleted, setShowDeleted] = useState<boolean>(
    filterOptions === undefined ? false : filterOptions.show_deleted_links,
  );

  console.log(showExpired, showDeleted);
  const [sortKey, setSortKey] = useState<string>('relevance');
  const [sortOrder, setSortOrder] = useState<'ascending' | 'descending'>(
    'descending',
  );
  const [beginTime, setBeginTime] = useState<dayjs.Dayjs | null>(null);
  const [endTime, setEndTime] = useState<dayjs.Dayjs | null>(null);

  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>();
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>();

  const [filters, setFilters] = useState<Filters>({
    title: '',
    alias: '',
    url: '',
    owner: '',
  });

  const [treeSelectValues, setTreeSelectValues] = useState<string[]>([]);

  const componentRef = useRef(null);

  const { Header, Footer, Sider, Content } = Layout;

  // DONE: clear button
  // DONE: fix removing tags
  // DONE: state management
  // DONE: backend !!
  // TODO: remove persisting filters
  // TODO: clean up code / sort into files

  const treeSelectData = [
    {
      title: (
        <Space.Compact>
          <Space.Addon>Title:</Space.Addon>
          <Input
            onClick={() => {
              titleInputRef.current!.focus({ cursor: 'all' });
            }}
            value={filters.title}
            style={
              {
                '--char-count': Math.max(filters.title.length, 5),
              } as React.CSSProperties
            }
            className="!tw-mr-[0px] tw-ml-[2px] tw-w-[calc(var(--char-count)*1ch+1.25rem)] !tw-px-[5px]"
          />
        </Space.Compact>
      ),
      value: 'title',
    },
    {
      title: (
        <Space.Compact>
          <Space.Addon>Alias:</Space.Addon>
          <Input
            onClick={() => {
              aliasInputRef.current!.focus({ cursor: 'all' });
            }}
            value={filters.alias}
            style={
              {
                '--char-count': Math.max(filters.alias.length, 5),
              } as React.CSSProperties
            }
            className="!tw-mr-[0px] tw-ml-[2px] tw-w-[calc(var(--char-count)*1ch+1.25rem)] !tw-px-[5px]"
          />
        </Space.Compact>
      ),
      value: 'alias',
    },
    {
      title: (
        <Space.Compact>
          <Space.Addon>URL:</Space.Addon>
          <Input
            onClick={() => {
              urlInputRef.current!.focus({ cursor: 'all' });
            }}
            value={filters.url}
            style={
              {
                '--char-count': Math.max(filters.url.length, 5),
              } as React.CSSProperties
            }
            className="!tw-mr-[0px] tw-ml-[2px] tw-w-[calc(var(--char-count)*1ch+1.25rem)] !tw-px-[5px]"
          />
        </Space.Compact>
      ),
      value: 'url',
    },
    {
      title: (
        <Space.Compact>
          <Space.Addon>Owner:</Space.Addon>
          <Input
            onClick={() => {
              ownerInputRef.current!.focus({ cursor: 'all' });
            }}
            value={filters.owner}
            style={
              {
                '--char-count': Math.max(filters.owner.length, 5),
              } as React.CSSProperties
            }
            className="!tw-mr-[0px] tw-ml-[2px] tw-w-[calc(var(--char-count)*1ch+1.25rem)] !tw-px-[5px]"
          />
        </Space.Compact>
      ),
      value: 'owner',
    },
  ];

  // question: is it better to move this to a different file as a function and then read in userOrgs with useEffect and useState?
  const treeData: (TreeDataNode & { value?: string })[] = [
    {
      title: 'My Links',
      key: '0-0',
      value: 'user',
    },
    {
      title: 'Shared with Me',
      key: '0-1',
      value: 'shared',
    },
    ...(userOrgs?.length === 0 || userOrgs === null
      ? [
          {
            title: 'Organization Links',
            key: '0-2',
            disabled: true,
          },
        ]
      : [
          {
            title: 'Organization Links',
            key: '0-2',
            children:
              userOrgs?.map(
                (organization: Organization, idx: number): DataNode => ({
                  title: organization.name,
                  key: `0-2-${idx}`,
                  value: `org_${organization.id}`,
                }),
              ) ?? [],
          },
        ]),
    ...(userPrivileges.has('admin')
      ? [
          {
            title: 'All Links',
            key: '0-3',
            value: 'all',
          },
        ]
      : []),
  ];

  const doQuery = useCallback(
    async (
      newQuery: SearchQuery,
      skip: number,
      limit: number,
    ): Promise<{ count: number; results: Link[] }> => {
      const req: any = {
        title: newQuery.title,
        alias: newQuery.alias,
        url: newQuery.url,
        set: newQuery.set,
        show_expired_links: newQuery.show_expired_links,
        show_deleted_links: newQuery.show_deleted_links,
        sort: newQuery.sort,
        pagination: { skip, limit },
        show_type: newQuery.showType,
      };

      if (newQuery.begin_time !== null) {
        req.begin_time = newQuery.begin_time.format();
      }

      if (newQuery.end_time !== null) {
        req.end_time = newQuery.end_time.format();
      }

      if (newQuery.owner !== null || newQuery.owner === '') {
        req.owner = newQuery.owner;
      }

      const result = await searchLinks(req);
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
            } as Link),
        ),
      };
    },
    [],
  );

  const setNewQuery = useCallback(
    async (newQuery: SearchQuery): Promise<void> => {
      if (demo || newQuery === query) {
        return;
      }

      if (newQuery === DEFAULT_QUERY) {
        setFilters({ title: '', alias: '', owner: '', url: '' });
      }

      // only search for new owners if the netid is valid
      if (newQuery.owner && newQuery.owner !== query.owner) {
        try {
          await serverValidateNetId({}, newQuery.owner);
        } catch (err) {
          return;
        }
      }

      const results = await doQuery(newQuery, 0, linksPerPage);

      await updateUserFilterOptions({
        ...newQuery,
        title: '',
        alias: '',
        url: '',
        owner: '',
      });

      setLinkInfo(results.results);
      setQuery(newQuery);
      setCurrentPage(1);
      setTotalLinks(results.count);
    },
    [demo, query.owner, doQuery, linksPerPage],
  );

  const setPage = useCallback(
    async (newPage: number): Promise<void> => {
      if (demo) {
        setCurrentPage(newPage);
        return;
      }

      if (query === null) {
        throw new Error('attempted to set page with this.state.query === null');
      }

      const skip = (newPage - 1) * linksPerPage;
      const results = await doQuery(query, skip, linksPerPage);

      setLinkInfo(results.results);
      setCurrentPage(newPage);
      setTotalLinks(results.count);
    },
    [demo, query, linksPerPage, doQuery],
  );

  const showByOrg = useCallback(
    (orgs: SearchSet[]) => {
      const newQuery = { ...query, set: orgs };
      setNewQuery(newQuery);
    },
    [query, setNewQuery],
  );

  const onExpand: TreeProps['onExpand'] = useCallback((expandedKeysValue) => {
    setExpandedKeys(expandedKeysValue);
  }, []);

  const onCheck: TreeProps['onCheck'] = useCallback(
    (checkedKeysValue, info) => {
      setCheckedKeys(checkedKeysValue as React.Key[]);
      setTimeout(() => {
        const search: SearchSet[] = [];
        for (let i = 0; i < info.checkedNodes.length; i++) {
          const node: DataNode = info.checkedNodes[i] as DataNode;
          if (node.value && node.value.startsWith('org_')) {
            const orgId = node.value.slice(4);
            search.push({ set: 'org', org: orgId });
          } else if (node.value) {
            search.push({ set: node.value as 'user' | 'shared' | 'all' });
          }
        }
        showByOrg(search);
      }, 300);
    },
    [showByOrg],
  );

  const showLinksInRange = useCallback(
    (dates: [Dayjs | null, Dayjs | null] | null, _: [string, string]) => {
      const newQuery = {
        ...query,
        begin_time: dates?.[0] ?? null,
        end_time: dates?.[1] ?? null,
      };
      setNewQuery(newQuery);
    },
    [query, setNewQuery],
  );

  const handleSearch = useCallback(async () => {
    if (filters.owner.length > 0) {
      try {
        await serverValidateNetId({}, filters.owner);
      } catch {
        api.warning({
          title: 'Invalid net ID!',
          description: 'There are no users found with the entered net ID',
        });
        return;
      }
    }

    const newQuery: SearchQuery = {
      ...query,
      title: filters.title,
      alias: filters.alias,
      url: filters.url,
      owner: filters.owner,
    };

    setQuery(newQuery);
    setNewQuery(newQuery);
  }, [query, filters, setNewQuery]);

  const showExpiredLinks = useCallback(
    (show_expired_links: boolean) => {
      const newQuery = { ...query, show_expired_links };
      setShowExpired(show_expired_links);
      setNewQuery(newQuery);
    },
    [query, setNewQuery],
  );

  const showDeletedLinks = useCallback(
    (show_deleted_links: boolean) => {
      const newQuery = { ...query, show_deleted_links };
      setShowDeleted(show_deleted_links);
      setNewQuery(newQuery);
    },
    [query, setNewQuery],
  );

  const sortLinksByKey = useCallback(
    (key: string) => {
      console.log(key);
      const newQuery = { ...query, sort: { ...query.sort, key } };
      setQuery(newQuery);
      setNewQuery(newQuery);
    },
    [query, setNewQuery],
  );

  const sortLinkOrder = useCallback(() => {
    const order = sortOrder === 'ascending' ? 'descending' : 'ascending';
    setSortOrder(order);
    const newQuery = { ...query, sort: { ...query.sort, order } };
    setNewQuery(newQuery);
  }, [sortOrder, query, setNewQuery]);

  const sortByType = useCallback(
    (e: RadioChangeEvent) => {
      const key = e.target.value;
      const newQuery = { ...query, showType: key };
      setNewQuery(newQuery);
    },
    [query, setNewQuery],
  );

  const refreshResults = useCallback(async (): Promise<void> => {
    await setPage(currentPage);
  }, [currentPage, setPage]);

  useEffect(() => {
    setTreeSelectValues(
      (['title', 'alias', 'url', 'owner'] as const).filter(
        (key) => filters[key].length > 0,
      ),
    );
  }, [filters]);

  // functional component equivalent of componentDidMount
  useEffect(() => {
    const fetchUserOrgs = async (): Promise<void> => {
      if (demo) {
        return;
      }
      try {
        const getUserOrgs = await getOrganizations('user');
        setUserOrgs(getUserOrgs);
      } catch (error) {
        throw new Error(`Failed to set user orgs: ${error}`);
      }
    };

    fetchUserOrgs();
  }, [demo]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '0px',
      },
    );

    if (componentRef.current) {
      observer.observe(componentRef.current);
    }

    return () => {
      if (componentRef.current) {
        observer.unobserve(componentRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (filterOptions) {
      setNewQuery({
        ...filterOptions,
        begin_time: filterOptions.begin_time,
        end_time: filterOptions.end_time,
      });

      setShowDeleted(filterOptions.show_deleted_links);
      setSortKey(filterOptions.sort.key);

      console.log(filterOptions);
      setBeginTime(
        filterOptions.begin_time ? dayjs(filterOptions.begin_time) : null,
      );
      setEndTime(filterOptions.end_time ? dayjs(filterOptions.end_time) : null);
      setCurrentPage(1);

      setQuery(filterOptions);

      const checked = filterOptions.set
        .map(
          (search) => findByValue(treeData, getValueFromSearchSet(search))?.key,
        )
        .filter((key): key is string => key !== undefined);
      setCheckedKeys(checked as React.Key[]);
    }
  }, [filterOptions]);

  useEffect(() => console.log(query), [query]);

  return (
    <>
      {contextHolder}
      <Layout>
        <Header className="tw-mb-4 tw-bg-white tw-p-0">
          <Flex className="tw-bg-white" align="center" justify="space-between">
            <Typography.Title>URL Shortener</Typography.Title>
            <Button
              ref={componentRef}
              type="primary"
              icon={<PlusCircleIcon />}
              onClick={() => {
                if (demo) {
                  return;
                }

                setCreateModalOpen(true);
              }}
            >
              Create
            </Button>
          </Flex>
        </Header>
        <Content className="tw-bg-white">
          <Layout className="tw-bg-white">
            <Sider className="tw-mt-[4px] tw-bg-white tw-pr-4" width="25%">
              <Affix offsetTop={50}>
                <Space.Compact
                  orientation="horizontal"
                  block
                  className="tw-flex tw-w-full tw-items-stretch"
                >
                  <TreeSelect
                    className="tw-mb-2 tw-w-full"
                    styles={{ item: { paddingLeft: 0, border: 0 } }}
                    multiple
                    size="large"
                    placeholder="Click to search"
                    value={treeSelectValues}
                    treeData={treeSelectData}
                    onChange={(values) => {
                      setTreeSelectValues(values);

                      filterKeys.forEach((key) => {
                        if (!values.includes(key)) {
                          filters[key] = '';
                        }
                      });
                      handleSearch();
                    }}
                    popupRender={(_) => (
                      <>
                        <Space orientation="vertical" style={{ padding: 8 }}>
                          <p className="!tw-my-0">Search by...</p>
                          <Space.Compact block>
                            <AntInput
                              placeholder="Title"
                              ref={titleInputRef}
                              value={filters.title}
                              onChange={(e) =>
                                setFilters((f) => ({
                                  ...f,
                                  title: e.target.value,
                                }))
                              }
                            />
                            <Button
                              icon={<XIcon />}
                              onClick={() => {
                                setFilters({ ...filters, title: '' });
                                setNewQuery({ ...query, title: '' });
                              }}
                            />
                          </Space.Compact>
                          <Space.Compact block>
                            <AntInput
                              ref={aliasInputRef}
                              placeholder="Alias"
                              value={filters.alias}
                              onChange={(e) =>
                                setFilters((f) => ({
                                  ...f,
                                  alias: e.target.value,
                                }))
                              }
                            />
                            <Button
                              icon={<XIcon />}
                              onClick={() => {
                                setFilters((f) => ({ ...f, alias: '' }));
                                setNewQuery({ ...query, alias: '' });
                              }}
                            />
                          </Space.Compact>
                          <Space.Compact block>
                            <AntInput
                              ref={urlInputRef}
                              placeholder="URL"
                              value={filters.url}
                              onChange={(e) =>
                                setFilters((f) => ({
                                  ...f,
                                  url: e.target.value,
                                }))
                              }
                            />
                            <Button
                              icon={<XIcon />}
                              onClick={() => {
                                setFilters((f) => ({ ...f, url: '' }));
                                setNewQuery({ ...query, url: '' });
                              }}
                            />
                          </Space.Compact>
                          <Space.Compact block>
                            <AntInput
                              ref={ownerInputRef}
                              placeholder="Owner (net ID)"
                              value={filters.owner}
                              onChange={(e) =>
                                setFilters((f) => ({
                                  ...f,
                                  owner: e.target.value,
                                }))
                              }
                            />
                            <Button
                              icon={<XIcon />}
                              onClick={() => {
                                setFilters((f) => ({ ...f, owner: '' }));
                                setNewQuery({ ...query, owner: '' });
                              }}
                            />
                          </Space.Compact>
                        </Space>
                      </>
                    )}
                  />
                  <Button
                    type="primary"
                    size="middle"
                    className="tw-mb-2 tw-h-auto"
                    disabled={
                      filters.url.length === 0 &&
                      filters.alias.length === 0 &&
                      filters.title.length === 0 &&
                      filters.owner.length === 0
                    }
                    icon={<SearchIcon />}
                    onClick={handleSearch}
                  />
                </Space.Compact>
                <Form layout="vertical">
                  <Col>
                    <Form.Item name="orgSelect" label="Links">
                      <Tree
                        checkable
                        autoExpandParent
                        selectable={false}
                        onCheck={onCheck}
                        onExpand={onExpand}
                        expandedKeys={expandedKeys}
                        treeData={treeData}
                        checkedKeys={checkedKeys}
                      />
                    </Form.Item>
                  </Col>
                  <Col>
                    <Form.Item name="sortKeyInput" label="Sort by">
                      <Select
                        value={sortKey}
                        onChange={sortLinksByKey}
                        style={{ width: '100%' }}
                      >
                        <Select.Option value="relevance">
                          Relevance
                        </Select.Option>
                        <Select.Option value="created_time">
                          Time created
                        </Select.Option>
                        <Select.Option value="title">Title</Select.Option>
                        <Select.Option value="visits">
                          Number of visits
                        </Select.Option>
                      </Select>
                    </Form.Item>
                    <Form.Item name="sortOrder" label="Sort Order">
                      <Button
                        onClick={sortLinkOrder}
                        icon={
                          sortOrder === 'ascending' ? (
                            <ArrowUpAZIcon />
                          ) : (
                            <ArrowDownZAIcon />
                          )
                        }
                      >
                        {sortOrder.charAt(0).toUpperCase() + sortOrder.slice(1)}
                      </Button>
                    </Form.Item>
                  </Col>
                  <Col>
                    <Form.Item name="dateRange" label="Creation Date">
                      <DatePicker.RangePicker
                        format="YYYY-MM-DD"
                        onChange={showLinksInRange}
                        style={{ width: '100%' }}
                        value={[dayjs(beginTime), dayjs(endTime)]}
                        allowEmpty={[false, true]}
                      />
                    </Form.Item>
                  </Col>
                  <Col>
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
                          showExpiredLinks(e.target.value === 'show')
                        }
                      />
                    </Form.Item>
                  </Col>
                  {userPrivileges.has('admin') && (
                    <Col>
                      <Form.Item name="show_deleted" label="Deleted Links">
                        <Radio.Group
                          optionType="button"
                          buttonStyle="solid"
                          options={[
                            { label: 'Show', value: 'show' },
                            { label: 'Hide', value: 'hide' },
                          ]}
                          defaultValue="hide"
                          onChange={(e) => {
                            showDeletedLinks(e.target.value === 'show');
                          }}
                        />
                      </Form.Item>
                    </Col>
                  )}
                  <Col>
                    <Form.Item name="links_vs_pixels" label="Link Type">
                      <Radio.Group
                        optionType="button"
                        buttonStyle="solid"
                        options={[
                          { label: 'Links', value: 'links' },
                          {
                            label: 'Tracking Pixels',
                            value: 'tracking_pixels',
                          },
                        ]}
                        defaultValue={query.showType}
                        onChange={sortByType}
                      />
                    </Form.Item>
                  </Col>
                  <Col>
                    <Form.Item name="reset">
                      <Button onClick={() => setNewQuery(DEFAULT_QUERY)}>
                        Reset Filters
                      </Button>
                    </Form.Item>
                  </Col>
                </Form>
              </Affix>
            </Sider>
            <Content className="tw-bg-white">
              {linkInfo === null || linkInfo.length === 0 ? (
                <Empty />
              ) : (
                <Space orientation="vertical">
                  {linkInfo.map((link: Link) => (
                    <LinkCard key={link._id || link.alias} linkInfo={link} />
                  ))}
                </Space>
              )}
            </Content>
          </Layout>
        </Content>
        <Footer className="tw-bg-white">
          <Pagination
            align="center"
            defaultCurrent={1}
            current={currentPage}
            showSizeChanger={false}
            total={totalLinks}
            onChange={setPage}
            pageSize={linksPerPage}
          />
        </Footer>
      </Layout>
      <CreateLinkDrawer
        title="Create Link"
        visible={isCreateModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onFinish={async () => {
          setCurrentPage(currentPage);
          setCreateModalOpen(false);
          refreshResults();
        }}
        userPrivileges={userPrivileges}
        userOrgs={userOrgs ?? []}
      />
      {!isVisible && (
        <Affix>
          <Tooltip title="Create">
            <button
              type="button"
              className="tw-fixed tw-bottom-10 tw-right-10 tw-z-[1000] tw-flex tw-size-10 tw-cursor-pointer tw-items-center tw-justify-center tw-rounded-full tw-border-none tw-bg-red-600 tw-text-2xl tw-text-white tw-shadow-lg hover:tw-bg-red-700"
              onClick={() => setCreateModalOpen(true)}
            >
              <PlusIcon className="tw-h-8 tw-w-8" />
            </button>
          </Tooltip>
        </Affix>
      )}
    </>
  );
}
