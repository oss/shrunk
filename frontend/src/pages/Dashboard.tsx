/* eslint-disable react/no-unused-state */
/* eslint-disable tailwindcss/classnames-order */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Breadcrumb,
  Drawer,
  Flex,
  Layout,
  Space,
  Button,
  Empty,
  Typography,
} from 'antd';
import { PlusCircleIcon, FilterIcon } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import { searchLinks } from '../api/links';
import { getOrganizations } from '../api/organization';
import { serverValidateNetId } from '../api/validators';
import DashboardSearch from '../components/DashboardSearch';
import CreateLinkDrawer from '../drawers/CreateLinkDrawer';
import { Link, SearchQuery, DEFAULT_QUERY } from '../interfaces/link';
import { Organization } from '../interfaces/organizations';
import LinkCard from '../components/LinkCard';

interface Props {
  userPrivileges: Set<string>;
  mockData?: Link[];
  demo?: boolean;
}

interface Filters {
  title: string;
  alias: string;
  owner: string;
  url: string;
}

export default function Dashboard({ userPrivileges, mockData, demo }: Props) {
  const [userOrgs, setUserOrgs] = useState<Organization[] | null>(null);
  const [linkInfo, setLinkInfo] = useState<Link[] | null>(
    mockData === undefined ? null : mockData,
  );
  const [linksPerPage] = useState<number>(10);
  const [query, setQuery] = useState<SearchQuery>(DEFAULT_QUERY);
  const [totalLinks, setTotalLinks] = useState<number>(mockData?.length ?? 0);
  const [hasMoreLinks, setHasMoreLinks] = useState<boolean>(false);
  const [isFetchingMoreLinks, setIsFetchingMoreLinks] =
    useState<boolean>(false);
  const [isCreateModalOpen, setCreateModalOpen] = useState<boolean>(false);

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);

  const [filters, setFilters] = useState<Filters>({
    title: '',
    alias: '',
    url: '',
    owner: '',
  });

  const contextHeaderRef = useRef<HTMLElement>(null);
  const loadMoreSentinelRef = useRef<HTMLSpanElement>(null);
  const nextSkipRef = useRef<number>(mockData?.length ?? 0);
  const queryVersionRef = useRef<number>(0);

  const { Footer, Sider, Content } = Layout;

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

      const requestVersion = queryVersionRef.current + 1;
      queryVersionRef.current = requestVersion;

      const results = await doQuery(newQuery, 0, linksPerPage);

      if (queryVersionRef.current !== requestVersion) {
        return;
      }

      setLinkInfo(results.results);
      setQuery(newQuery);
      setTotalLinks(results.count);
      nextSkipRef.current = results.results.length;
      setHasMoreLinks(results.results.length < results.count);
      setIsFetchingMoreLinks(false);
    },
    [demo, query.owner, doQuery, linksPerPage],
  );

  const loadMoreLinks = useCallback(async (): Promise<void> => {
    if (demo || isFetchingMoreLinks || !hasMoreLinks) {
      return;
    }

    setIsFetchingMoreLinks(true);
    const requestVersion = queryVersionRef.current;

    try {
      const results = await doQuery(query, nextSkipRef.current, linksPerPage);

      if (queryVersionRef.current !== requestVersion) {
        return;
      }

      setLinkInfo((prevLinks) => [...(prevLinks ?? []), ...results.results]);
      nextSkipRef.current += results.results.length;
      setTotalLinks(results.count);
      setHasMoreLinks(nextSkipRef.current < results.count);
    } finally {
      if (queryVersionRef.current === requestVersion) {
        setIsFetchingMoreLinks(false);
      }
    }
  }, [demo, isFetchingMoreLinks, hasMoreLinks, doQuery, query, linksPerPage]);

  const refreshResults = useCallback(async (): Promise<void> => {
    await setNewQuery(query);
  }, [query, setNewQuery]);

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
    setNewQuery(DEFAULT_QUERY);
  }, [DEFAULT_QUERY]);

  useEffect(() => {
    let lastContextHeaderHeight = -1;

    const setContextHeaderHeight = () => {
      const contextHeaderHeight = Math.round(
        contextHeaderRef.current?.getBoundingClientRect().height ?? 0,
      );

      if (contextHeaderHeight === lastContextHeaderHeight) {
        return;
      }

      lastContextHeaderHeight = contextHeaderHeight;

      document.documentElement.style.setProperty(
        '--dashboard-context-height',
        `${contextHeaderHeight}px`,
      );
    };

    setContextHeaderHeight();
    window.addEventListener('resize', setContextHeaderHeight);

    return () => {
      window.removeEventListener('resize', setContextHeaderHeight);
    };
  }, []);

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    let observer: IntersectionObserver | null = null;

    if (sentinel && !demo) {
      const rootMargin = window.matchMedia('(min-width: 1024px)').matches
        ? '600px 0px'
        : '250px 0px';

      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            loadMoreLinks();
          }
        },
        {
          root: null,
          rootMargin,
          threshold: 0,
        },
      );

      observer.observe(sentinel);
    }

    return () => {
      observer?.disconnect();
    };
  }, [demo, loadMoreLinks]);

  return (
    <>
      <Layout>
        <section
          ref={contextHeaderRef}
          className="tw-sticky tw-z-30 tw-top-[var(--app-header-height,0px)] tw-bg-white dark:tw-bg-[#1f1f1f]"
        >
          <Breadcrumb
            className="!tw-m-0 tw-py-2"
            items={[
              {
                title: <RouterLink to="/app/dash">Home</RouterLink>,
              },
              {
                title: 'URL Shortener',
              },
            ]}
          />
          <section className="tw-hidden tw-pb-2 lg:tw-block">
            <Flex align="center" justify="space-between">
              <Typography.Title className="!tw-m-0">
                URL Shortener
              </Typography.Title>
              <Button
                className="!tw-shadow-none"
                type="primary"
                icon={<PlusCircleIcon />}
                onClick={() => setCreateModalOpen(true)}
              >
                Create
              </Button>
            </Flex>
          </section>
          <section className="tw-flex tw-flex-col tw-gap-3 tw-pb-2 lg:tw-hidden">
            <Typography.Title level={2} className="!tw-m-0">
              URL Shortener
            </Typography.Title>

            <Flex justify="space-between" gap="small">
              <Button
                type="primary"
                icon={<FilterIcon />}
                onClick={() => setMobileFiltersOpen(true)}
              >
                Filter
              </Button>
              <Button
                type="primary"
                icon={<PlusCircleIcon />}
                onClick={() => setCreateModalOpen(true)}
              >
                Create
              </Button>
            </Flex>
          </section>
        </section>
        <Content className="tw-pt-4 tw-bg-white dark:tw-bg-[#1f1f1f]">
          <Layout className="tw-bg-white dark:tw-bg-[#1f1f1f]">
            <Sider
              className="tw-mt-[4px] tw-pr-4 tw-hidden lg:tw-block"
              width={360}
            >
              <section className="tw-sticky tw-top-[calc(var(--app-header-height,0px)+var(--dashboard-context-height,0px)+16px)] tw-max-h-[calc(100vh-var(--app-header-height,0px)-var(--dashboard-context-height,0px)-40px)] tw-overflow-auto [scrollbar-color:#8c8c8c_#f2f2f2] dark:[scrollbar-color:#595959_#1f1f1f]">
                <DashboardSearch
                  query={query}
                  filters={filters}
                  setFilters={setFilters}
                  setNewQuery={setNewQuery}
                  userOrgs={userOrgs}
                  userPrivileges={userPrivileges}
                />
              </section>
            </Sider>
            <Content className="dark:tw-bg-[#1f1f1f] tw-mt-4 md:tw-mt-0 tw-bg-white">
              <section className="md:tw-mt-4 lg:tw-mt-0 dark:tw-bg-[#1f1f1f]">
                {linkInfo === null || linkInfo.length === 0 ? (
                  <Empty />
                ) : (
                  <Space
                    className="dark:tw-bg-[#1f1f1f]"
                    orientation="vertical"
                  >
                    {linkInfo.map((link: Link) => (
                      <LinkCard key={link._id || link.alias} linkInfo={link} />
                    ))}
                  </Space>
                )}
                <span ref={loadMoreSentinelRef} className="tw-block tw-h-px" />
                {isFetchingMoreLinks && (
                  <Typography.Text className="tw-mt-2 tw-block tw-text-center">
                    Loading more links...
                  </Typography.Text>
                )}
              </section>
            </Content>
          </Layout>
        </Content>
        <Footer className="dark:tw-bg-[#1f1f1f] lg:tw-pl-[25%]">
          <Typography.Text className="tw-block tw-text-center">
            Loaded {linkInfo?.length ?? 0} of {totalLinks} links
          </Typography.Text>
        </Footer>
      </Layout>
      <CreateLinkDrawer
        title="Create Link"
        visible={isCreateModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onFinish={async () => {
          setCreateModalOpen(false);
          refreshResults();
        }}
        userPrivileges={userPrivileges}
        userOrgs={userOrgs ?? []}
      />
      <Drawer
        title="Filters"
        placement="left"
        onClose={() => setMobileFiltersOpen(false)}
        open={mobileFiltersOpen}
      >
        <DashboardSearch
          query={query}
          filters={filters}
          setFilters={setFilters}
          setNewQuery={setNewQuery}
          userOrgs={userOrgs}
          userPrivileges={userPrivileges}
        />
      </Drawer>
    </>
  );
}
