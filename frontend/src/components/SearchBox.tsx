/**
 * Implements the search box
 * @packageDocumentation
 */

import React, { useState } from 'react';
import { Space, Input, Button, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

/**
 * Props for the [[SearchBox]] component
 * @interface
 */
export interface Props {
  /**
   * Callback called when the user executes a new search query
   * @property
   */
  setQueryString: (newQueryString: string) => void;

  /**
   * Callback called when the user executes a new search query
   * @property
   */
  clearString: () => void;
}

/**
 * The [[SearchBox]] component allows the user to enter and execute a search query
 * @param props The props
 */
export const SearchBox: React.FC<Props> = (props) => {
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('');
  const [toggleTag, showTag] = useState(false);


  const updateQueryString = async (): Promise<void> => {
    if (query !== '') {
      await props.setQueryString(query);
      showTag(true);
      setTag(query);
    }
  };

  const clearString = async() : Promise<void> => {
    setQuery('');
    showTag(false);
    await props.clearString();
  }

  return (
    <Space direction="vertical" align="baseline">
      <Space direction="horizontal">
        <Input
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button icon={<SearchOutlined />} onClick={updateQueryString} />
      </Space>
      {!toggleTag ? (
        <></>
        ) : (
            <Tag closable onClose={clearString}>{tag}</Tag>
      )}
    </Space>
  );
};
