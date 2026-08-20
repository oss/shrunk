import { downloadBlob, downloadCsv, toCsv } from '@/Lib/Utils';
import { GrantedUser } from '@/Interfaces/Stats';
import { requestBlob, requestJson } from '@/Api/Client';

export async function downloadVisits(linkId: string): Promise<void> {
  const contents = await requestBlob(`/api/core/link/${linkId}/visits`);
  downloadBlob(`${linkId}.csv`, contents);
}

export async function downloadGrantedUsers(roleName: string): Promise<void> {
  const data = await requestJson<{ entities: GrantedUser[] }>(
    `/api/core/role/${roleName}/entity`,
  );
  const headers = [
    { id: 'entity', title: 'Grantee NetID' },
    { id: 'granted_by', title: 'Granter NetID' },
    { id: 'comment', title: 'Comment' },
    { id: 'time_granted', title: 'Time Granted' },
  ] as const;

  const csv = toCsv([
    headers.map((header) => header.title),
    ...data.entities.map((user) =>
      headers.map((header) => user[header.id as keyof GrantedUser]),
    ),
  ]);
  downloadCsv(`${roleName}.csv`, csv);
}
