import { clsx, ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Initiate a download of CSV data
 * @function
 * @param filename The suggested filename
 * @param csvString The contents of the file
 */
export function downloadCsv(filename: string, contents: string): void {
  const dlLink = document.createElement('a');
  dlLink.download = filename;
  const url = URL.createObjectURL(
    new Blob([contents], { type: 'text/csv;charset=utf-8' }),
  );
  dlLink.href = url;
  document.body.appendChild(dlLink);
  dlLink.click();
  dlLink.remove();
  URL.revokeObjectURL(url);
}

export function downloadUrl(filename: string, url: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function downloadBlob(filename: string, contents: Blob): void {
  const url = URL.createObjectURL(contents);
  downloadUrl(filename, url);
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function toCsv(rows: ReadonlyArray<ReadonlyArray<unknown>>): string {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const text = value == null ? '' : String(value);
          return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(','),
    )
    .join('\n');
}

export function daysBetween(date: Date): number {
  const today: Date = new Date(); // Get today's date

  // Calculate the difference in time (milliseconds)
  const differenceInTime: number = date.getTime() - today.getTime();

  // Convert time difference from milliseconds to days
  const differenceInDays: number = Math.ceil(
    differenceInTime / (1000 * 60 * 60 * 24),
  );

  return Math.abs(differenceInDays);
}

export function getLinkFromAlias(
  alias: string,
  isTrackingPixel?: boolean,
): string {
  const routePrefix = isTrackingPixel ? 'api/core/t/' : '';
  return `${document.location.host}/${routePrefix}${alias}`;
}

export function getRedirectFromAlias(
  alias: string,
  isTrackingPixel?: boolean,
): string {
  const isDev = import.meta.env.DEV;
  const protocol = isDev ? 'http' : 'https';
  return `${protocol}://${getLinkFromAlias(alias, isTrackingPixel)}`;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
