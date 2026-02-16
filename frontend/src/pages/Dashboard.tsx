/* eslint-disable react/no-unused-state */
import React, { useState, useEffect } from 'react';

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
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { FilterIcon, PlusCircleIcon } from 'lucide-react';
import { searchLinks, updateUserFilterOptions } from '@/api/links';
import { getOrganizations } from '@/api/organization';
import { serverValidateNetId } from '@/api/validators';
import DatePicker from '@/components/date-picker';
import Input from '@/components/input';
import CreateLinkDrawer from '@/drawers/CreateLinkDrawer';
import { Link, SearchQuery, SearchSet } from '@/interfaces/link';
import { Organization } from '@/interfaces/organizations';
import LinkCard from '@/components/LinkCard';

interface Props {
  userPrivileges: Set<string>;
  // eslint-disable-next-line react/no-unused-prop-types
  mockData?: Link[];
  // eslint-disable-next-line react/no-unused-prop-types
  filterOptions?: SearchQuery;
  demo?: boolean;
}

const DEFAULT_QUERY: SearchQuery = {
  queryString: '',
  set: { set: 'user' },
  show_expired_links: false,
  show_deleted_links: false,
  sort: { key: 'relevance', order: 'descending' },
  begin_time: null,
  end_time: null,
  showType: 'links',
  owner: null,
};

export default function Dashboard({
  userPrivileges,
  mockData,
  filterOptions,
  demo,
}: Props) {
  const [prevFilterOptions, setPrevFilterOptions] = useState<
    SearchQuery | undefined
  >(filterOptions);
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
  const [filterModalVisible, setFilterModalVisible] = useState<boolean>(false);
  const [showExpired, setShowExpired] = useState<boolean>(
    filterOptions === undefined ? false : filterOptions.show_expired_links,
  );
  const [showDeleted, setShowDeleted] = useState<boolean>(
    filterOptions === undefined ? false : filterOptions.show_deleted_links,
  );
  const [sortKey, setSortKey] = useState<string>('relevance');
  const [beginTime, setBeginTime] = useState<dayjs.Dayjs | null>(null);
  const [endTime, setEndTime] = useState<dayjs.Dayjs | null>(null);

  const doQuery = async (
    newQuery: SearchQuery,
    skip: number,
    limit: number,
  ): Promise<{ count: number; results: Link[] }> => {
    const req: any = {
      query: newQuery.queryString,
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
  };
  const setNewQuery = async (newQuery: SearchQuery): Promise<void> => {
    if (demo) {
      return;
    }

    // only search for new owners if the netid is valid
    // if (newQuery.owner && newQuery.owner !== query.owner) {
    //   try {
    //     await serverValidateNetId({}, newQuery.owner);
    //   } catch (err) {
    //     return;
    //   }
    // }

    const results = await doQuery(newQuery, 0, linksPerPage);

    await updateUserFilterOptions(newQuery);

    setLinkInfo(results.results);
    setQuery(newQuery);
    setCurrentPage(1);
    setTotalLinks(results.count);
  };

  const setPage = async (newPage: number): Promise<void> => {
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
  };

  const showByOrg = (orgs: SearchSet) => {
    const newQuery = { ...query, set: orgs };
    setNewQuery(newQuery);
  };
  const updateOrg = async (value: string): Promise<void> => {
    setTimeout(() => {
      if (value.startsWith('org_')) {
        const orgId = value.slice(4);
        showByOrg({ set: 'org', org: orgId });
      } else {
        showByOrg({ set: value as 'user' | 'shared' | 'all' });
      }
    }, 300);
  };

  const showLinksInRange = (
    dates: [Dayjs | null, Dayjs | null] | null,
    _: [string, string],
  ) => {
    const newQuery = {
      ...query,
      begin_time: dates?.[0] ?? null,
      end_time: dates?.[1] ?? null,
    };
    setNewQuery(newQuery);
  };

  const onSearch = async () => {
    setNewQuery(query);
  };

  const showExpiredLinks = (show_expired_links: boolean) => {
    const newQuery = { ...query, show_expired_links };
    setShowExpired(show_expired_links);
    setNewQuery(newQuery);
  };

  const showDeletedLinks = (show_deleted_links: boolean) => {
    const newQuery = { ...query, show_deleted_links };
    setShowDeleted(show_deleted_links);
    setNewQuery(newQuery);
  };

  const sortLinksByKey = (key: string) => {
    const newQuery = { ...query, sort: { ...query.sort, key } };
    setNewQuery(newQuery);
  };

  const sortByType = (e: RadioChangeEvent) => {
    const key = e.target.value;
    const newQuery = { ...query, showType: key };
    setNewQuery(newQuery);
  };

  const refreshResults = async (): Promise<void> => {
    await setPage(currentPage);
  };

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
  }, []);

  if (filterOptions !== prevFilterOptions) {
    setPrevFilterOptions(filterOptions);

    if (filterOptions) {
      setNewQuery({
        ...filterOptions,
        begin_time: filterOptions.begin_time,
        end_time: filterOptions.end_time,
      });
      setShowExpired(filterOptions.show_expired_links);
      setShowDeleted(filterOptions.show_deleted_links);
      setSortKey(filterOptions.sort.key);
      setBeginTime(
        filterOptions.begin_time ? dayjs(filterOptions.begin_time) : null,
      );
      setEndTime(filterOptions.end_time ? dayjs(filterOptions.end_time) : null);
      setCurrentPage(1);
    }
  }

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
                if (demo) {
                  return;
                }
                setFilterModalVisible(true);
              }}
            >
              Filter
            </Button>
            <Input.Search
              style={{ width: 500 }}
              placeholder="Search links by title, alias, URL, or owner"
              value={query.queryString}
              onChange={(
                e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
              ) => setNewQuery({ ...query, queryString: e.target.value })}
              onSearch={onSearch}
            />
          </Space>
        </Col>
        <Col style={{ textAlign: 'right' }}>
          <Space>
            <Button
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
          </Space>
        </Col>
        <Col span={24}>
          <Row gutter={[16, 8]}>
            {linkInfo === null || linkInfo.length === 0 ? (
              <Col span={24}>
                <Empty />
              </Col>
            ) : (
              linkInfo.map((link: Link) => (
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
            current={currentPage}
            showSizeChanger={false}
            total={totalLinks}
            onChange={setPage}
            pageSize={linksPerPage}
          />
        </Col>
      </Row>

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

      <Drawer
        title="Filter Links"
        width={720}
        open={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        placement="left"
      >
        <Form
          layout="vertical"
          initialValues={{
            orgSelect: query.set.set,
            owner: query.owner,
            sortKey: query.sort.key,
            show_expired: showExpired ? 'show' : 'hide',
            show_deleted: showDeleted ? 'show' : 'hide',
            links_vs_pixels: query.showType,
            dateRange: [beginTime, endTime],
          }}
        >
          {/* its ok that this is deprecated because the filtering system is being overhauled */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="orgSelect" label="Links">
                <Select onChange={updateOrg}>
                  <Select.Option value="user">My Links</Select.Option>
                  <Select.Option value="shared">Shared with Me</Select.Option>
                  {userPrivileges.has('admin') && (
                    <Select.Option value="all">All Links</Select.Option>
                  )}
                  {userOrgs?.length && (
                    <Select.OptGroup label="My Organizations">
                      {userOrgs.map((info) => (
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
                    // setNewQuery({ ...query, owner: e.target.value });
                    setQuery({ ...query, owner: e.target.value });
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sortKey" label="Sort by">
                <Select
                  value={sortKey}
                  onChange={sortLinksByKey}
                  style={{ width: '100%' }}
                  options={[
                    {
                      value: 'relevance',
                      label: 'Relevance',
                    },
                    {
                      value: 'create_time',
                      label: 'Time Created',
                    },
                    {
                      value: 'title',
                      label: 'Title',
                    },
                    {
                      value: 'visits',
                      label: 'Number of visits',
                    },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dateRange" label="Creation Date">
                <DatePicker.RangePicker
                  format="YYYY-MM-DD"
                  onChange={showLinksInRange}
                  style={{ width: '100%' }}
                  value={[dayjs(beginTime), dayjs(endTime)]}
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
                  onChange={(e) => showExpiredLinks(e.target.value === 'show')}
                />
              </Form.Item>
            </Col>
            {userPrivileges.has('admin') && (
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
                    onChange={(e) => {
                      showDeletedLinks(e.target.value === 'show');
                    }}
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
                  defaultValue={query.showType}
                  onChange={sortByType}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Drawer>
    </>
  );
}
