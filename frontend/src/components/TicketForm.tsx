import {
  Button,
  Form,
  Input,
  Result,
  Select,
  Spin,
  Typography,
} from 'antd/lib';
import React, { useEffect, useState } from 'react';
import { Ticket } from './TicketTable';

const { Title, Text } = Typography;

/**
 * Props for the [[TicketForm]] component
 * @interface
 */
interface Props {
  /**
   * The NetID of the currently logged in user
   * @property
   */
  netid: string;
}

/**
 * Component for the ticket submission form
 */
const TicketForm: React.FC<Props> = ({ netid }) => {
  /**
   * State for the [[TicketForm]] component
   *
   * loading: Whether the component is loading
   * submitting: Whether the form submission is in progress
   * form: The form instance
   * reasonField: The reason the ticket is being requested
   * formText: Important strings for the form (e.g. prompt, placeholder, etc.)
   * ticketStatus: The status of the ticket request
   */
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [form] = Form.useForm();
  const [reasonField, setReasonField] = useState<string>('');
  const [formText, setFormText] = useState<{ [key: string]: string }>({});
  const [ticketStatus, setTicketStatus] = useState<number>(0);

  /**
   * Submit a ticket
   * @method
   *
   * @param values - The values of the form fields
   * @returns the ticket
   */
  const submitTicket = async (values: any): Promise<Ticket> => {
    setSubmitting(true);
    const body = {
      reporter: netid,
      ...values,
      ...(values.reason === 'power_user' && { entity: netid }),
    };

    const response = await fetch('/api/v1/ticket', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    setTicketStatus(response.status);
    setSubmitting(false);

    return data;
  };

  /**
   * Send a confirmation/notification email
   * @method
   *
   * @param ticket - The ticket that was just submitted
   * @param category - The category of the email
   */
  const sendEmail = async (ticket: Ticket, category: string) => {
    const body = {
      ticketID: ticket._id,
      category,
    };

    await fetch('/api/v1/ticket/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  };

  /**
   * Handle the form submission; send the ticket and show the status
   * @method
   */
  const handleFormSubmit = async (values: any) => {
    const ticket = await submitTicket(values);
    await sendEmail(ticket, 'confirmation');
    await sendEmail(ticket, 'notification');
  };

  /**
   * Handle when the user wants to submit another ticket
   * @method
   */
  const handleAnotherTicket = () => {
    form.resetFields();
    setReasonField('');
    setTicketStatus(0);
  };

  /**
   * Handle when the user changes the reason field
   * @method
   *
   * @param newReason - The new value of the reason field
   */
  const handleReasonChange = (newReason: string) => {
    setReasonField(newReason);
    form.resetFields(['entity', 'comment']);
  };

  /**
   * Validate whether the entity field is alphanumeric
   * @method
   *
   * @param _ - The form instance
   * @param value - The value of the entity field
   */
  const validateEntity = (_: any, value: string) => {
    if (value && !/^[a-zA-Z0-9]+$/.test(value)) {
      return Promise.reject(new Error('NetID must be alphanumeric'));
    }
    return Promise.resolve();
  };

  /**
   * Validate whether the comment field does not contain a newline character
   * @method
   *
   * @param _ - The form instance
   * @param value - The value of the comment field
   */
  const validateComment = (_: any, value: string) => {
    if (value && value.includes('\n')) {
      return Promise.reject(
        new Error('Comment cannot contain a newline character'),
      );
    }
    return Promise.resolve();
  };

  // Fetch the ticket text when the reason field changes
  useEffect(() => {
    const fetchTicketText = async () => {
      if (reasonField) {
        const response = await fetch(`/api/v1/ticket/${reasonField}/text`);
        const data = await response.json();
        setFormText(data);
      }
    };

    setLoading(true);
    fetchTicketText();
    setLoading(false);
  }, [reasonField]);

  return (
    <>
      {loading ? (
        <Spin size="large" />
      ) : ticketStatus ? (
        <Result
          status={ticketStatus === 201 ? 'success' : 'error'}
          title={
            ticketStatus === 201
              ? 'Successfully submitted your ticket!'
              : 'An error occurred attempting to submit your ticket'
          }
          subTitle={
            formText[String(ticketStatus)] || 'Failed to load subtitle text.'
          }
          extra={[
            <Button key="refresh" type="primary" onClick={handleAnotherTicket}>
              Submit Another Ticket
            </Button>,
            <Button key="dashboard" href="/app/#/dash">
              Return to Dashboard
            </Button>,
          ]}
        />
      ) : (
        <Form
          form={form}
          onFinish={handleFormSubmit}
          layout="vertical"
          requiredMark={false}
        >
          <Title level={2}>Submit a Ticket</Title>
          <Form.Item
            label="Reason"
            name="reason"
            rules={[{ required: true, message: 'Please select a reason' }]}
          >
            <Select
              value={reasonField}
              onChange={(value: string) => handleReasonChange(value)}
              placeholder="Select a reason for the request"
            >
              <Select.Option value="power_user">
                Grant me the power user role
              </Select.Option>
              <Select.Option value="whitelisted">
                Whitelist another person to Go services
              </Select.Option>
              <Select.Option value="other">Other</Select.Option>
            </Select>
          </Form.Item>
          {reasonField && (
            <Form.Item>
              <Text strong>
                {formText.prompt || 'Failed to load prompt text.'}
              </Text>
            </Form.Item>
          )}
          {reasonField === 'whitelisted' && (
            <Form.Item
              label="Associated NetID"
              name="entity"
              rules={[
                { required: true, message: 'Please enter a NetID' },
                {
                  max: 10,
                  message: 'NetID cannot be longer than 10 characters',
                },
                { validator: validateEntity },
              ]}
            >
              <Input placeholder="NetID of the person you want to whitelist" />
            </Form.Item>
          )}
          {reasonField && (
            <>
              <Form.Item
                label="Comment"
                name="comment"
                rules={[
                  { required: true, message: 'Please enter a comment' },
                  {
                    max: 300,
                    message: 'Comment cannot be longer than 300 characters',
                  },
                  { validator: validateComment },
                ]}
              >
                <Input.TextArea
                  rows={4}
                  placeholder={
                    formText.placeholder || 'Failed to load placeholder text.'
                  }
                />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={submitting}>
                  Submit Ticket
                </Button>
              </Form.Item>
            </>
          )}
        </Form>
      )}
    </>
  );
};

export default TicketForm;
