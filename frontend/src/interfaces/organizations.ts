import { Link } from './link';

export interface OrganizationMember {
  /**
   * Whether the member is an admin of the org
   * @property
   */
  is_admin: boolean;


  is_guest?: boolean;

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
  guests: OrganizationMember[];
  timeCreated: Date;

  // Whether the user who performed the API request is a member of the org
  is_member: boolean;

  // Whether the user who performed the API request is an admin of the org
  is_admin: boolean;

  domains: string[];
}

export interface OrganizationLink extends Omit<Link, 'owner'> {
  owner: {
    _id: string;
    type: string;
    org_name?: string;
  };
  role: 'owner' | 'editor' | 'viewer';
  canEdit: boolean;
}

export interface OrganizationStats {
  total_links: number;
  total_visits: number;
  unique_visits: number;
}
