export interface AliasInfo {
  alias: string;
  description: string;
  deleted: boolean;
}

export interface DeletionInfo {
  deleted_by: string;
  deleted_time: Date;
}

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
