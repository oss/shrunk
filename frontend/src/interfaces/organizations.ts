export interface OrganizationMember {
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

export interface Organization {
  id: string;
  name: string;
  members: OrganizationMember[];
  timeCreated: Date;

  // Whether the user who performed the API request is a member of the org
  is_member: boolean;

  // Whether the user who performed the API request is an admin of the org
  is_admin: boolean;

  domains: string[];
}


export interface OrganizationLink {
  _id: string;
  title: string;
  alias: string;
  canEdit: boolean;
  owner: { _id: string; type: string, org_name: string };
  role: "viewer" | "editor" | "owner";
}
