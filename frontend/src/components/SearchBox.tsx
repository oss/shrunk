/**
 * Implements the search box and advanced search controls
 * @packageDocumentation
 */

import React, { useState } from "react";
import {
  Form,
  Input,
  Button,
  Dropdown,
  Select,
  Radio,
  Checkbox,
  DatePicker,
} from "antd";
import { SettingOutlined, SearchOutlined } from "@ant-design/icons";
import { OrgInfo } from "../api/Org";

/**
 * The type of the `set` parameter in the search query.
 * @type
 */
export type SearchSet =
  | { set: "user" | "shared" | "all" }
  | { set: "org"; org: string };

/**
 * The type of a search query
 * @interface
 */
export interface SearchQuery {
  /**
   * The query string (optional)
   * @property
   */
  query?: string;

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
  begin_time: moment.Moment | null;

  /**
   * The end of the time range to search
   * @property
   */
  end_time: moment.Moment | null;
}

/**
 * Props for the [[SearchBox]] component
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
   * Callback called when the user executes a new search query
   * @property
   */
  setQuery: (newQuery: SearchQuery) => Promise<void>;
}

/**
 * The [[SearchBox]] component allows the user to enter and execute a search query
 * @param props The props
 */
export const SearchBox: React.FC<Props> = (props) => {
  const isAdmin = props.userPrivileges.has("admin");
  const sortOptions = [
    { label: "Ascending", value: "ascending" },
    { label: "Descending", value: "descending" },
  ];

  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [org, setOrg] = useState<number | string>(isAdmin ? 1 : 0);
  const [showExpired, setShowExpired] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [sortKey, setSortKey] = useState("created_time");
  const [sortOrder, setSortOrder] = useState("descending");
  const [beginTime, setBeginTime] = useState<moment.Moment | null>(null);
  const [endTime, setEndTime] = useState<moment.Moment | null>(null);

  const dropdown = (
    <div className="dropdown-form">
      <Form
        layout="vertical"
        initialValues={{
          org: isAdmin ? 1 : 0,
          sortKey: "created_time",
          sortOrder: "descending",
        }}
      >
        <Form.Item name="org" label="Organization">
          <Select value={org} onChange={setOrg}>
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
          <Checkbox
            checked={showExpired}
            onChange={(e) => setShowExpired(e.target.checked)}
          >
            Show expired links?
          </Checkbox>
        </Form.Item>
        {!isAdmin ? (
          <></>
        ) : (
          <Form.Item name="show_deleted">
            <Checkbox
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
            >
              Show deleted links?
            </Checkbox>
          </Form.Item>
        )}
        <Form.Item name="sortKey" label="Sort by">
          <Select value={sortKey} onChange={setSortKey}>
            <Select.Option value="relevance">Relevance</Select.Option>
            <Select.Option value="created_time">Time created</Select.Option>
            <Select.Option value="title">Title</Select.Option>
            <Select.Option value="visits">Number of visits</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="sortOrder" label="Sort order">
          <Radio.Group
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            options={sortOptions}
            optionType="button"
          />
        </Form.Item>
        <Form.Item name="beginTime" label="Created after">
          <DatePicker
            format="YYYY-MM-DD"
            value={beginTime}
            onChange={setBeginTime}
          />
        </Form.Item>
        <Form.Item name="endTime" label="Created before">
          <DatePicker
            format="YYYY-MM-DD"
            value={endTime}
            onChange={setEndTime}
          />
        </Form.Item>
      </Form>
    </div>
  );

  const doSearch = async (): Promise<void> => {
    const searchSet: SearchSet =
      org === 0
        ? { set: "user" }
        : org === 1
        ? { set: "all" }
        : org === 2
        ? { set: "shared" }
        : { set: "org", org: org as string };

    const searchQuery: SearchQuery = {
      set: searchSet,
      show_expired_links: showExpired,
      show_deleted_links: showDeleted,
      sort: { key: sortKey, order: sortOrder },
      begin_time: beginTime === null ? null : beginTime.startOf("day"),
      end_time: endTime === null ? null : endTime.startOf("day"),
    };

    if (query !== "") {
      searchQuery.query = query;
    }

    await props.setQuery(searchQuery);
  };

  return (
    <Form layout="inline">
      <Input.Group compact>
        <Form.Item name="query">
          <Input
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Form.Item>
        <Form.Item>
          <Dropdown
            overlay={dropdown}
            visible={dropdownVisible}
            onVisibleChange={setDropdownVisible}
            placement="bottomRight"
            trigger={["click"]}
          >
            <Button icon={<SettingOutlined />} />
          </Dropdown>
        </Form.Item>
        <Form.Item>
          <Button icon={<SearchOutlined />} onClick={doSearch} />
        </Form.Item>
      </Input.Group>
    </Form>
  );
};
