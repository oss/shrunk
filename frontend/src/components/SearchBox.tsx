/**
 * Implements the search box
 * @packageDocumentation
 */

import React, { useState } from 'react';
import { Form, Input, Button } from 'antd';
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
}

/**
 * The [[SearchBox]] component allows the user to enter and execute a search query
 * @param props The props
 */
export const SearchBox: React.FC<Props> = (props) => {
  const [query, setQuery] = useState('');

  const updateQueryString = async (): Promise<void> => {
    if (query !== '') {
      await props.setQueryString(query);
    }
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
          <Button icon={<SearchOutlined />} onClick={updateQueryString} />
        </Form.Item>
      </Input.Group>
    </Form>
  );
};
