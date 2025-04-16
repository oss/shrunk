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

export interface SharingInfo {
  _id: string;
  type: 'netid' | 'org';
}

/**
 * Information describing a single link
 * @interface
 */
export interface LinkInfo {
  id?: string; // TODO: Make this consistently return _id
  _id?: string; // TODO: Make this consistently return _id
  title: string;
  long_url: string;
  domain: string;
  created_time: Date;
  is_expired: boolean;
  expiration_time: Date | null;
  deletion_info: DeletionInfo | null;
  deleted?: boolean;
  visits: number;
  unique_visits: number;
  owner: string;
  aliases: AliasInfo[];
  may_edit: boolean;
  is_tracking_pixel_link: boolean;

  editors: SharingInfo[];
  viewers: SharingInfo[];
}
