/**
 * Defines some interfaces describing API responses
 */

/**
 * Information about a single alias
 * @interface
 */
export interface AliasInfo {
  /**
   * The alias name
   * @property
   */
  alias: string;

  /**
   * The user's description of the alias
   * @property
   */
  description: string;

  /**
   * Whether the alias is deleted
   * @property
   */
  deleted: boolean;
}

/**
 * Information about when and by whom an alias was deleted
 * @property
 */
export interface DeletionInfo {
  /**
   * NetID that deleted the alias
   * @property
   */
  deleted_by: string;

  /**
   * Timestamp at which the alias was deleted
   * @property
   */
  deleted_time: Date;
}

/**
 * Information describing a single link
 * @interface
 */
export interface LinkInfo {
  id: string;
  title: string;
  long_url: string;
  created_time: Date;
  is_expired: boolean;
  expiration_time: Date | null;
  deletion_info: DeletionInfo | null;
  visits: number;
  unique_visits: number;
  owner: string;
  aliases: AliasInfo[];
}
