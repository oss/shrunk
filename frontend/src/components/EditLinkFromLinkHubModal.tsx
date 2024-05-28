import { Form, Input, Modal } from 'antd/lib';
import { title } from 'process';
import React, { useState } from 'react';
import { DisplayLink } from './LinkHubComponent';

interface IEditLinkFromLinkHubModal {
  visible: boolean;
  editLinkData: EditLinkData;
  onOkay(value: DisplayLink): void;
  onCancel(): void;
}

export interface EditLinkData {
  displayLink: DisplayLink;
  index: number;
}

export default function EditLinkFromLinkHubModal(
  props: IEditLinkFromLinkHubModal,
) {
  const [form] = Form.useForm();

  function onSubmit(values: any) {
    props.onOkay(values);
  }

  function onCancel() {
    props.onCancel();
    form.resetFields();
  }

  return (
    <Modal
      title={'Edit Link'}
      visible={props.visible}
      onOk={form.submit}
      onCancel={onCancel}
    >
      <Form
        layout="vertical"
        form={form}
        onFinish={onSubmit}
        initialValues={{
          title: props.editLinkData.displayLink.title,
          url: props.editLinkData.displayLink.url,
        }}
      >
        <Form.Item label="Title" name="title">
          <Input max={64} />
        </Form.Item>
        <Form.Item label="URL" name="url">
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
}
