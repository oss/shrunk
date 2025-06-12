/**
 * Implements the [[LookupTableHeader]] component
 * @packageDocumentation
 */

import {
  Button,
  Checkbox,
  Flex,
  Form,
  Input,
  message,
  Modal,
  Space,
} from 'antd/lib';
import { CloudDownloadIcon, PlusCircleIcon } from 'lucide-react';
import React from 'react';
import { addRoleToUser } from '../../api/users';
import SearchUser from './SearchUser';

/**
 * Props for the [[LookupTableHeader]] component
 * @interface
 */
interface LookupTableHeaderProps {
  /**
   * Callback function to force rehydration of table data
   * @property
   */
  rehydrateData: () => void;

  /**
   * Callback used to initiate the export of the table's current data
   * @property
   */
  onExportClick: () => void;

  /**
   * Callback function to execute when the user searches for a user
   * @property
   */
  onSearch: (value: string) => void;
}

/**
 * The [[LookupTableHeader]] component serves as a collection of operations performed on/related to the user lookup table
 * @class
 */
const LookupTableHeader: React.FC<LookupTableHeaderProps> = ({
  onExportClick,
  rehydrateData,
  onSearch,
}) => {
  const [form] = Form.useForm();
  const [showCreateUserModal, setShowCreateUserModal] = React.useState(false);

  const handleConfirm = () => {
    form.validateFields().then(async (values) => {
      const { netid, roles, comment } = values;

      try {
        const rolePromises = roles.map(async (role: string) => {
          const roleMapping: { [key: string]: string } = {
            whitelisted: 'whitelisted',
            admin: 'admin',
            powerUser: 'power_user',
            facultyStaff: 'facstaff',
          };

          const backendRole = roleMapping[role];
          if (!backendRole) {
            throw new Error(`Invalid role mapping for ${role}`);
          }

          const response = await addRoleToUser(
            netid,
            backendRole,
            comment || `Added via User Lookup interface`,
          );

          if (!response.ok) {
            throw new Error(`Failed to grant role ${backendRole}`);
          }
        });

        await Promise.all(rolePromises);
        setShowCreateUserModal(false);
        message.success('User roles assigned successfully');
        form.resetFields();
        rehydrateData();
      } catch (error) {
        message.error(`Failed to assign user roles ${error}`);
      }
    });
  };

  return (
    <>
      <Flex justify="space-between">
        <Space direction="horizontal">
          <SearchUser onSearch={onSearch} />
        </Space>
        <Space direction="horizontal">
          <Button icon={<CloudDownloadIcon />} onClick={onExportClick}>
            Export
          </Button>
          <Button
            type="primary"
            icon={<PlusCircleIcon />}
            onClick={() => setShowCreateUserModal(true)}
          >
            Add
          </Button>
        </Space>
      </Flex>

      <Modal
        open={showCreateUserModal}
        onCancel={() => setShowCreateUserModal(false)}
        title="Add User"
        footer={[
          <Button key="back" onClick={() => setShowCreateUserModal(false)}>
            Cancel
          </Button>,
          <Button type="primary" key="submit" onClick={handleConfirm}>
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
