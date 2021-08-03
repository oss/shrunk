/**
 * Implements the dropdown which allows the user to filter the links that are shown on dashboard
 * @packageDocumentation
 */

import React, { useState } from 'react';
import {
  Form,
  Dropdown,
  Button,
  Select,
  Radio,
  Checkbox,
  DatePicker,
  Space,
} from 'antd';
import { DownOutlined, MoreOutlined, CaretDownOutlined } from '@ant-design/icons';
import moment from 'moment';
import { SearchSet } from '../pages/Dashboard';

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
  showLinksAfter: (begin_time: moment.Moment) => void;

  /**
   * Callback called when the user chooses a date of which links will be shown before
   * @property
   */
  showLinksBefore: (end_time: moment.Moment) => void;
}

/**
 * The [[FilterDropdown]] component allows the user to choose specific filters which they want their links to be displayed
 * @param props The props
 */
export const FilterDropdown: React.FC<Props> = (props) => {
  const isAdmin = props.userPrivileges.has('admin');
  const sortOptions = [
    { label: 'Ascending', value: 'ascending' },
    { label: 'Descending', value: 'descending' },
  ];

  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [sortKey, setSortKey] = useState('created_time');
  const [sortOrder, setSortOrder] = useState('descending');
  const [beginTime, setBeginTime] = useState<moment.Moment | null>(null);
  const [endTime, setEndTime] = useState<moment.Moment | null>(null);

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

  const dropdown = (
    <div className="dropdown-form">
      <Form
        layout="vertical"
        initialValues={{
          org: isAdmin ? 1 : 0,
          sortKey: 'created_time',
          sortOrder: 'descending',
        }}
      >
        <Form.Item name="sortKey" label="Sort by">
          <Select value={sortKey} onChange={sortByKey}>
            <Select.Option value="relevance">Relevance</Select.Option>
            <Select.Option value="created_time">Time created</Select.Option>
            <Select.Option value="title">Title</Select.Option>
            <Select.Option value="visits">Number of visits</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="sortOrder" label="Sort order">
          <Radio.Group
            value={sortOrder}
            onChange={sortByOrder}
            options={sortOptions}
            optionType="button"
          />
        </Form.Item>
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
        visible={dropdownVisible}
        onVisibleChange={setDropdownVisible}
        placement="bottomLeft"
        trigger={['click']}
      >
        <a className="filter-links-dropdown" onClick={e => e.preventDefault()}>
        Filter By <CaretDownOutlined />
      </a>
      </Dropdown>
    </Space>
  );
};
