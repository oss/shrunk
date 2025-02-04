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

const { Text } = Typography;
const { useForm } = Form;

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
   * Ticket information
   * @property
   */
  ticketInfo: TicketInfo;

  /**
   * Entity position information
   * @property
   */
  entityPositionInfo: EntityPositionInfo | null;

  /**
   * Help desk text
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
  const [form] = useForm();

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
          <Text>{ticketInfo._id}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Reporter">
          <Text>{ticketInfo.reporter}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Reason">
          <Text>{helpDeskText.reason[ticketInfo.reason].name}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Associated NetID">
          <Text italic={!ticketInfo.entity}>{ticketInfo.entity || 'N/A'}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Submission Date">
          <Text>
            {dayjs(new Date(Number(ticketInfo.timestamp) * 1000)).format(
              'MMM D, YYYY, h:mm a',
            )}
          </Text>
        </Descriptions.Item>
        <Descriptions.Item label="Comment">
          <Text>{ticketInfo.comment}</Text>
        </Descriptions.Item>
        {entityPositionInfo && (
          <>
            <Descriptions.Item label="Titles">
              <Text italic={!entityPositionInfo.titles}>
                {entityPositionInfo.titles?.join(', ') || 'No titles found'}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Departments">
              <Text italic={!entityPositionInfo.departments}>
                {entityPositionInfo.departments?.join(', ') ||
                  'No departments found'}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Employments Types">
              <Text italic={!entityPositionInfo.employmentTypes}>
                {entityPositionInfo.employmentTypes?.join(', ') ||
                  'No employment types found'}
              </Text>
            </Descriptions.Item>
          </>
        )}
      </Descriptions>
      <Divider />
      <Form
        form={form}
        layout="vertical"
        initialValues={{ comment: '', action: 'deny' }}
        onFinish={(values: any) => onResolve(values)}
      >
        <Form.Item label="Comment" name="comment">
          <Input.TextArea rows={4} placeholder="Enter a comment" />
        </Form.Item>
        {(ticketInfo.reason === 'whitelisted' ||
          ticketInfo.reason === 'power_user') && (
          <Form.Item label="Action" name="action">
            <Radio.Group>
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
