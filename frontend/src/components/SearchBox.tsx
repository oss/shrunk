/**
 * Implements the search box
 * @packageDocumentation
 */

import React, { useState } from 'react';
import { Input } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import { FilterDropdown } from './FilterDropdown';
import { OrgInfo } from '../api/Org';
import { SearchSet } from '../pages/Dashboard';

/**
 * Props for the [[SearchBox]] component
 * @interface
 */
export interface Props {
  /**
   * Callback called when the user executes a new search query
   * @property
   */
  updateQueryString: (newQueryString: string) => void;

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
 * The [[SearchBox]] component allows the user to enter and execute a search query
 * @param props The props
 */
export const SearchBox: React.FC<Props> = (props) => {
  const [loading, toggle] = useState(false);
  const { Search } = Input;

  const onSearch = (query: string) => {
    toggle(true);
    // Create a delay
    setTimeout(() => {
      toggle(false);
      console.log(query);
      props.updateQueryString(query);
    }, 400);
  };

  return (
    <Search
      suffix={
        <FilterDropdown
          userPrivileges={props.userPrivileges}
          showDeletedLinks={props.showDeletedLinks}
          showExpiredLinks={props.showExpiredLinks}
          sortLinksByKey={props.sortLinksByKey}
          sortLinksByOrder={props.sortLinksByOrder}
          showLinksAfter={props.showLinksAfter}
          showLinksBefore={props.showLinksBefore}
        />}
      placeholder="Search URLs"
      loading={loading}
      allowClear
      onSearch={onSearch}
      enterButton
      />
  );
};
