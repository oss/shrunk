/**
 * Implements the [[CreateLinkForm]] component.
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
  Spin,
  Modal,
  Radio,
  RadioChangeEvent,
  Col,
  Row,
  Card,
} from 'antd/lib';
import {
  MinusCircleOutlined,
} from '@ant-design/icons';
import { FormInstance } from 'antd/lib/form';
import {
  serverValidateReservedAlias,
  serverValidateDuplicateAlias,
  serverValidateLongUrl,
} from '../Validators';
import '../Base.css';
/**
 * The final values of the create link form
 * @interface
 */
interface CreateLinkFormValues {
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
  domain?: string

  /**
   * Whether the link is a tracking pixel link
   * @property
   */
  is_tracking_pixel_link?: boolean;
}

/**
 * Props for the [[CreateLinkForm]] component
 * @interface
 */
export interface Props {
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

  //the any should be fixed but its fine for now
  userOrgs: any;
}

/**
 * State for the [[CreateLinkForm]] component
 * @interface
 */
interface State {
  loading: boolean;
  tracking_pixel_enabled: boolean;
  tracking_pixel_extension: string;
}

/**
 * The [[CreateLinkForm]] component allows the user to create a new link
 * @class
 */
export class CreateLinkForm extends React.Component<Props, State> {
  formRef = React.createRef<FormInstance>();

  constructor(props: Props) {
    super(props);
    this.state = {
      loading: false,
      tracking_pixel_enabled: false,
      tracking_pixel_extension: '.png',
    };
  }

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
  createLink = async (values: CreateLinkFormValues): Promise<void> => {
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

    createLinkReq.is_tracking_pixel_link = !!values.is_tracking_pixel_link;

    if (values.title === undefined) {
      createLinkReq.title = values.aliases[0].alias ?? values.long_url;
    }
    if (values.expiration_time !== undefined) {
      createLinkReq.expiration_time = values.expiration_time.format();
    }

    if (values.domain !== undefined) {
      createLinkReq.domain = values.domain
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
      values.aliases.map(async (alias) => {
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
      }),
    );

    this.onSubmitClick();
  };

  render(): React.ReactNode {
    const initialValues = { aliases: [{ description: '' }] };
    const mayUseCustomAliases =
      this.props.userPrivileges.has('power_user') ||
      this.props.userPrivileges.has('admin');
    const uniqueDomains = [...new Set(this.props.userOrgs.flatMap((org: { domains: any }) => org.domains.map((item: any) => item.domain)))];

    return (
      <Form
        ref={this.formRef}
        layout="vertical"
        initialValues={initialValues}
        onFinish={this.createLink}
      >
        <Row gutter={[16, 16]} justify="end">
          <Col span={12}>
            {!this.state.tracking_pixel_enabled && (
              <>
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
              </>
            )}
            <Form.Item label="Title" name="title">
              <Input />
            </Form.Item>
            {this.props.tracking_pixel_ui_enabled && (
              <Form.Item name="is_tracking_pixel_link" valuePropName="checked">
                <Radio.Group
                  onChange={this.onTrackingPixelChange}
                  options={[
                    { label: 'URL', value: 'url' },
                    { label: 'Tracking Pixel', value: 'pixel' },
                  ]}
                  defaultValue="url"
                />

                {this.state.tracking_pixel_enabled && (
                  <>
                    <Form.Item
                      name="tracking_pixel_extension"
                      label="Extension"
                    >
                      <Radio.Group
                        onChange={this.onTrackingPixelExtensionChange}
                        options={[
                          { label: '.png', value: '.png' },
                          { label: '.gif', value: '.gif' },
                        ]}
                        defaultValue=".png"
                      />
                    </Form.Item>
                  </>
                )}
              </Form.Item>
            )}

            <Form.Item label="Expiration time" name="expiration_time">
              <DatePicker
                format="YYYY-MM-DD HH:mm:ss"
                disabledDate={(current) =>
                  current && current < dayjs().startOf('day')
                }
                showTime={{ defaultValue: dayjs() }}
              />
            </Form.Item>

            <Form.Item>
              <Spin spinning={this.state.loading}>
                <Button type="primary" htmlType="submit">
                  {this.state.tracking_pixel_enabled ? 'Create!' : 'Shrink!'}
                </Button>
              </Spin>
            </Form.Item>

          </Col>
          <Col span={12}>
            <Form.Item label="Domain" name="domain">
              {mayUseCustomAliases ? (
                <Select
                  showSearch
                  options={uniqueDomains.map(domain => ({ value: domain, label: domain }))}
                  defaultValue=""
                  placeholder="Select a domain"
                />
              ) : (
                <p>domain</p>
              )}
            </Form.Item>
            <Form.List name="aliases">
              {(fields, { add, remove }) => (
                <div
                  style={{
                    display: 'flex',
                    rowGap: 16,
                    flexDirection: 'column',
                  }}
                >
                  {fields.map((field, index) => (
                    <Card
                      title={`Alias ${index + 1}`}
                      size="small"
                      key={field.key}
                      extra={
                        fields.length > 1 ? (
                          <MinusCircleOutlined
                            onClick={() => {
                              if (fields.length > 1) {
                                remove(field.name);
                              }
                            }}
                          />
                        ) : (
                          <></>
                        )
                      }
                    >

                      <Row gutter={16}>
                        <Col span={12}>
                          {!mayUseCustomAliases ? (
                            <></>
                          ) : (
                            <Form.Item
                              label="Alias"
                              name={[field.name, 'alias']}
                              rules={[
                                {
                                  min: 5,
                                  message:
                                    'Aliases may be no shorter than 5 characters.',
                                },
                                {
                                  max: 60,
                                  message:
                                    'Aliases may be no longer than 60 characters.',
                                },
                                {
                                  pattern: /^[a-zA-Z0-9_.,-]*$/,
                                  message:
                                    'Aliases may consist only of numbers, letters, and the punctuation marks “.,-_”.',
                                },
                                { validator: serverValidateReservedAlias },
                                { validator: serverValidateDuplicateAlias },
                              ]}
                            >
                              <Input />
                            </Form.Item>
                          )}
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            label="Description"
                            name={[field.name, 'description']}
                          >
                            <Input />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>
                  ))}
                  {fields.length >= 6 ? (
                    <></>
                  ) : (
                    <Button type="dashed" onClick={() => add()} block>
                      + Add Alias
                    </Button>
                  )}
                </div>
              )}
            </Form.List>
          </Col>
        </Row>
      </Form>
    );
  }
}
