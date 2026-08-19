import { downloadCsv, downloadUrl, toCsv } from '../Lib/Utils';
import { GrantedUser } from '../Interfaces/Stats';

export function downloadVisits(link_id: string): void {
  const url = `/api/core/link/${link_id}/visits`;
  downloadUrl(`${link_id}.csv`, url);
}

export async function downloadGrantedUsers(role_name: string): Promise<void> {
  const users = await fetch(`/api/core/role/${role_name}/entity`)
    .then((resp) => resp.json())
    .then((json) => json.entities as GrantedUser[]);
  const headers = [
    { id: 'entity', title: 'Grantee NetID' },
    { id: 'granted_by', title: 'Granter NetID' },
    { id: 'comment', title: 'Comment' },
    { id: 'time_granted', title: 'Time Granted' },
  ] as const;

  const csv = toCsv([
    headers.map((header) => header.title),
    ...users.map((user) =>
      headers.map((header) => user[header.id as keyof GrantedUser]),
    ),
  ]);
  downloadCsv(`${role_name}.csv`, csv);
}
