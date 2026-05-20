import * as XLSX from 'xlsx';

// Parse an uploaded .xlsx / .xls / .csv file into an array of row objects
// keyed by the header row. Empty cells become ''.
export function parseSpreadsheet(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        if (!sheet) return resolve([]);
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

function triggerDownload(wb, filename, bookType) {
  XLSX.writeFile(wb, filename, { bookType });
}

// Download a sample template: header row + optional example rows.
// headers: string[]   exampleRows: Array<Record<string, any>>
export function downloadSampleSheet(baseName, headers, exampleRows = []) {
  const data = exampleRows.length
    ? exampleRows.map((r) => headers.map((h) => r[h] ?? ''))
    : [];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  triggerDownload(wb, `${baseName}_sample.xlsx`, 'xlsx');
}

// Export data rows to csv or xlsx.
// headers: string[]   rows: Array<Array<any>> (already ordered to match headers)
export function exportSheet(baseName, headers, rows, format = 'xlsx') {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const bookType = format === 'csv' ? 'csv' : 'xlsx';
  const ext = bookType === 'csv' ? 'csv' : 'xlsx';
  triggerDownload(wb, `${baseName}.${ext}`, bookType);
}
