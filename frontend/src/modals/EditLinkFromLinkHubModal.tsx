import { Form, Input, Modal } from 'antd/lib';
import React, { useEffect } from 'react';
import { DisplayLink } from '../components/LinkHubComponent';

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

  useEffect(() => {
    if (props.visible) {
      form.setFieldsValue({
        title: props.editLinkData.displayLink.title,
        url: props.editLinkData.displayLink.url,
      });
    }
  }, [props.visible, props.editLinkData, form]);

  function onSubmit(values: any) {
    form.resetFields();
    props.onOkay(values);
  }

  function onCancel() {
    form.resetFields();
    props.onCancel();
  }

  return (
    <Modal
      title="Edit Link"
      open={props.visible}
      onOk={form.submit}
      onCancel={onCancel}
    >
      <Form layout="vertical" form={form} onFinish={onSubmit}>
        <Form.Item label="Title" name="title">
          <Input maxLength={64} />
        </Form.Item>
        <Form.Item
          label="URL"
          name="url"
          rules={[{ type: 'url', message: 'Please enter a valid URL.' }]}
        >
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
}
