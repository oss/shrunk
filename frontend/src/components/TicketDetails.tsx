import dayjs from 'dayjs';
import React from 'react';
import { EntityPositionInfo, TicketInfo } from '@/interfaces/tickets';
import { cn } from '@/lib/utils';

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

function DetailList({
  items,
}: {
  items: Array<{ label: string; value: React.ReactNode; muted?: boolean }>;
}) {
  return (
    <dl className="grid gap-3 text-sm">
      {items.map((item) => (
        <div key={item.label} className="grid gap-1 sm:grid-cols-[10rem_1fr]">
          <dt className="font-medium text-muted-foreground">{item.label}</dt>
          <dd className={cn('text-foreground', item.muted && 'italic')}>
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Component for the ticket details
 * @component
 */
const TicketDetails: React.FC<TicketDetailsProps> = ({
  helpDeskText,
  ticketInfo,
}) => (
  <DetailList
    items={[
      { label: 'ID', value: ticketInfo._id },
      {
        label: 'Status',
        value: <strong>{ticketInfo.status.toUpperCase()}</strong>,
      },
      { label: 'Reporter', value: ticketInfo.reporter },
      { label: 'Reason', value: helpDeskText.reason[ticketInfo.reason].name },
      {
        label: 'Associated NetID',
        value: ticketInfo.entity || 'N/A',
        muted: !ticketInfo.entity,
      },
      {
        label: 'Submission Date',
        value: dayjs(new Date(ticketInfo.created_time * 1000)).format(
          'MMM D, YYYY, h:mm a',
        ),
      },
      { label: 'Comment', value: ticketInfo.user_comment },
    ]}
  />
);

/**
 * Component for the entity details
 * @component
 */
export const EntityDetails: React.FC<EntityDetailsProps> = ({
  entityPositionInfo,
}) => (
  <DetailList
    items={[
      {
        label: 'Titles',
        value: entityPositionInfo.titles?.join(', ') || 'No titles found',
        muted: !entityPositionInfo.titles,
      },
      {
        label: 'Departments',
        value:
          entityPositionInfo.departments?.join(', ') || 'No departments found',
        muted: !entityPositionInfo.departments,
      },
      {
        label: 'Employments Types',
        value:
          entityPositionInfo.employmentTypes?.join(', ') ||
          'No employment types found',
        muted: !entityPositionInfo.employmentTypes,
      },
    ]}
  />
);

export default TicketDetails;
