/* eslint-disable react/no-unused-state */
/* eslint-disable tailwindcss/classnames-order */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Drawer,
  Flex,
  Layout,
  Space,
  Affix,
  Tooltip,
  Button,
  Empty,
  Pagination,
  RadioChangeEvent,
  Typography,
  notification,
} from 'antd';
import { Dayjs } from 'dayjs';
import { PlusIcon, PlusCircleIcon, FilterIcon } from 'lucide-react';
import { searchLinks } from '../api/links';
import { getOrganizations } from '../api/organization';
import { serverValidateNetId } from '../api/validators';
import DashboardSearch from '../components/DashboardSearch';
import CreateLinkDrawer from '../drawers/CreateLinkDrawer';
import { Link, SearchQuery, SearchSet } from '../interfaces/link';
import { Organization } from '../interfaces/organizations';
import LinkCard from '../components/LinkCard';

interface Props {
  userPrivileges: Set<string>;
  mockData?: Link[];
  // filterOptions?: SearchQuery;
  demo?: boolean;
}

interface Filters {
  title: string;
  alias: string;
  owner: string;
  url: string;
}

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

export default function Dashboard({ userPrivileges, mockData, demo }: Props) {
  const [api, contextHolder] = notification.useNotification();

  const [userOrgs, setUserOrgs] = useState<Organization[] | null>(null);
  const [linkInfo, setLinkInfo] = useState<Link[] | null>(
    mockData === undefined ? null : mockData,
  );
  const [linksPerPage] = useState<number>(10);
  const [query, setQuery] = useState<SearchQuery>(DEFAULT_QUERY);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalLinks, setTotalLinks] = useState<number>(0);
  const [isCreateModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<'ascending' | 'descending'>(
    'descending',
  );

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);
  console.log(mobileFiltersOpen);

  const [filters, setFilters] = useState<Filters>({
    title: '',
    alias: '',
    url: '',
    owner: '',
  });

  const componentRef = useRef(null);

  const { Header, Footer, Sider, Content } = Layout;

  // DONE: clear button
  // DONE: fix removing tags
  // DONE: state management
  // DONE: backend !!
  // TODO: remove persisting filters
  // TODO: clean up code / sort into files

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
      if (demo) {
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
      if (orgs.find((item) => item.set === 'all')) {
        const allOrgs: SearchSet[] = [{ set: 'all' }];
        const newQuery = { ...query, set: allOrgs };
        setNewQuery(newQuery);
      } else {
        const newQuery = { ...query, set: orgs };
        setNewQuery(newQuery);
      }
    },
    [query, setNewQuery],
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
      setNewQuery(newQuery);
    },
    [query, setNewQuery],
  );

  const showDeletedLinks = useCallback(
    (show_deleted_links: boolean) => {
      const newQuery = { ...query, show_deleted_links };
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
    setNewQuery(DEFAULT_QUERY);
    console.log(query.sort.key);
  }, [DEFAULT_QUERY]);

  return (
    <>
      {contextHolder}
      <Layout>
        <Header className="tw-hidden tw-mb-4 tw-bg-white tw-p-0 lg:tw-block">
          <Flex className="tw-bg-white" align="center" justify="space-between">
            <Typography.Title>URL Shortener</Typography.Title>
            <Button
              ref={componentRef}
              type="primary"
              icon={<PlusCircleIcon />}
              onClick={() => setCreateModalOpen(true)}
            >
              Create
            </Button>
          </Flex>
        </Header>
        <Header className="tw-mb-4 tw-bg-white tw-p-0 md:tw-hidden">
          <Flex className="tw-bg-white" align="center" justify="space-between">
            <Typography.Title>URL Shortener</Typography.Title>
            <Button
              ref={componentRef}
              type="primary"
              icon={<FilterIcon />}
              onClick={() => setMobileFiltersOpen(true)}
            />
            <Button
              ref={componentRef}
              type="primary"
              icon={<PlusCircleIcon />}
              onClick={() => setCreateModalOpen(true)}
            />
          </Flex>
        </Header>
        <Content className="tw-bg-white">
          <Layout className="tw-bg-white">
            <Sider
              className="tw-mt-[4px] tw-bg-white tw-pr-4 tw-hidden lg:tw-block"
              width="25%"
              trigger={null}
              breakpoint="lg"
              collapsedWidth="0"
            >
              <Affix offsetTop={50}>
                <DashboardSearch
                  query={query}
                  DEFAULT_QUERY={DEFAULT_QUERY}
                  filters={filters}
                  setFilters={setFilters}
                  handleSearch={handleSearch}
                  setNewQuery={setNewQuery}
                  showByOrg={showByOrg}
                  userOrgs={userOrgs}
                  userPrivileges={userPrivileges}
                  sortLinksByKey={sortLinksByKey}
                  sortByType={sortByType}
                  sortLinkOrder={sortLinkOrder}
                  sortOrder={sortOrder}
                  showLinksInRange={showLinksInRange}
                  showExpiredLinks={showExpiredLinks}
                  showDeletedLinks={showDeletedLinks}
                />
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
      <Drawer
        title="Filters"
        placement="left"
        onClose={() => setMobileFiltersOpen(false)}
        open={mobileFiltersOpen}
      >
        <DashboardSearch
          query={query}
          DEFAULT_QUERY={DEFAULT_QUERY}
          filters={filters}
          setFilters={setFilters}
          handleSearch={handleSearch}
          setNewQuery={setNewQuery}
          showByOrg={showByOrg}
          userOrgs={userOrgs}
          userPrivileges={userPrivileges}
          sortLinksByKey={sortLinksByKey}
          sortByType={sortByType}
          sortLinkOrder={sortLinkOrder}
          sortOrder={sortOrder}
          showLinksInRange={showLinksInRange}
          showExpiredLinks={showExpiredLinks}
          showDeletedLinks={showDeletedLinks}
        />
      </Drawer>
    </>
  );
}
