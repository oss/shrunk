/**
 * Implements the [[EditLinkDrawer]] component
 * @packageDocumentation
 */

import React, { useState } from 'react';
import dayjs from 'dayjs';
import {
  Col,
  Modal,
  Form,
  Input,
  Button,
  DatePicker,
  Space,
  Popconfirm,
  message,
  Row,
  Drawer,
} from 'antd/lib';
import {
  LinkOutlined,
  ExclamationCircleFilled,
  DeleteOutlined,
  SaveOutlined,
} from '@ant-design/icons';

import { LinkInfo } from '../components/LinkInfo';
import { serverValidateLongUrl, serverValidateNetId } from '../Validators';
import AliasesForm from '../components/AliasesForm';

/**
 * The final values of the edit link form
 * @interface
 */
export interface EditLinkFormValues {
  /**
   * The new title
   * @property
   */
  title: string;

  /**
   * The new long URL
   * @property
   */
  long_url: string;

  /**
   * The new expiration time, or `null` if the expiration time should
   * be cleared
   * @property
   */
  expiration_time: dayjs.Dayjs | null;

  /**
   * The new owner of the link.
   * @property
   */
  owner: string;

  /**
   * The new aliases
   * @property
   */
  aliases: { alias: string; description: string }[];
}

/**
 * Props of the [[EditLinkDrawer]] component
 * @interface
 */
export interface Props {
  /**
   * Whether the modal is visible
   * @property
   */
  visible: boolean;

  /**
   * The user's privileges, used to determine whether the user
   * may create custom aliases
   * @property
   */
  userPrivileges: Set<string>;

  /**
   * NetID of the user
   * @property
   */
  netid: string;

  /**
   * The original [[LinkInfo]] of the link to edit
   * @property
   */
  linkInfo: LinkInfo;

  /**
   * Callback that will be called when the user clicks the "ok" button
   * @property
   */
  onOk: (values: EditLinkFormValues) => void;

  /**
   * Callback that will be called when the user closes the modal without
   * saving their changes
   * @property
   */
  onCancel: () => void;
}

/**
 * The [[EditLinkDrawer]] component allows the user to edit a link's information. The user may
 *   * Change the title
 *   * Change the long URL
 *   * Change or remove the link's expiration time
 *   * Add, remove, or update aliases. If the user has the `"power_user"` privilege, the user may
 *     set the text of the alias
 * @param props The props
 */
export const EditLinkDrawer: React.FC<Props> = (props) => {
  const [form] = Form.useForm();
  const mayEditAliases =
    props.userPrivileges.has('power_user') || props.userPrivileges.has('admin');
  const initialValues: any = {
    ...props.linkInfo,
    expiration_time:
      props.linkInfo.expiration_time === null
        ? null
        : dayjs(props.linkInfo.expiration_time),
    aliases: props.linkInfo.aliases.filter((alias) => !alias.deleted),
  };
  const mayEditOwner =
    props.netid === initialValues.owner || props.userPrivileges.has('admin');

  const isTrackingPixelLink = props.linkInfo.is_tracking_pixel_link;

  const [ownerInputVal, setOwnerInputVal] = useState(initialValues.owner);
  const handleChange = (e: any) => {
    setOwnerInputVal(e.target.value);
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      props.onOk(values as EditLinkFormValues);
    });
  };

  const handleDelete = async () => {
    try {
      await fetch(`/api/v1/link/${props.linkInfo._id}`, {
        method: 'DELETE',
      });
      message.success('Link deleted successfully');
      setTimeout(() => {
        window.location.href = '/app/#/dash';
      }, 1000); // 1-second delay
    } catch (error) {
      message.error('Failed to delete link');
    }
  };

  const onSave = () => {
    if (ownerInputVal !== initialValues.owner) {
      Modal.confirm({
        title: 'Link owner modification',
        icon: <ExclamationCircleFilled />,
        content:
          'You are about to modify the link owner. Do you wish to proceed?',
        okText: 'Yes',
        onOk() {
          handleSubmit();
        },
      });
    } else {
      handleSubmit();
    }
  };

  return (
    <Drawer
      open={props.visible}
      title="Edit link"
      width={720}
      onClose={() => {
        form.resetFields();
        props.onCancel();
      }}
      extra={
        <Space>
          <Popconfirm
            title="Are you sure you want to delete this link?"
            onConfirm={handleDelete}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
          <Button icon={<SaveOutlined />} onClick={onSave} type="primary">
            Save
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        requiredMark={false}
      >
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label="Title"
              name="title"
              rules={[{ required: true, message: 'Please input a title.' }]}
            >
              <Input placeholder="Title" />
            </Form.Item>

            {isTrackingPixelLink ? (
              <></>
            ) : (
              <Form.Item
                label="URL"
                name="long_url"
                rules={[
                  { required: true, message: 'Please input a URL.' },
                  { type: 'url', message: 'Please enter a valid URL.' },
                  { validator: serverValidateLongUrl },
                ]}
              >
                <Input
                  placeholder="Long URL"
                  prefix={<LinkOutlined className="site-from-item-icon" />}
                  disabled={isTrackingPixelLink}
                />
              </Form.Item>
            )}
          </Col>
          <Col span={12}>
            <Form.Item
              label="Owner"
              name="owner"
              rules={[
                { required: true, message: 'Please input a NetID.' },
                { validator: serverValidateNetId },
              ]}
            >
              <Input
                placeholder="Link owner"
                onChange={handleChange}
                disabled={!mayEditOwner}
              />
            </Form.Item>

            <Form.Item label="Expiration time" name="expiration_time">
              <DatePicker
                format="YYYY-MM-DD HH:mm:ss"
                disabledDate={(current) =>
                  current && current < dayjs().startOf('day')
                }
                showTime={{
                  defaultValue: props.linkInfo.expiration_time
                    ? dayjs(props.linkInfo.expiration_time)
                    : undefined,
                }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            {!isTrackingPixelLink && (
              <AliasesForm
                mayUseCustomAliases={mayEditAliases}
                initialAliases={initialValues.aliases.map(
                  (alias: any) => alias.alias,
                )}
              />
            )}
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
};
