import {
  CloudDownloadOutlined,
  PlusCircleFilled,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Button, Checkbox, Col, Form, Input, Modal, Row, Space } from 'antd';
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
      <Row gutter={0} justify="space-between">
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
      </Row>

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

          <div style={{ marginBottom: 8 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>Roles:</div>
            <Form.Item
              name="whitelisted"
              valuePropName="checked"
              style={{ marginBottom: 8 }}
            >
              <Checkbox>Whitelisted</Checkbox>
            </Form.Item>
            <Form.Item
              name="admin"
              valuePropName="checked"
              style={{ marginBottom: 8 }}
            >
              <Checkbox>Admin</Checkbox>
            </Form.Item>
            <Form.Item
              name="powerUser"
              valuePropName="checked"
              style={{ marginBottom: 8 }}
            >
              <Checkbox>Power User</Checkbox>
            </Form.Item>
            <Form.Item
              name="facultyStaff"
              valuePropName="checked"
              style={{ marginBottom: 8 }}
            >
              <Checkbox>Faculty/Staff</Checkbox>
            </Form.Item>
          </div>

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
//    {/* TODO --> Bring back this error message */}
//   {/* <div className="error"> */}
//     {/* {errorMessage !== '' ? errorMessage : '\u00A0'}{' '} */}
//     {/* HACK: Space character to maintain height */}
//   {/* </div> */}

//   {/* TODO --> Move this to be more implicit within the filters */}
//   {/* <div className="operation-tags">
//     {appliedOperations.map((operation) => (
//       <Tag
//         key={generateOperationKey(operation)}
//         closable
//         onClose={() => deleteOperation(generateOperationKey(operation))}
//       >
//         {renderOperation(operation)}
//       </Tag>
//     ))}
//   </div> */}

export default LookupTableHeader;
