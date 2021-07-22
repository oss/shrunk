/**
 * Implements the search box
 * @packageDocumentation
 */

import React, { useState } from 'react';
import { Form, Input, Button } from 'antd';
import { SearchOutlined, CloseOutlined } from '@ant-design/icons';

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
  const { Search } = Input;

  const onSearch = (query: string) => {
    console.log(query);
    props.updateQueryString(query);
  };

  return (
    <Search 
      placeholder="Search"
      allowClear
      onSearch={onSearch}
      enterButton />
  );
};
