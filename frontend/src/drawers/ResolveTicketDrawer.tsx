/**
 * Implement the [[ResolveTicketDrawer]] component
 * @packageDocumentation
 */

import { App, Button, Divider, Drawer, Form, Input, Radio } from 'antd/lib';
import React from 'react';
import { useHistory } from 'react-router-dom';
import TicketDetails, { EntityDetails } from '../components/TicketDetails';
import {
  EntityPositionInfo,
  ResolveTicketInfo,
  TicketInfo,
} from '../interfaces/tickets';
import { resolveTicket, sendTicketEmail } from '../api/tickets';
import { addRoleToUser } from '../api/users';

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
  const history = useHistory();
  const { message } = App.useApp();

  /**
   * Resolve the ticket
   * @method
   *
   * @param values - The values from the form
   */
  const onResolveTicket = async (values: ResolveTicketInfo) => {
    setSubmitting(true);
    const response = await resolveTicket(ticketInfo._id, values);
    const data = await response.json();

    if (response.ok) {
      message.success(data.message || 'Success', 2);
      setSubmitting(false);
      history.push('/tickets');
    } else {
      message.error(data.message || 'Error', 2);
      setSubmitting(false);
    }
  };

  /**
   * Grant a role to an entity
   *
   * @param entity The entity to grant the role to
   * @param role The role to grant
   * @param comment The comment to add to the grant
   */
  const grantRole = async (entity: string, role: string, comment?: string) => {
    await addRoleToUser(entity, role, comment);
  };

  /**
   * Handle the form submission when resolving; resolve the ticket, grant the role if necessary, and send the email
   * @method
   *
   * @param values - The values from the form
   */
  const handleFormSubmit = async (values: ResolveTicketInfo) => {
    await onResolveTicket(values);

    // Grant the role if it was approved
    if (values.is_role_granted && ticketInfo?.entity) {
      await grantRole(
        ticketInfo.entity,
        ticketInfo.reason,
        values.admin_review,
      );
    }

    await sendTicketEmail(ticketInfo._id, 'resolution');
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
        initialValues={{ admin_review: '', is_role_granted: false }}
        onFinish={handleFormSubmit}
      >
        <Form.Item label="Comment" name="admin_review">
          <Input.TextArea rows={4} placeholder="Enter a comment" />
        </Form.Item>
        {(ticketInfo.reason === 'whitelisted' ||
          ticketInfo.reason === 'power_user') && (
          <Form.Item label="Decision" name="is_role_granted">
            <Radio.Group optionType="button" buttonStyle="solid">
              <Radio.Button value>Approve</Radio.Button>
              <Radio.Button value={false}>Deny</Radio.Button>
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
