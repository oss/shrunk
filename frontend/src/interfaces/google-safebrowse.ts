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

export enum PendingLinkAction {
  Approve = 'promote',
  Deny = 'reject',
}
