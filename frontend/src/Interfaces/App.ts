export interface FeatureFlags {
  devLogins: boolean;
  trackingPixel: boolean;
  domains: boolean;
  googleSafeBrowsing: boolean;
  helpDesk: boolean;
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
