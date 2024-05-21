import { Form, Input, Modal, Typography } from 'antd/lib';
import { title } from 'process';
import React from 'react';
import { DisplayLink } from './LinkHubComponent';

interface IEditLinkFromLinkHubModal {
  visible: boolean;
  editLinkData: EditLinkData;
  onOkay(): void;
  onCancel(): void;
}

export interface EditLinkData {
  displayLink: DisplayLink;
  index: number;
}

export default function EditLinkFromLinkHubModal(
  props: IEditLinkFromLinkHubModal,
) {
  return (
    <Modal
      title={'Edit Link'}
      visible={props.visible}
      onOk={props.onOkay}
      onCancel={props.onCancel}
    >
      <Form layout="vertical">
        <Form.Item label="Title" name="link-title">
          <Input
            max={64}
            defaultValue={props.editLinkData.displayLink.title}
            placeholder="Read the Rutgers News!"
            onChange={(e: any) => {
              props.editLinkData.displayLink.title = e.target.value;
            }}
          />
        </Form.Item>
        <Form.Item label="URL" name="link-url">
          <Input
            defaultValue={props.editLinkData.displayLink.url}
            placeholder="https://www.rutgers.edu/news/"
            onChange={(e: any) => {
              props.editLinkData.displayLink.url = e.target.value;
            }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
