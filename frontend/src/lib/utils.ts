/**
 * Initiate a download of CSV data
 * @function
 * @param filename The suggested filename
 * @param csvString The contents of the file
 */
export function doDownload(filename: string, csvString: string): void {
  const utf8EncodedCsvString = new TextEncoder().encode(csvString);
  const base64String = btoa(String.fromCharCode(...utf8EncodedCsvString));
  const dataUrl = `data:text/csv;base64,${base64String}`;
  const dlLink = document.createElement('a');
  dlLink.download = filename;
  dlLink.href = dataUrl;
  document.body.appendChild(dlLink);
  dlLink.click();
  document.body.removeChild(dlLink); // Clean up the DOM
}
