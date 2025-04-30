export interface AccessTokenData {
  token: string;

  owner: string;
  title: string;
  description: string;
  created_by: string;
  created_date: string;
  permissions: string[];
  disabled: boolean;
  disabled_by: string | null;
  deleted: boolean;
  deleted_by: string | null;
}
