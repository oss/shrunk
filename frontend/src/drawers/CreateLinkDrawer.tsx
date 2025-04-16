/**
 * Implements the [[CreateLinkDrawer]] component.
 * @packageDocumentation
 */

import React from 'react';
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

  /**
   * Per request of Jack: We want a way to enable/disable the tracking pixel UI
   * by using the config in the backend. There exists an API call
   * called /api/v1/get_pixel_ui_enabled that returns a boolean value. This is temporary
   * as we roll out. This is DIFFERENT from "tracking_pixel_enabled".
   *
   * tracking_pixel_enabled is a boolean value that is set by the user through the radio buttons.
   * tracking_pixel_ui_enabled is a boolean value that is set by the backend.
   */
  tracking_pixel_ui_enabled: boolean;

  userOrgs: OrgInfo[];
}

/**
 * State for the [[CreateLinkDrawer]] component
 * @interface
 */
interface State {
  loading: boolean;
  tracking_pixel_enabled: boolean;
  tracking_pixel_extension: string;
  domain_enabled: boolean;
}

/**
 * The [[CreateLinkDrawer]] component allows the user to create a new link
 * @class
 */

export class CreateLinkDrawer extends React.Component<Props, State> {
  formRef = React.createRef<FormInstance>();

  constructor(props: Props) {
    super(props);
    this.state = {
      loading: false,
      tracking_pixel_enabled: false,
      domain_enabled: false,
      tracking_pixel_extension: '.png',
    };
  }

  async componentDidMount(): Promise<void> {
    await this.fetchIsDomainEnabled();
  }

  fetchIsDomainEnabled = async (): Promise<void> => {
    await fetch('/api/v1/config')
      .then((resp) => resp.json())
      .then((json) =>
        this.setState({ domain_enabled: json.domains as boolean }),
      );
  };

  toggleLoading = () => {
    this.setState({ loading: true });
  };

  /**
   * Basic finishing actions when a user clicks on
   * the Shrink! button.
   */
  onSubmitClick = async (): Promise<void> => {
    this.formRef.current!.resetFields();
    await this.props.onFinish();
    this.setState({ loading: false, tracking_pixel_enabled: false });
  };

  onTrackingPixelChange = (e: RadioChangeEvent) => {
    this.setState({ tracking_pixel_enabled: e.target.value === 'pixel' });
  };

  onTrackingPixelExtensionChange = (e: RadioChangeEvent) => {
    this.setState({ tracking_pixel_extension: e.target.value });
  };

  /**
   * Executes API requests to create a new link and then calls the `onFinish` callback
   * @param values The values from the form
   */
  createLink = async (): Promise<void> => {
    const values: CreateLinkDrawerValues =
      await this.formRef.current!.validateFields();

    this.toggleLoading();
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

    if (this.state.tracking_pixel_enabled) {
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
      this.onSubmitClick();
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
          if (this.state.tracking_pixel_enabled) {
            createAliasReq.extension = this.state.tracking_pixel_extension;
          }
          await fetch(`/api/v1/link/${linkId}/alias`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(createAliasReq),
          });
        },
      ),
    );

    this.onSubmitClick();
  };

  render(): React.ReactNode {
    const initialValues = { aliases: [{ description: '' }] };
    const mayUseCustomAliases =
      this.props.userPrivileges.has('power_user') ||
      this.props.userPrivileges.has('admin');

    const uniqueDomains = new Set<string>();

    if (this.props.userOrgs.length !== 0) {
      this.props.userOrgs.forEach((org) => {
        if (org.domains !== undefined) {
          org.domains.forEach((domain: string) => {
            uniqueDomains.add(domain);
          });
        }
      });
    }

    return (
      <Drawer
        title={this.props.title}
        open={this.props.visible}
        width={720}
        onClose={this.props.onCancel}
        placement="right"
        extra={
          <Space>
            <Button
              icon={<SendOutlined />}
              onClick={this.createLink}
              type="primary"
              loading={this.state.loading}
            >
              {this.state.tracking_pixel_enabled ? 'Create' : 'Shrink'}
            </Button>
          </Space>
        }
      >
        <Form
          ref={this.formRef}
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
                <Input placeholder="Event Marketing Video" />
              </Form.Item>

              {!this.state.tracking_pixel_enabled && (
                <Form.Item
                  label="URL"
                  name="long_url"
                  rules={[
                    { required: true },
                    { type: 'url', message: 'Invalid URL' },
                    { validator: serverValidateLongUrl },
                  ]}
                >
                  <Input placeholder="https://rutgers.edu/..." />
                </Form.Item>
              )}
            </Col>
            <Col span={24}>
              <Typography.Title level={4}>Advanced Options</Typography.Title>
            </Col>
            <Col span={12}>
              {!this.state.tracking_pixel_enabled &&
                this.state.domain_enabled &&
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

              {!this.state.tracking_pixel_enabled && (
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

              {this.props.tracking_pixel_ui_enabled && (
                <>
                  <Form.Item
                    required
                    label="Link Type"
                    name="is_tracking_pixel_link"
                    valuePropName="checked"
                  >
                    <Radio.Group
                      onChange={this.onTrackingPixelChange}
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
              {this.state.tracking_pixel_enabled && (
                <Form.Item
                  required
                  label="Image Type"
                  name="tracking_pixel_extension"
                >
                  <Radio.Group
                    onChange={this.onTrackingPixelExtensionChange}
                    defaultValue=".png"
                    optionType="button"
                    buttonStyle="solid"
                  >
                    <Radio.Button value=".png">PNG</Radio.Button>
                    <Radio.Button value=".gif">GIF</Radio.Button>
                  </Radio.Group>
                </Form.Item>
              )}
              {!this.state.tracking_pixel_enabled && (
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
}
