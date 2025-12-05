import { createObjectCsvStringifier } from 'csv-writer';
import { doDownload } from '../lib/utils';
import { GrantedUser } from '../interfaces/stats';

export function downloadVisits(link_id: string): void {
  const url = `/api/core/link/${link_id}/visits`;
  const a = document.createElement('a');
  a.href = url;
  a.download = `${link_id}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Create a CSV string from an array of user data
 * @function
 * @param users The users
 */
function createGrantedUsersCsv(users: GrantedUser[]): string {
  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: 'entity', title: 'Grantee NetID' },
      { id: 'granted_by', title: 'Granter NetID' },
      { id: 'comment', title: 'Comment' },
      { id: 'time_granted', title: 'Time Granted' },
    ],
  });

  return (
    csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(users)
  );
}

/**
 * Fetch the visits data for a given link and (optionally) alias from the server,
 * then create a CSV and initiate a download
 * @function
 * @param link_id The link ID
 * @param alias The alias, or `null` to get all data for the given link ID
 */
export async function downloadGrantedUsers(role_name: string): Promise<void> {
  const users = await fetch(`/api/core/role/${role_name}/entity`)
    .then((resp) => resp.json())
    .then((json) => json.entities as GrantedUser[]);
  const filename = `${role_name}.csv`;
  const csvString = createGrantedUsersCsv(users);
  doDownload(filename, csvString);
}
