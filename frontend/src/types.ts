/**
 * A ticket object from the Help Desk
 * @interface
 */
export interface TicketInfo {
  /**
   * The ID of the ticket
   * @property
   */
  _id: string;

  /**
   * When the ticket was created
   * @property
   */
  created_time: number;

  /**
   * The NetID of the reporter
   * @property
   */
  reporter: string;

  /**
   * The user's comment justifying their ticket
   * @property
   */
  user_comment: string;

  /**
   * The entity the ticket is about (same as the reporter if reason is "power_user", empty if reason is "other")
   * @property
   */
  entity?: string;

  /**
   * The reason for the ticket
   * @property
   */
  reason: string;

  /**
   * The status of the ticket
   * @property
   */
  status: string;

  /**
   * The person that actioned the ticket
   * @property
   */
  actioned_by?: string;

  /**
   * When the ticket was actioned
   * @property
   */
  actioned_time?: number;

  /**
   * The admin's comment that reviews the ticket
   * @property
   */
  admin_review?: string;

  /**
   * Whether the role requested by the ticket was granted
   * @property
   */
  is_role_granted?: boolean;
}

/**
 * Additional information about an entity. Used alongside the Ticket interface in the Help Desk
 * @interface
 */
export interface EntityPositionInfo {
  /**
   * A list of titles for the entity
   * @property
   */
  titles?: string[];

  /**
   * A list of departments for the entity
   * @property
   */
  departments?: string[];

  /**
   * A list of employment types for the entity
   * @property
   */
  employmentTypes?: string[];
}

/**
 * Information used to create a ticket in the Help Desk
 */
export interface CreateTicketInfo {
  /**
   * The reason for the ticket
   * @property
   */
  reason: string;

  /**
   * The entity the ticket is about
   * @property
   */
  entity?: string;

  /**
   * The user's comment justifying their ticket
   * @property
   */
  user_comment: string;
}

export interface ResolveTicketInfo {
  /**
   * The action to perform based on the ticket's request
   * @property
   */
  action: string;

  /**
   * The person that actioned the ticket
   * @property
   */
  actioned_by: string;

  /**
   * The admin's comment that reviews the ticket
   * @property
   */
  admin_review?: string;

  /**
   * Whether the role requested by the ticket was granted
   * @property
   */
  is_role_granted?: boolean;
}
