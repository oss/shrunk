export interface AnonymizedVisit {
  link_id: string;
  alias: string;
  visitor_id: string;
  user_agent: string;
  referer: string;
  state_code: string;
  country_code: string;
  time: string;
}

export interface GrantedUser {
  /**
   * The name of the entity
   * @property
   */
  entity: string;

  /**
   * The NetID of the user who granted the role to the entity
   * @property
   */
  granted_by: string;

  /**
   * The comment, or `null` if not present
   * @property
   */
  comment: string | null;
  time_granted: Date | null;
}
