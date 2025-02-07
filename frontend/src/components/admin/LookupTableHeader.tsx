import {
  CloudDownloadOutlined,
  PlusCircleFilled,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Button, Checkbox, Flex, Form, Input, Modal, Space } from 'antd';
import React from 'react';
import SearchUser from '../SearchUser';

// TODO - Actually implement the search functionality; just a placeholder for now
interface LookupTableHeaderProps {
  onExportClick: () => void;
  onSearch: (value: string) => void;
}

const LookupTableHeader: React.FC<LookupTableHeaderProps> = ({
  onExportClick,
}) => {
  const [form] = Form.useForm();

  const handleConfirm = () => {
    form.validateFields().then((values) => {
      console.log('Form values:', values);
      // Handle form submission
      // onCancel();
    });
  };

  const [showCreateUserModal, setShowCreateUserModal] = React.useState(false);

  const toggleCreateUserModal = () => {
    setShowCreateUserModal(!showCreateUserModal);
  };

  return (
    <>
      <Flex justify="space-between">
        <Space direction="horizontal">
          <Button disabled={true} icon={<ThunderboltOutlined />}>
            Filter
          </Button>
          <SearchUser />
        </Space>
        <Space direction="horizontal">
          <Button icon={<CloudDownloadOutlined />} onClick={onExportClick}>
            Export
          </Button>
          <Button
            type="primary"
            icon={<PlusCircleFilled />}
            onClick={toggleCreateUserModal}
          >
            Add User
          </Button>
        </Space>
      </Flex>

      <Modal
        open={showCreateUserModal}
        onCancel={() => {
          setShowCreateUserModal(false);
        }}
        title={'Add User'}
        footer={[
          <Button
            type="default"
            key="back"
            onClick={() => {
              setShowCreateUserModal(false);
            }}
          >
            Cancel
          </Button>,
          <Button
            type="primary"
            key="submit"
            onClick={() => {
              handleConfirm();
              setShowCreateUserModal(false);
            }}
          >
            Confirm
          </Button>,
        ]}
        width={400}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="netid"
            label="NetID:"
            rules={[{ required: true, message: 'Please input a NetID!' }]}
          >
            <Input placeholder="NetID" />
          </Form.Item>

          <Form.Item
            name="roles"
            label="Roles"
            rules={[{ required: true, message: 'Please select a role!' }]}
          >
            <Checkbox.Group>
              <Flex gap="1rem" wrap="wrap" justify="space-between">
                <Space direction="vertical">
                  <Checkbox value="whitelisted">Whitelisted</Checkbox>
                  <Checkbox value="admin">Admin</Checkbox>
                </Space>
                <Space direction="vertical">
                  <Checkbox value="powerUser">Power User</Checkbox>
                  <Checkbox value="facultyStaff">Faculty/Staff</Checkbox>
                </Space>
              </Flex>
            </Checkbox.Group>
          </Form.Item>

          <Form.Item name="comment" label="Comment:">
            <Input.TextArea
              placeholder="Why is this user being assigned/revoked these roles?"
              rows={4}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default LookupTableHeader;
