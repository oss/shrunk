/**
 * Implements the [[CreateLinkDrawer]] component.
 * @packageDocumentation
 */

import React, { useState } from 'react';
import base32 from 'hi-base32';
import dayjs from 'dayjs';
import {
  Form,
  Select,
  Input,
  Button,
  DatePicker,
  Radio,
  RadioChangeEvent,
  Col,
  Row,
  Drawer,
  Space,
  Typography,
  Modal,
} from 'antd/lib';
import { SendOutlined } from '@ant-design/icons';
import { FormInstance } from 'antd/lib/form';
import { serverValidateLongUrl } from '../lib/validators';
import AliasesForm from '../components/AliasesForm';
import { OrgInfo } from '../api/Org';
import { FeatureFlags, useFeatureFlags } from '../contexts/FeatureFlags';
/**
 * The final values of the create link form
 * @interface
 */
interface CreateLinkDrawerValues {
  /**
   * The link title
   * @property
   */
  title: string;

  /**
   * The long URL
   * @property
   */
  long_url: string;

  /**
   * The expiration time. Absent if the link has no expiration time
   * @property
   */
  expiration_time?: dayjs.Dayjs;

  /**
   * The link's aliases. The `alias` field of an array element is absent
   * if the alias should be generated randomly by the server
   * @property
   */
  aliases: { alias?: string; description: string }[];

  /**
   * The link's domain. The `domain` field of an array element is absent
   * if the domain is the dafault domain
   * @property
   */
  domain?: string;

  /**
   * Whether the link is a tracking pixel link
   * @property
   */
  is_tracking_pixel_link?: boolean;
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

  userOrgs: OrgInfo[];
}

export default function CreateLinkDrawer(props: Props): JSX.Element {
  const featureFlags: FeatureFlags = useFeatureFlags();
  const [loading, setLoading] = useState<boolean>(false);
  const [linkCreationMode, setLinkCreationMode] = useState<'url' | 'pixel'>(
    'url',
  );
  const [trackingPixelExtension, setTrackingPixelExtension] =
    useState<string>('.png');

  const formRef = React.createRef<FormInstance>();

  const onSubmitClick = async (): Promise<void> => {
    formRef.current!.resetFields();
    await props.onFinish();
    setLoading(false);
    setLinkCreationMode('url');
    setTrackingPixelExtension('.png');
  };

  const onTrackingPixelChange = (e: RadioChangeEvent) => {
    setLinkCreationMode(e.target.value);
  };

  const onTrackingPixelExtensionChange = (e: RadioChangeEvent) => {
    setTrackingPixelExtension(e.target.value);
  };

  const createLink = async (): Promise<void> => {
    const values: CreateLinkDrawerValues =
      await formRef.current!.validateFields();

    setLoading(true);
    const createLinkReq: {
      title: string;
      long_url: string;
      domain?: string;
      expiration_time?: string;
      is_tracking_pixel_link?: boolean;
    } = {
      title: values.title,
      long_url: values.long_url,
    };

    if (linkCreationMode === 'pixel') {
      createLinkReq.long_url = 'https://example.com';
    }

    createLinkReq.is_tracking_pixel_link = !!values.is_tracking_pixel_link;

    if (values.expiration_time !== undefined) {
      createLinkReq.expiration_time = values.expiration_time.format();
    }

    if (values.aliases === undefined) {
      values.aliases = [
        {
          description: '',
        },
      ];
    }

    if (values.domain !== undefined) {
      createLinkReq.domain = values.domain;
    }

    let statusOfReq = 200;
    const createLinkResp = await fetch('/api/v1/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createLinkReq),
    }).then((resp) => {
      statusOfReq = resp.status;
      return resp.json();
    });

    if (statusOfReq >= 400 && statusOfReq < 500) {
      Modal.error({
        title: 'An error has ocurred',
        content: createLinkResp.errors,
      });
      onSubmitClick();
      return;
    }

    const linkId: string = createLinkResp.id;

    await Promise.all(
      values.aliases.map(
        async (alias: { description: string; alias?: string }) => {
          const createAliasReq: any = { description: alias.description };
          let result = null;
          // Check if there are duplicate aliases
          if (alias.alias !== undefined) {
            result = await fetch(
              `/api/v1/link/validate_duplicate_alias/${base32.encode(
                alias.alias!,
              )}`,
            ).then((resp) => resp.json());
          }
          if (alias.alias !== undefined && result.valid) {
            createAliasReq.alias = alias.alias;
          }
          if (featureFlags.trackingPixel) {
            createAliasReq.extension = trackingPixelExtension;
          }
          await fetch(`/api/v1/link/${linkId}/alias`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(createAliasReq),
          });
        },
      ),
    );

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
            icon={<SendOutlined />}
            onClick={createLink}
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

            {!featureFlags.trackingPixel && (
              <Form.Item
                label="URL"
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
          </Col>
          <Col span={24}>
            <Typography.Title level={4}>Advanced Options</Typography.Title>
          </Col>
          <Col span={12}>
            {!featureFlags.trackingPixel &&
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

            {!featureFlags.trackingPixel && (
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
            {featureFlags.trackingPixel && (
              <Form.Item
                required
                label="Image Type"
                name="tracking_pixel_extension"
              >
                <Radio.Group
                  onChange={onTrackingPixelExtensionChange}
                  defaultValue=".png"
                  optionType="button"
                  buttonStyle="solid"
                >
                  <Radio.Button value=".png">PNG</Radio.Button>
                  <Radio.Button value=".gif">GIF</Radio.Button>
                </Radio.Group>
              </Form.Item>
            )}
            {!featureFlags.trackingPixel && (
              <AliasesForm
                mayUseCustomAliases={mayUseCustomAliases}
                initialAliases={['']}
              />
            )}
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
}
