/**
 * PendingLinkRow information fetched form backend
 * @interface
 */
export interface PendingLink {
  /**
   * Id of pending link
   * @property
   */
  _id: string;

  /**
   * Name of pending link
   * @property
   */
  title: string;

  /**
   * Long url of pending link
   * @property
   */
  long_url: string;

  /**
   * netid of the creator
   * @property
   */
  netid: string;
}

/**
 * Statistics about visits to a single Flask endpoint
 * @interface
 */
export interface EndpointDatum {
  /**
   * Name of the Flask endpoint
   * @property
   */
  endpoint: string;

  /**
   * Total number of visits
   * @property
   */
  total_visits: number;

  /**
   * Total number of unique visits by NetID
   * @property
   */
  unique_visits: number;
}

/**
 * Results of an admin stats query to the backend
 * @interface
 */
export interface AdminStatsData {
  /**
   * Total number of links created during the specified time period
   * @property
   */
  links: number;

  /**
   * Total number of visits occurring during the specified time period
   * @property
   */
  visits: number;

  /**
   * Total number of distinct NetIDs creating links during the specified time period
   */
  users: number;
}

/**
 * The representation of a user row in the table
 * @interface
 */
export interface User {
  /**
   * The netid of the user
   * @property
   */
  netid: string;

  /**
   * The organizations the user is a part of
   * @property
   */
  organizations: string[];

  /**
   * The roles the user has
   * @property
   */
  roles: string[];

  /**
   * The number of links the user has created
   * @property
   */
  linksCreated: number;
}

/**
 * The operation to be applied to the data
 * @interface
 */
export interface Operation {
  /**
   * The type of operation
   * @property
   */
  type: string;

  /**
   * The field to apply the operation to
   * @property
   */
  field: string;

  /**
   * The specification for the operation
   * @property
   */
  specification: string;

  /**
   * The value to filter by (numerical values are parsed as strings)
   * @property
   */
  filterString: string;
}
