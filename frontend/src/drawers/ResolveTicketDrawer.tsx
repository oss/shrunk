/**
 * Implement the [[ResolveTicketDrawer]] component
 * @packageDocumentation
 */

import { Button, Divider, Drawer, Form, Input, Radio } from 'antd/lib';
import React from 'react';
import TicketDetails, { EntityDetails } from '../components/TicketDetails';
import { EntityPositionInfo, ResolveTicketInfo, TicketInfo } from '../types';

/**
 * Props for the [[ResolveTicketModal]] component
 * @interface
 */
interface Props {
  /**
   * Whether the drawer is visible
   */
  open: boolean;

  /**
   * The ticket information
   * @property
   */
  ticketInfo: TicketInfo;

  /**
   * Entity position information. Null if no entity is associated with the ticket
   * @property
   */
  entityPositionInfo: EntityPositionInfo | null;

  /**
   * The text fields related to the help desk
   * @property
   */
  helpDeskText: Record<string, any>;

  /**
   * Handle ticket resolution
   * @property
   */
  onResolve: (values: any) => Promise<void>;

  /**
   * Callback for when the drawer is closed
   * @property
   */
  onClose: () => void;
}

/**
 * A modal for resolving a ticket
 * @component
 */
const ResolveTicketDrawer: React.FC<Props> = ({
  open,
  ticketInfo,
  entityPositionInfo,
  helpDeskText,
  onResolve,
  onClose,
}) => {
  /**
   * State for the [[ResolveTicketDrawer]] component
   *
   * submitting: Whether the form submission is in progress
   * form: The form instance
   */
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [form] = Form.useForm();

  /**
   * Handle the form submission; resolve the ticket
   * @method
   *
   * @param values - The values of the form fields
   */
  const handleFormSubmit = async (values: ResolveTicketInfo) => {
    setSubmitting(true);
    try {
      await onResolve(values);
    } finally {
      setSubmitting(false);
    }

    // Reset the drawer
    form.resetFields();

    onClose();
  };

  return (
    <Drawer title="Resolve Ticket" open={open} width={720} onClose={onClose}>
      <TicketDetails helpDeskText={helpDeskText} ticketInfo={ticketInfo} />
      {entityPositionInfo && (
        <EntityDetails entityPositionInfo={entityPositionInfo} />
      )}
      <Divider />
      <Form
        form={form}
        layout="vertical"
        initialValues={{ comment: '', action: 'denied' }}
        onFinish={handleFormSubmit}
      >
        <Form.Item label="Comment" name="comment">
          <Input.TextArea rows={4} placeholder="Enter a comment" />
        </Form.Item>
        {(ticketInfo.reason === 'whitelisted' ||
          ticketInfo.reason === 'power_user') && (
          <Form.Item label="Action" name="action">
            <Radio.Group optionType="button" buttonStyle="solid">
              <Radio.Button value="approved">Approve</Radio.Button>
              <Radio.Button value="denied">Deny</Radio.Button>
            </Radio.Group>
          </Form.Item>
        )}
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            Resolve
          </Button>
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default ResolveTicketDrawer;
