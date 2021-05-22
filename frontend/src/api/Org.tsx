/**
 * Implements some functions for interacting with the org API
 * @packageDocumentation
 */

/**
 * Data pertaining to one member of an org
 * @interface
 */
export interface MemberInfo {
  /**
   * Whether the member is an admin of the org
   * @property
   */
  is_admin: boolean;

  /**
   * The NetID of the member
   * @property
   */
  netid: string;

  /**
   * When the member was added to the org
   * @property
   */
  timeCreated: Date;
}

/**
 * Data pertaining to one org
 * @interface
 */
export interface OrgInfo {
  /**
   * The ID of the org
   * @property
   */
  id: string;

  /**
   * The name of the org
   * @property
   */
  name: string;

  /**
   * A [[MemberInfo]] for each member of the org
   * @property
   */
  members: MemberInfo[];

  /**
   * When the org was created
   * @property
   */
  timeCreated: Date;

  /**
   * Whether the user who performed the API request is a member of the org
   * @property
   */
  is_member: boolean;

  /**
   * Whether the user who performed the API request is an admin of the org
   * @property
   */
  is_admin: boolean;
}

/**
 * Get a list of [[OrgInfo]]
 * @function
 * @param which Whether to list all orgs or orgs of which the user is a member
 */
export const listOrgs = async (which: 'all' | 'user'): Promise<OrgInfo[]> => {
  const result = await fetch('/api/v1/org/list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ which }),
  }).then((resp) => resp.json());
  return result.orgs.map((org: any) => ({
    ...org,
    timeCreated: new Date(org.timeCreated),
    members: [],
  }));
};

/**
 * Get info for an org by its ID
 * @function
 * @param id The ID of the org for which to fetch info
 */
export const getOrgInfo = async (id: string): Promise<OrgInfo> => {
  const result: any = await fetch(`/api/v1/org/${id}`).then((resp) =>
    resp.json(),
  );
  return {
    ...result,
    timeCreated: new Date(result.timeCreated),
    members: result.members.map(
      (member: any) =>
        ({
          ...member,
          timeCreated: new Date(member.timeCreated),
        } as MemberInfo),
    ),
  };
};

/**
 * Create a new org with a given name
 * @function
 * @param name The name of the org to create
 */
export const createOrg = async (name: string): Promise<void> => {
  await fetch('/api/v1/org', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
};

/**
 * Delete an org
 * @function
 * @param id The ID of the org to delete
 */
export const deleteOrg = async (id: string): Promise<void> => {
  await fetch(`/api/v1/org/${id}`, { method: 'DELETE' });
};
