/* eslint-disable no-param-reassign */
import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  Dispatch,
  SetStateAction,
} from 'react';
import {
  Radio,
  Select,
  Space,
  Tree,
  Button,
  TreeSelect,
  Col,
  Form,
  Input,
} from 'antd';
import { XIcon, SearchIcon, ArrowUpIcon, ArrowDownIcon } from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import type { InputRef, TreeProps, TreeDataNode, RadioChangeEvent } from 'antd';
import { SearchQuery, SearchSet } from '../interfaces/link';
import DatePicker from './date-picker';

import { Organization } from '../interfaces/organizations';

interface Props {
  query: SearchQuery;
  DEFAULT_QUERY: SearchQuery;
  filters: Filters;
  setFilters: Dispatch<SetStateAction<Filters>>;
  handleSearch: () => void;
  setNewQuery: (query: SearchQuery) => void;
  showByOrg: (orgs: SearchSet[]) => void;
  userOrgs: Organization[] | null;
  userPrivileges: Set<string>;
  sortLinksByKey: (key: string) => void;
  sortByType: (e: RadioChangeEvent) => void;
  sortLinkOrder: () => void;
  sortOrder: 'ascending' | 'descending';
  showLinksInRange: (
    dates: [Dayjs | null, Dayjs | null] | null,
    _: [string, string],
  ) => void;
  showExpiredLinks: (show_expired: boolean) => void;
  showDeletedLinks: (show_deleted: boolean) => void;
}

interface DataNode {
  title: string;
  key: string;
  value?: string;
}

interface Filters {
  title: string;
  alias: string;
  owner: string;
  url: string;
}

const filterKeys: Array<keyof Filters> = ['title', 'alias', 'owner', 'url'];

export default function DashboardSearch({
  showByOrg,
  userOrgs,
  query,
  handleSearch,
  DEFAULT_QUERY,
  filters,
  setFilters,
  setNewQuery,
  userPrivileges,
  sortLinksByKey,
  sortLinkOrder,
  sortOrder,
  showLinksInRange,
  showDeletedLinks,
  showExpiredLinks,
  sortByType,
}: Props) {
  const titleInputRef = useRef<InputRef>(null);
  const aliasInputRef = useRef<InputRef>(null);
  const urlInputRef = useRef<InputRef>(null);
  const ownerInputRef = useRef<InputRef>(null);

  const [treeSelectValues, setTreeSelectValues] = useState<string[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>();
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>(['0-0']);

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

  const onExpand: TreeProps['onExpand'] = useCallback(
    (expandedKeysValue: React.Key[]) => {
      setExpandedKeys(expandedKeysValue);
    },
    [],
  );

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

  useEffect(() => {
    setTreeSelectValues(
      (['title', 'alias', 'url', 'owner'] as const).filter(
        (key) => filters[key].length > 0,
      ),
    );
  }, [filters]);
  return (
    <>
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
                  <Input
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
                  <Input
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
                  <Input
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
                  <Input
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
              defaultValue={query.sort.key}
              onChange={sortLinksByKey}
              style={{ width: '100%' }}
              options={[
                { value: 'relevance', label: 'Relevance' },
                { value: 'created_time', label: 'Time created' },
                { value: 'title', label: 'Title' },
                { value: 'visits', label: 'Number of visits' },
              ]}
            />
          </Form.Item>
          <Form.Item name="sortOrder" label="Sort Order">
            <Button
              onClick={sortLinkOrder}
              icon={
                sortOrder === 'ascending' ? <ArrowUpIcon /> : <ArrowDownIcon />
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
              value={[dayjs(query.begin_time), dayjs(query.end_time)]}
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
              onChange={(e) => showExpiredLinks(e.target.value === 'show')}
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
    </>
  );
}
