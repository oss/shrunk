import {
  CloudDownloadOutlined,
  FilterOutlined,
  PlusCircleFilled
} from '@ant-design/icons';
import { Button, Checkbox, Flex, Form, Input, message, Modal, Space } from 'antd';
import React from 'react';
import base32 from 'hi-base32';
import SearchUser from '../SearchUser';

// TODO - Actually implement the search functionality; just a placeholder for now
interface LookupTableHeaderProps {
  rehydrateData: () => void;
  onExportClick: () => void;
  onSearch: (value: string) => void;
}

const LookupTableHeader: React.FC<LookupTableHeaderProps> = ({
  onExportClick,
  rehydrateData,
}) => {
  const [form] = Form.useForm();

  const handleConfirm = () => {
    form.validateFields().then(async (values) => {
      const { netid, roles, comment } = values;
      const encodedNetId = base32.encode(netid);
  
      try {
        const rolePromises = roles.map(async (role: string) => {
          // Map frontend role names to backend role names
          const roleMapping: { [key: string]: string } = {
            whitelisted: 'whitelisted',
            admin: 'admin',
            powerUser: 'power_user',
            facultyStaff: 'facstaff'
          };
  
          const backendRole = roleMapping[role];
          if (!backendRole) {
            console.log("Invalid role mapping for", role);
            throw new Error(`Invalid role mapping for ${role}`);
          }
  
          console.log("Applying role", backendRole, "to", netid);
          const response = await fetch(`/api/v1/role/${backendRole}/entity/${encodedNetId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comment: comment || `Added via User Lookup interface` }),
          });
  
          if (!response.ok) {
            console.log("Failed to grant role", backendRole);
            console.log("Response", response);
            throw new Error(`Failed to grant role ${backendRole}`);
          }
        });
  
        await Promise.all(rolePromises);
        
        setShowCreateUserModal(false);
        message.success('User roles assigned successfully');
        form.resetFields();
        rehydrateData();
      } catch (error) {
        console.error('Error assigning roles:', error);
        message.error('Failed to assign user roles');
      }
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
          <Button disabled={true} icon={<FilterOutlined />}>
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
