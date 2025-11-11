import { Link } from './link';

export interface OrganizationMember {
  /**
   * Whether the member is an admin of the org
   * @property
   */
  role: 'admin' | 'member' | 'guest';

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

  role?: 'admin' | 'member' | 'guest';

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
