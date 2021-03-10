/**
 * Implements utility functions to create CSV files from visit data
 * @packageDocumentation
 */

import { createObjectCsvStringifier } from 'csv-writer';

/**
 * Anonymized visit information, as fetched from the backend
 * @interface
 */
export interface AnonymizedVisit {
  link_id: string;
  alias: string;
  visitor_id: string;
  user_agent: string;
  referer: string;
  state_code: string;
  country_code: string;
  time: string;
}

/**
 * Create a CSV string from an array of anonymized visit data
 * @function
 * @param visits The visits
 */
function createVisitsCsv(visits: AnonymizedVisit[]): string {
  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: 'link_id', title: 'Link ID' },
      { id: 'alias', title: 'Alias' },
      { id: 'visitor_id', title: 'Visitor ID' },
      { id: 'user_agent', title: 'User Agent' },
      { id: 'referer', title: 'Referrer' },
      { id: 'state_code', title: 'State' },
      { id: 'country_code', title: 'Country' },
      { id: 'time', title: 'Time' },
    ],
  });

  return csvStringifier.getHeaderString() +
    csvStringifier.stringifyRecords(visits);
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
export async function downloadVisitsCsv(link_id: string, alias: string | null): Promise<void> {
  const apiUrl = alias === null ? `/api/v1/link/${link_id}/visits`
    : `/api/v1/link/${link_id}/alias/${alias}/visits`;
  const visits = await fetch(apiUrl)
    .then(resp => resp.json())
    .then(json => json.visits as AnonymizedVisit[]);

  const filename = alias === null ? `${link_id}.csv` : `${link_id}-${alias}.csv`;
  const csvString = createVisitsCsv(visits);
  doDownload(filename, csvString);
}
