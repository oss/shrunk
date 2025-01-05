/**
 * Implements the [[EditLinkModal]] component
 * @packageDocumentation
 */

import React, { useState } from 'react';
import dayjs from 'dayjs';
import {
  Modal,
  Form,
  Input,
  Button,
  DatePicker,
  Space,
  Popconfirm,
} from 'antd/lib';
import {
  LinkOutlined,
  PlusOutlined,
  MinusCircleOutlined,
  ExclamationCircleFilled,
} from '@ant-design/icons';
import base32 from 'hi-base32';

import { LinkInfo } from '../components/LinkInfo';
import {
  serverValidateReservedAlias,
  serverValidateLongUrl,
  serverValidateNetId,
} from '../Validators';
import './FixAliasRemoveButton.css';

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
 * Props of the [[EditLinkModal]] component
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
 * The [[EditLinkModal]] component allows the user to edit a link's information. The user may
 *   * Change the title
 *   * Change the long URL
 *   * Change or remove the link's expiration time
 *   * Add, remove, or update aliases. If the user has the `"power_user"` privilege, the user may
 *     set the text of the alias
 * @param props The props
 */
export const EditLinkModal: React.FC<Props> = (props) => {
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
  const isAnInitialAlias = (alias: any) => {
    if (
      initialValues.aliases.some((obj: { alias: any }) => obj.alias === alias)
    ) {
      return true;
    }
    return false;
  };

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

  return (
    <Modal
      open={props.visible}
      title="Edit link"
      onOk={() => {
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
      }}
      onCancel={() => {
        form.resetFields();
        props.onCancel();
      }}
    >
      <Form form={form} layout="vertical" initialValues={initialValues}>
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
            label="Long URL"
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

        <Form.List name="aliases">
          {(fields, { add, remove }) => (
            <div>
              {fields.map((field, index) => (
                <Space
                  key={field.key}
                  style={{ display: 'flex', marginBottom: 8 }}
                  align="start"
                  direction="vertical"
                >
                  <Form.Item
                    style={{
                      width: '470px',
                    }}
                    label={
                      <>
                        Alias
                        <Popconfirm
                          placement="topRight"
                          title="Are you sure you want to delete this alias?"
                          onConfirm={() => remove(field.name)}
                          icon={
                            <ExclamationCircleFilled style={{ color: 'red' }} />
                          }
                          disabled={fields.length === 1}
                        >
                          <Button
                            disabled={fields.length === 1}
                            type="text"
                            icon={<MinusCircleOutlined />}
                            size="middle"
                          />
                        </Popconfirm>
                      </>
                    }
                    name={[field.name, 'alias']}
                    fieldKey={field.fieldKey}
                    rules={[
                      { required: true, message: 'Please enter an alias.' },
                      {
                        min: 5,
                        message: 'Alias may be no shorter than 5 characters.',
                      },
                      {
                        max: 60,
                        message: 'Alias may be no longer than 60 characters.',
                      },
                      {
                        pattern: /^[a-zA-Z0-9_.,-]*$/,
                        message:
                          'Alias may consist only of numbers, letters, and the punctuation marks “.,-_”.',
                      },
                      { validator: serverValidateReservedAlias },
                      () => ({
                        async validator(_, value): Promise<void> {
                          if (!value || isAnInitialAlias(value)) {
                            return Promise.resolve();
                          }
                          const result = await fetch(
                            `/api/v1/link/validate_duplicate_alias/${base32.encode(
                              value,
                            )}`,
                          ).then((resp) => resp.json());
                          if (!result.valid && value.length >= 5) {
                            return Promise.reject(new Error(result.reason));
                          }
                        },
                      }),
                    ]}
                  >
                    <Input disabled={!mayEditAliases} placeholder="Alias" />
                  </Form.Item>

                  <Form.Item
                    style={{
                      width: '470px',
                    }}
                    label={index === 0 ? 'Description' : ''}
                    name={[field.name, 'description']}
                    fieldKey={field.fieldKey}
                  >
                    <Input
                      disabled={!mayEditAliases}
                      placeholder="Description"
                    />
                  </Form.Item>
                </Space>
              ))}

              {!mayEditAliases || fields.length >= 6 ? (
                <></>
              ) : (
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => {
                      add();
                    }}
                    block
                  >
                    <PlusOutlined /> Add an alias
                  </Button>
                </Form.Item>
              )}
            </div>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
};
