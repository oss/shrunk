/**
 * Implements the search box
 * @packageDocumentation
 */

import React, { useState } from 'react';
import { Form, Input, Button, Tag } from 'antd';
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
  updateQueryString: (queryStrings: string[]) => void;
}

/**
 * The [[SearchBox]] component allows the user to enter and execute a search query
 * @param props The props
 */
export const SearchBox: React.FC<Props> = (props) => {
  const [query, setQuery] = useState('');
  const [tags, setTag] = useState([]);
  const [form] = Form.useForm();
  const maxTags = 4;

  const validator = (_: any, value: { word: string }) => {
    if (checkDuplicates(value.word)) {
      return Promise.reject(
        new Error('This word is already used as a filter.'),
      );
    }
    if (maxTags === tags.length) {
      return Promise.reject(new Error('You must remove a tag first.'));
    }
    return Promise.resolve();
  };

  function checkDuplicates(word: string) {
    if (word === '') return false;
    if (tags.includes(word)) {
      return true;
    }

    return false;
  }

  function addTag() {
    if (query !== '' && tags.length < maxTags && !checkDuplicates(query)) {
      setQuery('');
      tags.push(query);
      props.updateQueryString(tags);
    }
  }

  function deleteTag(tag: string) {
    const updated = tags.filter((e) => e !== tag);
    setTag(updated);
    props.updateQueryString(updated);
  }

  function forMap(tag: string) {
    const tagElem = (
      <Tag
        closable
        onClose={(e) => {
          e.preventDefault();
          deleteTag(tag);
        }}
      >
        {tag}
      </Tag>
    );
    return <span key={tag}>{tagElem}</span>;
  }

  return (
    <Form layout="inline" form={form} onFinish={() => form.resetFields()}>
      <Input.Group compact>
        <Form.Item rules={[{ validator }]}>
          <Input
            placeholder="Search"
            value={query}
            onPressEnter={addTag}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Form.Item>
        <Form.Item>
          <Button icon={<SearchOutlined />} onClick={addTag} />
        </Form.Item>
        <br />
        <Form.Item>{tags.map(forMap)}</Form.Item>
      </Input.Group>
    </Form>
  );
};
