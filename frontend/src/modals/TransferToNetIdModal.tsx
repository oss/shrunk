import { Button, Form, Input, Modal, Popconfirm, message } from 'antd';
import React, { useState } from 'react';
import { serverValidateNetId } from '../api/validators';

interface ITransferModal {
  visible: boolean;
  onOk: (netid: string, link_id: string) => Promise<void>;
  onCancel: () => void;
  link_id: string;
}

const TransferToNetIdModal = (props: ITransferModal) => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [disableSubmit, setDisabledSubmit] = useState(true);

  const handleFormChange = () => {
    const hasErrors = form.getFieldsError().some(({ errors }) => errors.length);
    setDisabledSubmit(hasErrors || form.getFieldsValue().netId === '');
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await props.onOk(form.getFieldValue('netId'), props.link_id);
      form.resetFields();
    } catch (error) {
      message.error('Failed to transfer ownership: ');
    } finally {
      setLoading(false);
    }
  };
  return (
    <Modal
      title="Transfer to Net ID"
      open={props.visible}
      onCancel={props.onCancel}
      loading={loading}
      footer={
        <>
          <Popconfirm
            title="Are you sure you want to transfer ownership?"
            onConfirm={handleSubmit}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button type="primary" disabled={disableSubmit} loading={loading}>
              Confirm Transfer
            </Button>
          </Popconfirm>
          <Button onClick={props.onCancel}>Cancel</Button>
        </>
      }
    >
      <Form layout="vertical" form={form} onFieldsChange={handleFormChange}>
        <Form.Item
          label="Net ID"
          name="netId"
          rules={[{ validator: serverValidateNetId }]}
        >
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TransferToNetIdModal;
