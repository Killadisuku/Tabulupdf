import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { SheetData, BatchItem } from '../types';

/**
 * Attempt to convert string value into appropriate Excel cell type (Number, Date, String)
 */
export function inferCellValue(raw: string): { v: any; t: 's' | 'n' | 'b' | 'd' } {
  if (raw === undefined || raw === null) return { v: '', t: 's' };
  const trimmed = String(raw).trim();

  if (trimmed === '') return { v: '', t: 's' };

  // Check Boolean
  if (/^(true|false)$/i.test(trimmed)) {
    return { v: trimmed.toLowerCase() === 'true', t: 'b' };
  }

  // Check Currency / Standard Numbers: e.g. "$1,234.56", "€ 450.00", "(500.00)", "45.8%"
  const cleanNumeric = trimmed
    .replace(/^[$€£¥₹]/, '')
    .replace(/[$€£¥₹]/g, '')
    .replace(/,/g, '')
    .trim();

  // Negative in parentheses like (123.45)
  if (/^\(\d+(\.\d+)?\)$/.test(cleanNumeric)) {
    const num = -parseFloat(cleanNumeric.slice(1, -1));
    if (!isNaN(num)) return { v: num, t: 'n' };
  }

  // Standard float / integer
  if (/^-?\d+(\.\d+)?$/.test(cleanNumeric)) {
    const num = parseFloat(cleanNumeric);
    if (!isNaN(num) && isFinite(num)) {
      return { v: num, t: 'n' };
    }
  }

  // Percentage e.g. "15.5%"
  if (/^-?\d+(\.\d+)?%$/.test(cleanNumeric)) {
    const num = parseFloat(cleanNumeric.replace('%', '')) / 100;
    if (!isNaN(num) && isFinite(num)) {
      return { v: num, t: 'n' };
    }
  }

  // Plain string
  return { v: trimmed, t: 's' };
}

/**
 * Calculate optimal column widths for Excel worksheet
 */
function calculateColumnWidths(headers: string[], rows: string[][]): { wch: number }[] {
  const colWidths: number[] = headers.map((h) => Math.max(h.length + 4, 12));

  for (const row of rows) {
    for (let i = 0; i < headers.length; i++) {
      const cellText = String(row[i] || '');
      const len = cellText.length;
      if (len + 3 > colWidths[i]) {
        colWidths[i] = Math.min(Math.max(len + 3, colWidths[i]), 50); // Max cap at 50 to avoid overly wide cols
      }
    }
  }

  return colWidths.map((w) => ({ wch: w }));
}

/**
 * Export one or multiple SheetData objects into a styled .xlsx Excel file
 */
export function exportToExcel(
  sheets: SheetData[],
  fileName: string = 'Converted_Document.xlsx',
  options: { autoFitWidths?: boolean; detectTypes?: boolean } = {}
) {
  const { autoFitWidths = true, detectTypes = true } = options;

  const workbook = XLSX.utils.book_new();

  for (let sIdx = 0; sIdx < sheets.length; sIdx++) {
    const sheet = sheets[sIdx];
    // Clean worksheet name (Excel max 31 chars, no invalid chars : \ / ? * [ ])
    let sheetName = (sheet.name || `Sheet${sIdx + 1}`)
      .replace(/[\\/?*[\]:]/g, '_')
      .slice(0, 31);

    // Prepare 2D matrix
    const matrix: any[][] = [];

    // Header row
    matrix.push(sheet.headers);

    // Data rows
    for (const row of sheet.rows) {
      if (detectTypes) {
        const typedRow = row.map((cell) => {
          const inferred = inferCellValue(cell);
          return inferred.v;
        });
        matrix.push(typedRow);
      } else {
        matrix.push(row);
      }
    }

    const worksheet = XLSX.utils.aoa_to_sheet(matrix);

    // Apply column widths
    if (autoFitWidths) {
      worksheet['!cols'] = calculateColumnWidths(sheet.headers, sheet.rows);
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  }

  // Trigger browser download
  const safeFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(workbook, safeFileName, { bookType: 'xlsx', compression: true });
}

/**
 * Generate CSV string with custom delimiter
 */
export function generateCsvString(
  sheet: SheetData,
  delimiter: string = ','
): string {
  const escapeCell = (str: string) => {
    const val = String(str ?? '');
    if (
      val.includes(delimiter) ||
      val.includes('"') ||
      val.includes('\n') ||
      val.includes('\r')
    ) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const lines: string[] = [];

  // Header line
  lines.push(sheet.headers.map(escapeCell).join(delimiter));

  // Data lines
  for (const row of sheet.rows) {
    // Fill to match header length
    const paddedRow = sheet.headers.map((_, i) => row[i] || '');
    lines.push(paddedRow.map(escapeCell).join(delimiter));
  }

  return lines.join('\n');
}

/**
 * Download single sheet as CSV or TSV
 */
export function exportToCsvFile(
  sheet: SheetData,
  fileName: string = 'Export.csv',
  delimiter: string = ','
) {
  const csvContent = generateCsvString(sheet, delimiter);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export document content and tables as a structured JSON file
 */
export function exportToJsonFile(
  contentOrSheet: any,
  sheetsOrFileName?: any,
  maybeFileName: string = 'document_data.json'
): void {
  let jsonString = '';
  let finalFileName = maybeFileName;

  if (Array.isArray(sheetsOrFileName)) {
    // Called with (content, sheets, fileName)
    const sheets = sheetsOrFileName as SheetData[];
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        sheetsCount: sheets.length,
        pagesCount: contentOrSheet?.totalPages || 1,
      },
      tables: sheets.map((s) => ({
        name: s.name,
        page: s.pageNumber,
        headers: s.headers,
        rows: s.rows,
      })),
      textByPage: contentOrSheet?.pages || [],
    };
    jsonString = JSON.stringify(exportData, null, 2);
    finalFileName = maybeFileName;
  } else if (contentOrSheet && contentOrSheet.headers) {
    // Single sheet
    const sheet = contentOrSheet as SheetData;
    finalFileName = typeof sheetsOrFileName === 'string' ? sheetsOrFileName : 'Export.json';
    const records = sheet.rows.map((row) => {
      const obj: Record<string, any> = {};
      sheet.headers.forEach((header, idx) => {
        const cell = row[idx] || '';
        obj[header || `col_${idx + 1}`] = inferCellValue(cell).v;
      });
      return obj;
    });
    jsonString = JSON.stringify(records, null, 2);
  } else {
    jsonString = JSON.stringify(contentOrSheet || {}, null, 2);
    finalFileName = typeof sheetsOrFileName === 'string' ? sheetsOrFileName : 'Export.json';
  }

  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', finalFileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export sheet as HTML Table string
 */
export function exportToHtmlTable(sheet: SheetData): string {
  const headerHtml = sheet.headers
    .map(
      (h) =>
        `<th style="background:#f1f5f9;border:1px solid #cbd5e1;padding:8px 12px;font-weight:600;text-align:left;">${escapeHtml(
          h
        )}</th>`
    )
    .join('');

  const rowsHtml = sheet.rows
    .map((row) => {
      const cells = sheet.headers
        .map((_, i) => {
          const val = row[i] || '';
          return `<td style="border:1px solid #cbd5e1;padding:8px 12px;">${escapeHtml(
            val
          )}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `
<table style="border-collapse:collapse;width:100%;font-family:system-ui,-apple-system,sans-serif;font-size:14px;">
  <thead>
    <tr>${headerHtml}</tr>
  </thead>
  <tbody>
    ${rowsHtml}
  </tbody>
</table>`.trim();
}

function escapeHtml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Copy data to clipboard as formatted TSV (compatible with MS Excel & Google Sheets paste)
 */
export async function copySheetToClipboard(sheet: SheetData): Promise<boolean> {
  try {
    const tsv = generateCsvString(sheet, '\t');
    await navigator.clipboard.writeText(tsv);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

/**
 * Batch export multiple converted PDFs into a single ZIP file containing Excel files
 */
export async function exportBatchZip(
  items: BatchItem[],
  zipFileName: string = 'Converted_PDF_Sheets.zip'
): Promise<void> {
  const zip = new JSZip();

  for (const item of items) {
    if (!item.sheets || item.sheets.length === 0) continue;

    const workbook = XLSX.utils.book_new();

    for (let i = 0; i < item.sheets.length; i++) {
      const sheet = item.sheets[i];
      const sheetName = (sheet.name || `Sheet${i + 1}`).replace(/[\\/?*[\]:]/g, '_').slice(0, 31);
      const matrix = [sheet.headers, ...sheet.rows.map((r) => r.map((c) => inferCellValue(c).v))];
      const ws = XLSX.utils.aoa_to_sheet(matrix);
      ws['!cols'] = calculateColumnWidths(sheet.headers, sheet.rows);
      XLSX.utils.book_append_sheet(workbook, ws, sheetName);
    }

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const cleanBaseName = item.name.replace(/\.pdf$/i, '');
    zip.file(`${cleanBaseName}.xlsx`, excelBuffer);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', zipFileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
