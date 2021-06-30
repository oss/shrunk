/**
 * Implements the search box
 * @packageDocumentation
 */

import React, { useState } from 'react';
import { Space, Input, Button, Tag, Alert } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { truncate } from 'fs/promises';

/**
 * Props for the [[SearchBox]] component
 * @interface
 */
export interface Props {
  /**
   * Callback called when the user executes a new search query
   * @property
   */
  updateQueryString: (queryStrings: string[]) => void;
}

/**
 * The [[SearchBox]] component allows the user to enter and execute a search query
 * @param props The props
 */
export const SearchBox: React.FC<Props> = (props) => {
  const [query, setQuery] = useState('');
  const [tags, setTag] = useState([]);
  const [errorMsg, setError] = useState('');
  const [error, toggleError] = useState(false);

  function checkDuplicates(tag: string){
    if(tags.includes(tag)){
      return true;
    }
    else{
      return false;
    }
  }

  function addTag() {
    if (query !== '') {
      if(tags.includes(query)){
        setQuery('');
        setError("Already set a filter for " + query);
        toggleError(true);
      }
      else{
        tags.push(query);
        props.updateQueryString(tags);
        setQuery('');
      }
    }
  };

  function deleteTag(tag: string) {
    const updated = tags.filter(e => e !== tag)
    setTag(updated);
    props.updateQueryString(updated);
  }

  function forMap(tag: string) {
    const tagElem = (
      <Tag
        closable
        onClose={e => {
          e.preventDefault();
          deleteTag(tag);
        }}
      >
        {tag}
      </Tag>
    );
    return (
      <span key={tag}>
        {tagElem}
      </span>
    );
  };

  return (
    <Space direction="vertical" align="baseline">
      <Space direction = "horizontal">
          <Input
              placeholder="Search"
              value={query}
              onPressEnter={addTag}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button icon={<SearchOutlined />} onClick={addTag} />
      </Space>   
      <Space direction ="horizontal">
        {tags.map(forMap)}
      </Space>
      {!error ? (<></>) : <Alert message={errorMsg} type="error" showIcon banner closable/>}
    </Space>
  );
};
