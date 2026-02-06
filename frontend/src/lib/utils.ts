import { clsx, ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Initiate a download of CSV data
 * @function
 * @param filename The suggested filename
 * @param csvString The contents of the file
 */
export function doDownload(filename: string, csvString: string): void {
  const blob = new Blob([csvString], { type: 'text/csv' });
  const dlLink = document.createElement('a');
  dlLink.download = filename;
  dlLink.href = URL.createObjectURL(blob);
  document.body.appendChild(dlLink);
  dlLink.click();
  document.body.removeChild(dlLink); // Clean up the DOM
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
