export interface GrantedBy {
  entity: string;
  granted_by: string;
  comment?: string;
  time_granted: Date | null;
}
