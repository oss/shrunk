import { createObjectCsvStringifier } from 'csv-writer';
import { doDownload } from '../lib/utils';
import { GrantedUser, AnonymizedVisit } from '../interfaces/stats';

function createVisitsCsv(visits: AnonymizedVisit[]): string {
  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: 'link_id', title: 'Link ID' },
      { id: 'alias', title: 'Alias' },
      { id: 'visitor_id', title: 'IP Address ID' },
      { id: 'user_agent', title: 'User Agent' },
      { id: 'referer', title: 'Referrer' },
      { id: 'state_code', title: 'State' },
      { id: 'country_code', title: 'Country' },
      { id: 'time', title: 'Time' },
    ],
  });

  return (
    csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(visits)
  );
}
export async function downloadVisits(
  link_id: string,
  alias: string | null,
): Promise<void> {
  const apiUrl =
    alias === null
      ? `/api/v1/link/${link_id}/visits`
      : `/api/v1/link/${link_id}/alias/${alias}/visits`;
  const visits = await fetch(apiUrl)
    .then((resp) => resp.json())
    .then((json) => json.visits as AnonymizedVisit[]);

  const filename =
    alias === null ? `${link_id}.csv` : `${link_id}-${alias}.csv`;
  const csvString = createVisitsCsv(visits);
  doDownload(filename, csvString);
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
  const users = await fetch(`/api/v1/role/${role_name}/entity`)
    .then((resp) => resp.json())
    .then((json) => json.entities as GrantedUser[]);
  const filename = `${role_name}.csv`;
  const csvString = createGrantedUsersCsv(users);
  doDownload(filename, csvString);
}
