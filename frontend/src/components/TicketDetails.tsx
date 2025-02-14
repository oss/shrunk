import { Descriptions, Typography } from 'antd/lib';
import dayjs from 'dayjs';
import React from 'react';
import { EntityPositionInfo, TicketInfo } from '../types';

/**
 * Props for the [[TicketDetails]] component
 * @interface
 */
interface TicketDetailsProps {
  /**
   * The text fields related to the help desk
   * @property
   */
  helpDeskText: Record<string, any>;

  /**
   * The ticket information
   * @property
   */
  ticketInfo: TicketInfo;
}

/**
 * Props for the [[EntityDetails]] component
 * @interface
 */
interface EntityDetailsProps {
  /**
   * The entity position information
   * @property
   */
  entityPositionInfo: EntityPositionInfo;
}

/**
 * Component for the ticket details
 * @component
 */
const TicketDetails: React.FC<TicketDetailsProps> = ({
  helpDeskText,
  ticketInfo,
}) => (
  <Descriptions column={1}>
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
      <Typography.Text>{ticketInfo.user_comment}</Typography.Text>
    </Descriptions.Item>
  </Descriptions>
);

/**
 * Component for the entity details
 * @component
 */
export const EntityDetails: React.FC<EntityDetailsProps> = ({
  entityPositionInfo,
}) => (
  <Descriptions column={1}>
    <Descriptions.Item label="Titles">
      <Typography.Text italic={!entityPositionInfo.titles}>
        {entityPositionInfo.titles?.join(', ') || 'No titles found'}
      </Typography.Text>
    </Descriptions.Item>
    <Descriptions.Item label="Departments">
      <Typography.Text italic={!entityPositionInfo.departments}>
        {entityPositionInfo.departments?.join(', ') || 'No departments found'}
      </Typography.Text>
    </Descriptions.Item>
    <Descriptions.Item label="Employments Types">
      <Typography.Text italic={!entityPositionInfo.employmentTypes}>
        {entityPositionInfo.employmentTypes?.join(', ') ||
          'No employment types found'}
      </Typography.Text>
    </Descriptions.Item>
  </Descriptions>
);

export default TicketDetails;
