import {
  CloudDownloadOutlined,
  PlusCircleFilled,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Button, Flex, Form, Input, Modal, Space, message } from 'antd';
import React, { useState } from 'react';
import base32 from 'hi-base32';
import SearchBannedLinks from './SearchBannedLinks';

interface BlockedLinksTableHeaderProps {
  onExportClick?: () => void;
  onSearch?: (value: string) => void;
  onLinkBanned: () => void;
}

const BlockedLinksTableHeader: React.FC<BlockedLinksTableHeaderProps> = ({
  onExportClick,
  onSearch,
  onLinkBanned,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleConfirm = () => {
    form.validateFields().then(async (values) => {
      const { link, comment } = values;
      setLoading(true);

      try {
        const encodedLink = base32.encode(link);

        const response = await fetch(
          `/api/v1/role/blocked_url/entity/${encodedLink}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              comment: comment || 'Link blocked via Link Management interface',
            }),
          },
        );

        if (!response.ok) {
          throw new Error('Failed to block link');
        }

        // Show success message
        message.success('Link blocked successfully');

        // Reset form
        form.resetFields();

        // Close modal
        setShowBlockLinkModal(false);

        onLinkBanned();
      } catch (error) {
        console.error('Error blocking link:', error);
        message.error('Failed to block link');
      } finally {
        setLoading(false);
      }
    });
  };

  const [showBlockLinkModal, setShowBlockLinkModal] = React.useState(false);

  const toggleShowBlockLinkModal = () => {
    setShowBlockLinkModal(!showBlockLinkModal);
  };

  return (
    <>
      <Flex justify="space-between">
        <Space direction="horizontal">
          <Button disabled={true} icon={<ThunderboltOutlined />}>
            Filter
          </Button>
          <SearchBannedLinks />
        </Space>
        <Space direction="horizontal">
          <Button icon={<CloudDownloadOutlined />} onClick={onExportClick}>
            Export
          </Button>
          <Button
            type="primary"
            icon={<PlusCircleFilled />}
            onClick={toggleShowBlockLinkModal}
          >
            Block Link
          </Button>
        </Space>
      </Flex>

      <Modal
        open={showBlockLinkModal}
        onCancel={() => {
          setShowBlockLinkModal(false);
          form.resetFields();
        }}
        title={'Block Link'}
        footer={[
          <Button
            type="default"
            key="back"
            onClick={() => {
              setShowBlockLinkModal(false);
              form.resetFields();
            }}
          >
            Cancel
          </Button>,
          <Button
            type="primary"
            key="submit"
            onClick={handleConfirm}
            loading={loading}
          >
            Confirm
          </Button>,
        ]}
        width={400}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="link"
            label="Link:"
            rules={[
              { required: true, message: 'Please enter a link to block' },
            ]}
          >
            <Input placeholder="https://example.com" />
          </Form.Item>

          <Form.Item
            name="comment"
            label="Comment:"
            rules={[
              {
                required: true,
                message: 'Please provide a reason for blocking this link',
              },
            ]}
          >
            <Input.TextArea
              placeholder="Why is this link being blocked?"
              rows={4}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default BlockedLinksTableHeader;
