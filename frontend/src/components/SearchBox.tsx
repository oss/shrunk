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
  const [query, setQuery] = useState('');
  const [clearIcon, toggle] = useState(false);

  function clearSearch(){
    setQuery('');
    toggle(false);
    props.updateQueryString('');
  }

  function submitSearch() {
    if (query == '') {
      clearSearch();
    }
    else{
      toggle(true);
      props.updateQueryString(query);
    }
  };

  return (
    <Form layout="inline">
      <Input.Group compact>
        <Form.Item>
          <Input   
            suffix={ !clearIcon ? <></> : <Button type='text' icon={<CloseOutlined />} onClick={clearSearch} size='small'/>}
            placeholder="Search"
            value={query}
            onPressEnter={submitSearch}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Form.Item>
        <Form.Item>
          <Button icon={<SearchOutlined />} onClick={submitSearch} />
        </Form.Item>
      </Input.Group>
    </Form>
  );
};
