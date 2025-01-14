/**
 * Implements the dropdown which allows the user to filter the links that are shown on dashboard
 * @packageDocumentation
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  Form,
  Dropdown,
  Select,
  Radio,
  Checkbox,
  DatePicker,
  Space,
  Button,
  Typography,
} from 'antd/lib';
import { DownOutlined, FilterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { OrgInfo } from '../api/Org';
import { SearchSet } from '../pages/Dashboard';
import { OrgsSelect } from './OrgsSelect';

/**
 * Props for the [[FilterDropdown]] component
 * @interface
 */
export interface Props {
  /**
   * The user's privileges, used to determine whether the user may use the "all links" set
   * @property
   */
  userPrivileges: Set<string>;

  /**
   * The user's organizations, used to determine which organizations the user may filter by
   * @property
   */
  userOrgs: OrgInfo[];

  /**
   *
   */
  showByOrg: (orgs: SearchSet) => void;

  /**
   * Callback called when the user checks checkbox for showing expired links
   * @property
   */
  showExpiredLinks: (show_expired_links: boolean) => void;

  /**
   * Callback called when the user checks checkbox for showing deleted links
   * @property
   */
  showDeletedLinks: (show_deleted_links: boolean) => void;

  /**
   * Callback called when the user changes category under which links will be sorted
   * @property
   */
  sortLinksByKey: (key: string) => void;

  /**
   * Callback called when the user changes order in which links will be sorted
   * @property
   */
  sortLinksByOrder: (order: string) => void;

  /**
   * Callback called when the user choosses a date of which links will be shown after
   * @property
   */
  showLinksAfter: (begin_time: dayjs.Dayjs) => void;

  /**
   * Callback called when the user chooses a date of which links will be shown before
   * @property
   */
  showLinksBefore: (end_time: dayjs.Dayjs) => void;
}

/**
 * The [[FilterDropdown]] component allows the user to choose specific filters which they want their links to be displayed
 * @param props The props
 */
export const FilterDropdown: React.FC<Props> = (props) => {
  const sortEnabled = false; // Ant Design 5 allows for client-sided sorting.

  const isAdmin = props.userPrivileges.has('admin');
  const sortOptions = [
    { label: 'Ascending', value: 'ascending' },
    { label: 'Descending', value: 'descending' },
  ];

  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [sortKey, setSortKey] = useState('relevance');
  const [sortOrder, setSortOrder] = useState('descending');
  const [beginTime, setBeginTime] = useState<dayjs.Dayjs | null>(null);
  const [endTime, setEndTime] = useState<dayjs.Dayjs | null>(null);
  const filterByText = useRef<HTMLElement | null>(null);

  const showExpiredLinks = async (e: any): Promise<void> => {
    setShowExpired(e.target.checked);
    await props.showExpiredLinks(e.target.checked);
  };

  const showDeletedLinks = async (e: any): Promise<void> => {
    setShowDeleted(e.target.checked);
    await props.showDeletedLinks(e.target.checked);
  };

  const sortByKey = async (e: any): Promise<void> => {
    setSortKey(e);
    await props.sortLinksByKey(e);
  };

  const sortByOrder = async (e: any): Promise<void> => {
    setSortOrder(e.target.value);
    await props.sortLinksByOrder(e.target.value);
  };

  const showAfter = async (e: any): Promise<void> => {
    setBeginTime(e);
    await props.showLinksAfter(e);
  };

  const showBefore = async (e: any): Promise<void> => {
    setEndTime(e);
    await props.showLinksBefore(e);
  };

  useEffect(() => {
    if (filterByText !== null && dropdownVisible) {
      filterByText.current?.classList.toggle('gray-text');
      filterByText.current?.classList.toggle('red-text');
    } else {
      filterByText.current?.classList.toggle('red-text');
      filterByText.current?.classList.toggle('gray-text');
    }
  }, [dropdownVisible]);

  const dropdown = (
    <div className="dropdown-form">
      <Form
        layout="vertical"
        initialValues={{
          org: isAdmin ? 1 : 0,
          sortKey: 'relevance',
          sortOrder: 'descending',
        }}
      >
        <Form.Item name="orgSelect" label="Filter by organization">
          <OrgsSelect
            userPrivileges={props.userPrivileges}
            userOrgs={props.userOrgs}
            showByOrg={props.showByOrg}
          />
        </Form.Item>
        <Form.Item name="sortKey" label="Sort by">
          <Select value={sortKey} onChange={sortByKey}>
            <Select.Option value="relevance">Relevance</Select.Option>
            <Select.Option value="created_time">Time created</Select.Option>
            <Select.Option value="title">Title</Select.Option>
            <Select.Option value="visits">Number of visits</Select.Option>
          </Select>
        </Form.Item>
        {sortEnabled ? (
          <Form.Item name="sortOrder" label="Sort order">
            <Radio.Group
              value={sortOrder}
              onChange={sortByOrder}
              options={sortOptions}
              optionType="button"
            />
          </Form.Item>
        ) : (
          <></>
        )}
        <Form.Item name="show_expired">
          <Checkbox checked={showExpired} onChange={showExpiredLinks}>
            Show expired links?
          </Checkbox>
        </Form.Item>
        {!isAdmin ? (
          <></>
        ) : (
          <Form.Item name="show_deleted">
            <Checkbox checked={showDeleted} onChange={showDeletedLinks}>
              Show deleted links?
            </Checkbox>
          </Form.Item>
        )}
        <Form.Item name="beginTime" label="Created after">
          <DatePicker
            format="YYYY-MM-DD"
            value={beginTime}
            onChange={showAfter}
          />
        </Form.Item>
        <Form.Item name="endTime" label="Created before">
          <DatePicker
            format="YYYY-MM-DD"
            value={endTime}
            onChange={showBefore}
          />
        </Form.Item>
      </Form>
    </div>
  );

  return (
    <Space>
      <Dropdown
        overlay={dropdown}
        open={dropdownVisible}
        onOpenChange={setDropdownVisible}
        placement="bottomLeft"
        trigger={['click']}
      >
        <Button icon={<FilterOutlined />}>Filter</Button>
      </Dropdown>
    </Space>
  );
};
