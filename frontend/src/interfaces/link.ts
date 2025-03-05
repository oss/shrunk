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
