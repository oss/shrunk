/**
 * A ticket object from the Help Desk
 * @interface
 */
export interface Ticket {
  /**
   * The ID of the ticket
   * @property
   */
  _id: string;

  /**
   * The NetID of the reporter
   * @property
   */
  reporter: string;

  /**
   * The reason for the ticket
   * @property
   */
  reason: string;

  /**
   * The entity the ticket is about (same as the reporter if reason is "power_user", empty if reason is "other")
   * @property
   */
  entity: string;

  /**
   * The comment on the ticket
   * @property
   */
  comment: string;

  /**
   * When the ticket was created
   * @property
   */
  timestamp: Date;
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
  titles: string[];

  /**
   * A list of departments for the entity
   * @property
   */
  departments: string[];

  /**
   * A list of employment types for the entity
   * @property
   */
  employmentTypes: string[];
}
