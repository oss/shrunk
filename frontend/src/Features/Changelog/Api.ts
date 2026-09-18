import { api } from '@/Shared/Lib/Http';
import { Release } from '@/Features/Changelog/Types';

export async function getReleaseNotes(): Promise<Release[]> {
  return api<Release[]>('release-notes');
}
