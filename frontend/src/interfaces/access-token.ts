export interface AccessTokenData {
  id: string;
  token: string;
  owner: string;
  title: string;
  description: string;
  created_by: string;
  created_date: string;
  permissions: string[];
  deleted: boolean;
  deleted_by: string | null;
}
