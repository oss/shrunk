/**
 * Implements the search box
 * @packageDocumentation
 */

import React, { useState } from 'react';
import { Input } from 'antd';

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
      placeholder="Search URLs..."
      loading={loading}
      allowClear
      onSearch={onSearch}
      enterButton
      />
  );
};
