/**
 * Implements the [[CreateLinkDrawer]] component.
 * @packageDocumentation
 */

import {
  Button,
  Col,
  Drawer,
  Form,
  Input,
  Radio,
  RadioChangeEvent,
  Row,
  Select,
  Space,
  Typography,
  message,
} from 'antd/lib';
import { FormInstance } from 'antd/lib/form';
import dayjs from 'dayjs';
import { SendHorizontalIcon } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { createLink } from '../api/links';
import { serverValidateLongUrl } from '../api/validators';
import DatePicker from '../components/date-picker';
import { useFeatureFlags } from '../contexts/FeatureFlags';
import { FeatureFlags } from '../interfaces/app';
import { Organization } from '../interfaces/organizations';
/**
 * The final values of the create link form
 * @interface
 */
interface CreateLinkDrawerValues {
  title: string;
  long_url: string;
  expiration_time?: dayjs.Dayjs;
  alias: string;
  domain?: string;
  is_tracking_pixel_link?: boolean;
  tracking_pixel_extension?: string;
}

/**
 * Props for the [[CreateLinkDrawer]] component
 * @interface
 */
export interface Props {
  title: string;
  visible: boolean;

  onCancel: () => void;

  /** The user's privileges. Used to determine whether the user is allowed
   * to set custom aliases
   * @property
   */
  userPrivileges: Set<string>;

  /**
   * Callback called after the user submits the form and the new link is created
   * @property
   */
  onFinish: () => Promise<void>;

  userOrgs: Organization[];
}

export default function CreateLinkDrawer(props: Props): JSX.Element {
  const featureFlags: FeatureFlags = useFeatureFlags();
  const [loading, setLoading] = useState<boolean>(false);
  const [linkCreationMode, setLinkCreationMode] = useState<'url' | 'pixel'>(
    'url',
  );

  const formRef = useRef<FormInstance>(null);

  const onSubmitClick = async (): Promise<void> => {
    formRef.current!.resetFields();
    await props.onFinish();
    setLoading(false);
    setLinkCreationMode('url');
  };

  const onTrackingPixelChange = (e: RadioChangeEvent) => {
    setLinkCreationMode(e.target.value);
  };

  const onCreateLink = async (): Promise<void> => {
    const values: CreateLinkDrawerValues =
      await formRef.current!.validateFields();

    setLoading(true);
    try {
      await createLink(
        values.is_tracking_pixel_link as boolean,
        values.title,
        values.long_url,
        values.alias,
        values.expiration_time,
        values.tracking_pixel_extension as '.png' | '.gif',
      );
    } catch (e: any) {
      message.error(e.message);
      setLoading(false);
    }

    onSubmitClick();
  };

  const initialValues = { aliases: [{ description: '' }] };
  const mayUseCustomAliases =
    props.userPrivileges.has('power_user') || props.userPrivileges.has('admin');

  const uniqueDomains = new Set<string>();

  if (props.userOrgs.length !== 0) {
    props.userOrgs.forEach((org) => {
      if (org.domains !== undefined) {
        org.domains.forEach((domain: string) => {
          uniqueDomains.add(domain);
        });
      }
    });
  }

  const isCreatingTrackingPixel = linkCreationMode === 'pixel';

  return (
    <Drawer
      title={props.title}
      open={props.visible}
      width={720}
      onClose={props.onCancel}
      placement="right"
      extra={
        <Space>
          <Button
            icon={<SendHorizontalIcon />}
            onClick={onCreateLink}
            type="primary"
            loading={loading}
          >
            Create
          </Button>
        </Space>
      }
    >
      <Form
        ref={formRef}
        layout="vertical"
        initialValues={initialValues}
        requiredMark={false}
      >
        <Row gutter={16} justify="end">
          <Col span={24}>
            <Form.Item
              label="Title"
              name="title"
              rules={[{ required: true, message: 'Please input a title.' }]}
            >
              <Input />
            </Form.Item>

            {!isCreatingTrackingPixel && (
              <Form.Item
                label="Original URL"
                name="long_url"
                rules={[
                  { required: true },
                  { type: 'url', message: 'Invalid URL' },
                  { validator: serverValidateLongUrl },
                ]}
              >
                <Input />
              </Form.Item>
            )}
            {!isCreatingTrackingPixel && mayUseCustomAliases && (
              <Form.Item required label="New Shortened URL" name="alias">
                <Input
                  addonBefore="http://go.rutgers.edu/"
                  placeholder="If left blank, it will be randomized"
                />
              </Form.Item>
            )}
          </Col>
          <Col span={24}>
            <Typography.Title level={4}>Advanced Options</Typography.Title>
          </Col>
          <Col span={12}>
            {!isCreatingTrackingPixel &&
              featureFlags.domains &&
              mayUseCustomAliases && (
                <Form.Item label="Domain" name="domain">
                  <Select
                    showSearch
                    options={Array.from(uniqueDomains).map(
                      (domain: string) => ({
                        value: domain,
                        label: domain,
                      }),
                    )}
                    defaultValue=""
                    placeholder="Select a domain"
                  />
                </Form.Item>
              )}

            {!isCreatingTrackingPixel && (
              <Form.Item label="Expiration time" name="expiration_time">
                <DatePicker
                  format="YYYY-MM-DD HH:mm:ss"
                  disabledDate={(current) =>
                    current && current < dayjs().startOf('day')
                  }
                  showTime={{ defaultValue: dayjs() }}
                />
              </Form.Item>
            )}

            {featureFlags.trackingPixel && (
              <>
                <Form.Item
                  required
                  label="Link Type"
                  name="is_tracking_pixel_link"
                  valuePropName="checked"
                >
                  <Radio.Group
                    onChange={onTrackingPixelChange}
                    defaultValue="url"
                    optionType="button"
                    buttonStyle="solid"
                  >
                    <Radio.Button value="url">URL</Radio.Button>
                    <Radio.Button value="pixel">Tracking Pixel</Radio.Button>
                  </Radio.Group>
                </Form.Item>
              </>
            )}
          </Col>
          <Col span={12}>
            {isCreatingTrackingPixel && (
              <Form.Item
                required
                label="Image Type"
                name="tracking_pixel_extension"
              >
                <Radio.Group
                  defaultValue=".png"
                  optionType="button"
                  buttonStyle="solid"
                >
                  <Radio.Button value=".png">PNG</Radio.Button>
                  <Radio.Button value=".gif">GIF</Radio.Button>
                </Radio.Group>
              </Form.Item>
            )}
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
}
