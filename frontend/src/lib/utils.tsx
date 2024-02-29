/**
 * Initiate a download of CSV data
 * @function
 * @param filename The suggested filename
 * @param csvString The contents of the file
 */
export function doDownload(filename: string, csvString: string): void {
    const dataUrl = `data:text/csv;base64,${btoa(csvString)}`;
    const dlLink = document.createElement('a');
    dlLink.download = filename;
    dlLink.href = dataUrl;
    document.body.appendChild(dlLink);
    dlLink.click();
  }
