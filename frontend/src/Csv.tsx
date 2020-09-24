import { createObjectCsvStringifier } from 'csv-writer';

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

function doDownload(filename: string, csvString: string): void {
  const dataUrl = `data:text/csv;base64,${btoa(csvString)}`;
  const dlLink = document.createElement('a');
  dlLink.download = filename;
  dlLink.href = dataUrl;
  document.body.appendChild(dlLink);
  dlLink.click();
}

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
