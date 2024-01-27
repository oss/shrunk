/**
 * Implements utility functions to create CSV files from user data
 * @packageDocumentation
 */

import { createObjectCsvStringifier } from 'csv-writer';
import { EntityInfo } from '../admin/Role';

/**
 * Create a CSV string from an array of user data
 * @function
 * @param users The users
 */
function createGrantedUsersCsv(users: EntityInfo[]): string {
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
 * Initiate a download of CSV data
 * @function
 * @param filename The suggested filename
 * @param csvString The contents of the file
 */
function doDownload(filename: string, csvString: string): void {
  const dataUrl = `data:text/csv;base64,${btoa(csvString)}`;
  const dlLink = document.createElement('a');
  dlLink.download = filename;
  dlLink.href = dataUrl;
  document.body.appendChild(dlLink);
  dlLink.click();
}

/**
 * Fetch the visits data for a given link and (optionally) alias from the server,
 * then create a CSV and initiate a download
 * @function
 * @param link_id The link ID
 * @param alias The alias, or `null` to get all data for the given link ID
 */
export async function downloadGrantedUsersCsv(
  role_name: string,
): Promise<void> {
  const users = await fetch(`/api/v1/role/${role_name}/entity`)
    .then((resp) => resp.json())
    .then((json) => json.entities as EntityInfo[]);
  const filename = `${role_name}.csv`;
  const csvString = createGrantedUsersCsv(users);
  doDownload(filename, csvString);
}
