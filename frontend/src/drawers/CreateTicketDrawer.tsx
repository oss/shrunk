/**
 * Implement the [[CreateTicketDrawer]] component
 * @packageDocumentation
 */

import { App, Button, Drawer, Form, Input, Select, Typography } from 'antd';
import React, { useState } from 'react';
import { CreateTicketInfo, TicketInfo } from '@/interfaces/tickets';
import { createTicket, sendTicketEmail } from '@/api/tickets';

/**
 * Props for the [[CreateTicketDrawer]] component
 */
interface Props {
  /**
   * Whether the drawer is visible
   * @property
   */
  open: boolean;

  /**
   * Callback for when the drawer is closed
   * @property
   */
  onClose: () => void;

  /**
   * The text fields related to the help desk
   * @property
   */
  helpDeskText: Record<string, any>;

  /**
   * setState function for the tickets
   * @property
   */
  setTickets: React.Dispatch<React.SetStateAction<TicketInfo[]>>;
}

/**
 * Component for the ticket submission form. This is a drawer.
 */
const CreateTicketDrawer: React.FC<Props> = ({
  open,
  onClose,
  helpDeskText,
  setTickets,
}) => {
  /**
   * State for the [[CreateTicketDrawer]] component
   *
   * submitting: Whether the form submission is in progress
   * reasonField: The reason the ticket is being created
   * form: The form instance
   */
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [reasonField, setReasonField] = useState<string>('');
  const [form] = Form.useForm();

  const { message } = App.useApp();
  const isDev = import.meta.env.DEV;

  /**
   * Create a ticket.
   * @method
   *
   * @param values - The values of the form fields
   * @returns the ticket information
   */
  const onCreateTicket = async (
    values: CreateTicketInfo,
  ): Promise<TicketInfo | null> => {
    setSubmitting(true);

    const response = await createTicket(
      values.reason,
      values.user_comment,
      values.entity,
    );
    const data = await response.json();

    if (response.ok) {
      setTickets((tickets) => [data.ticket, ...tickets]);
      message.success(data.message || 'Success', 2);
      setSubmitting(false);
      return data.ticket;
    }

    // Failed to create the ticket
    message.error(data.message || 'Error', 2);
    setSubmitting(false);
    return null;
  };

  /**
   * Handle the form submission; send the ticket and show the status
   * @method
   *
   * @param values - The values of the form fields
   */
  const handleFormSubmit = async (values: CreateTicketInfo) => {
    // Perform the actual submission
    const ticket = await onCreateTicket(values);
    if (ticket) {
      await sendTicketEmail(ticket._id, 'confirmation');
      await sendTicketEmail(ticket._id, 'notification');
    }

    // Reset the drawer
    setReasonField('');
    form.resetFields();

    onClose();
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
   * Validate whether the entity field is alphanumeric. Allow for non-alphanumeric NetIDs in development mode.
   * @method
   *
   * @param _ - The form instance
   * @param value - The value of the entity field
   */
  const validateEntity = (_: any, value: string) => {
    const devUsers = ['DEV_USER', 'DEV_FACSTAFF', 'DEV_PWR_USER', 'DEV_ADMIN'];

    if (
      value &&
      !/^[a-zA-Z0-9]+$/.test(value) &&
      (!isDev || !devUsers.includes(value))
    ) {
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

  return (
    <Drawer title="New Ticket" open={open} width={720} onClose={onClose}>
      <Form
        form={form}
        onFinish={handleFormSubmit}
        layout="vertical"
        requiredMark={false}
      >
        <Form.Item
          label="Reason"
          name="reason"
          rules={[{ required: true, message: 'Please select a reason' }]}
        >
          <Select
            value={reasonField}
            onChange={(value: string) => handleReasonChange(value)}
            placeholder="Select a reason for the ticket"
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
            <Typography.Text>
              {helpDeskText.reason[reasonField].prompt}
            </Typography.Text>
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
              name="user_comment"
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
                placeholder={helpDeskText.reason[reasonField].placeholder}
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Submit
              </Button>
            </Form.Item>
          </>
        )}
      </Form>
    </Drawer>
  );
};

export default CreateTicketDrawer;
