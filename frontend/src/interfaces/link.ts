import { Dayjs } from 'dayjs';

export interface Alias {
  alias: string;
  description: string;
  deleted: boolean;
}

export interface LinkDeletedBy {
  deleted_by: string;
  deleted_time: Date;
}

export interface LinkSharedWith {
  _id: string;
  type: 'netid' | 'org';
}

export interface Link {
  _id: string;
  title: string;
  long_url: string;
  domain: string;
  created_time: Date;
  is_expired: boolean;
  expiration_time: Date | null;
  deletion_info: LinkDeletedBy | null;
  deleted?: boolean;
  visits: number;
  unique_visits: number;
  owner: string;
  aliases: Alias[];
  may_edit: boolean;
  is_tracking_pixel_link: boolean;

  editors: LinkSharedWith[];
  viewers: LinkSharedWith[];
}

/**
 * General summary statistics
 * @interface
 */
export interface OverallStats {
  /**
   * The total number of visits to the link
   * @property
   */
  total_visits: number;

  /**
   * The number of unique visits to the link
   * @property
   */
  unique_visits: number;
}

/**
 * Data for one day worth of visits to a link
 * @interface
 */
export interface VisitDatum {
  /**
   * The date, represented as year/month/day numbers
   * @property
   */
  _id: { year: number; month: number; day: number };

  /**
   * The total number of visits on the date
   * @property
   */
  all_visits: number;

  /**
   * The number of first-time visits on the date
   * @property
   */
  first_time_visits: number;
}

/**
 * Time-series visit statistics
 * @property
 */
export interface VisitStats {
  /**
   * A [[VisitDatum]] for every day in the link's history
   * @property
   */
  visits: VisitDatum[];
}

/**
 * Data for one slice of a pie chart
 * @interface
 */
export interface PieDatum {
  /**
   * The name of the slice
   * @property
   */
  name: string;

  /**
   * The value of the slice
   * @property
   */
  y: number;
}

/**
 * Data pertaining to browsers and referers of visitors
 * @interface
 */
export interface BrowserStats {
  /**
   * Data for the browser name pie chart
   * @property
   */
  browsers: PieDatum[];

  /**
   * Data for the platform name pie chart
   * @property
   */
  platforms: PieDatum[];

  /**
   * Data for the referer pie chart
   * @property
   */
  referers: PieDatum[];
}

/**
 * The final values of the edit link form
 * @interface
 */
export interface EditLinkValues {
  title: string;
  long_url: string;

  /**
   * The new expiration time, or `null` if
   * the expiration time should be cleared.
   * @property
   */
  expiration_time: Dayjs | null;
  owner: string;
  aliases: { alias: string; description: string }[];
}

/**
 * The type of the `set` parameter in the search query.
 * @type
 */
export type SearchSet =
  | { set: 'user' | 'shared' | 'all' }
  | { set: 'org'; org: string };

/**
 * The type of a search query
 * @interface
 */
export interface SearchQuery {
  /**
   * An array that holds query strings
   * @property
   */
  queryString: string;

  /**
   * The set of links to search (c.f. [[SearchSet]])
   * @property
   */
  set: SearchSet;

  /**
   * Whether to show expired links
   * @property
   */
  show_expired_links: boolean;

  /** Whether to show deleted links
   * @property
   */
  show_deleted_links: boolean;

  /**
   * The sort order and key
   * @property
   */
  sort: { key: string; order: string };

  /**
   * The beginning of the time range to search
   * @property
   */
  begin_time: Dayjs | null;

  /**
   * The end of the time range to search
   * @property
   */
  end_time: Dayjs | null;

  showType: 'links' | 'tracking_pixels';

  owner: string | null;
}
