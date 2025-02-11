/**
 * Implement the [[ResolveTicketModal]] component
 * @packageDocumentation
 */

import {
  Descriptions,
  Divider,
  Form,
  Input,
  Modal,
  Radio,
  Typography,
} from 'antd/lib';
import dayjs from 'dayjs';
import React from 'react';
import { EntityPositionInfo, TicketInfo } from '../types';

/**
 * Props for the [[ResolveTicketModal]] component
 * @interface
 */
interface Props {
  /**
   * The visibility of the modal
   * @property
   */
  visible: boolean;

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
   * Handle modal close
   * @property
   */
  onCancel: () => void;
}

/**
 * A modal for resolving a ticket
 * @component
 */
const ResolveTicketModal: React.FC<Props> = ({
  visible,
  ticketInfo,
  entityPositionInfo,
  helpDeskText,
  onResolve,
  onCancel,
}) => {
  const [form] = Form.useForm();

  return (
    <Modal
      open={visible}
      title="Resolve ticket"
      okText="Resolve"
      onOk={form.submit}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
    >
      <Descriptions column={1} size="small">
        <Descriptions.Item label="ID">
          <Typography.Text>{ticketInfo._id}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="Reporter">
          <Typography.Text>{ticketInfo.reporter}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="Reason">
          <Typography.Text>
            {helpDeskText.reason[ticketInfo.reason].name}
          </Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="Associated NetID">
          <Typography.Text italic={!ticketInfo.entity}>
            {ticketInfo.entity || 'N/A'}
          </Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="Submission Date">
          <Typography.Text>
            {dayjs(new Date(Number(ticketInfo.timestamp) * 1000)).format(
              'MMM D, YYYY, h:mm a',
            )}
          </Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="Comment">
          <Typography.Text>{ticketInfo.comment}</Typography.Text>
        </Descriptions.Item>
        {entityPositionInfo && (
          <>
            <Descriptions.Item label="Titles">
              <Typography.Text italic={!entityPositionInfo.titles}>
                {entityPositionInfo.titles?.join(', ') || 'No titles found'}
              </Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="Departments">
              <Typography.Text italic={!entityPositionInfo.departments}>
                {entityPositionInfo.departments?.join(', ') ||
                  'No departments found'}
              </Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="Employments Types">
              <Typography.Text italic={!entityPositionInfo.employmentTypes}>
                {entityPositionInfo.employmentTypes?.join(', ') ||
                  'No employment types found'}
              </Typography.Text>
            </Descriptions.Item>
          </>
        )}
      </Descriptions>
      <Divider />
      <Form
        form={form}
        layout="vertical"
        initialValues={{ comment: '', action: 'denied' }}
        onFinish={(values: any) => onResolve(values)}
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
      </Form>
    </Modal>
  );
};

export default ResolveTicketModal;
