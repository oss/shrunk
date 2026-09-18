import { api } from '@/Shared/Lib/Http';
import { downloadBlob } from '@/Shared/Lib/Utils';

export async function downloadVisits(linkId: string): Promise<void> {
  const contents = await api<Blob, 'blob'>(`/link/${linkId}/visits`, {
    responseType: 'blob',
  });
  downloadBlob(`${linkId}.csv`, contents);
}
