/**
 * Implements the dropdown which allows the user to filter the links that are shown on dashboard
 * @packageDocumentation
 */

import React, { useState } from 'react';
import { Form, Dropdown, Select, Radio, Checkbox, DatePicker } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import moment from 'moment';
import { OrgInfo } from '../api/Org';
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
   * The orgs of which the user is a member, used to display the list of
   * available link sets
   * @property
   */
  userOrgs: OrgInfo[];

  /**
   * Callback called when the user changes organization of whose links will be displayed
   * @property
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
  const [org, setOrg] = useState<number | string>(isAdmin ? 1 : 0);
  const [showExpired, setShowExpired] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [sortKey, setSortKey] = useState('created_time');
  const [sortOrder, setSortOrder] = useState('descending');
  const [beginTime, setBeginTime] = useState<moment.Moment | null>(null);
  const [endTime, setEndTime] = useState<moment.Moment | null>(null);

  const updateOrg = async (e: any): Promise<void> => {
    setOrg(e);
    const searchSet: SearchSet =
      e === 0
        ? { set: 'user' }
        : e === 1
        ? { set: 'all' }
        : e === 2
        ? { set: 'shared' }
        : { set: 'org', org: e as string };
    await props.showByOrg(searchSet);
  };

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
        <Form.Item name="org" label="Organization">
          <Select value={org} onChange={updateOrg}>
            <Select.Option value={0}>
              <em>My links</em>
            </Select.Option>
            <Select.Option value={2}>
              <em>Shared with me</em>
            </Select.Option>
            {!isAdmin ? (
              <></>
            ) : (
              <Select.Option value={1}>
                <em>All links</em>
              </Select.Option>
            )}
            {props.userOrgs.map((info) => (
              <Select.Option key={info.id} value={info.id}>
                {info.name}
              </Select.Option>
            ))}
          </Select>
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
    <Dropdown
      overlay={dropdown}
      visible={dropdownVisible}
      onVisibleChange={setDropdownVisible}
      placement="bottomRight"
      trigger={['click']}
    >
      <span className="filter-links-dropdown">
        Filter Links <DownOutlined />
      </span>
    </Dropdown>
  );
};
