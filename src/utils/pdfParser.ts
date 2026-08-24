import * as pdfjsLib from 'pdfjs-dist';
import { SheetData, TableRow } from '../types';

// Configure pdfjs worker
try {
  if (typeof window !== 'undefined') {
    // Set worker source using a reliable CDN that matches modern ESM pdfjs-dist
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
  }
} catch (e) {
  console.warn('PDF.js worker setup fallback:', e);
}

export interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RegionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Load PDF document from ArrayBuffer
 */
export async function loadPdfDocument(arrayBuffer: ArrayBuffer, password?: string) {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    password: password,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
    cMapPacked: true,
  });
  return await loadingTask.promise;
}

/**
 * Render a PDF page to a canvas context for visual preview and table region selection
 */
export async function renderPdfPageToCanvas(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.5
): Promise<{ width: number; height: number; scale: number }> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D canvas context');

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const renderContext: any = {
    canvasContext: ctx,
    viewport: viewport,
    canvas: canvas,
  };

  const renderTask = page.render(renderContext);
  try {
    await renderTask.promise;
  } catch (err: any) {
    if (err?.name === 'RenderingCancelledException' || err?.message?.includes('cancelled')) {
      return { width: viewport.width, height: viewport.height, scale };
    }
    throw err;
  }

  return {
    width: viewport.width,
    height: viewport.height,
    scale,
  };
}

/**
 * Extract text items with geometric coordinates from a PDF page
 */
export async function extractPageTextItems(
  page: pdfjsLib.PDFPageProxy,
  region?: RegionBounds | null
): Promise<PdfTextItem[]> {
  const viewport = page.getViewport({ scale: 1.0 });
  const textContent = await page.getTextContent();
  const items: PdfTextItem[] = [];

  for (const item of textContent.items) {
    if (!('str' in item) || !item.str || item.str.trim() === '') continue;

    // Transform matrix: [scaleX, skewY, skewX, scaleY, tx, ty]
    const tx = item.transform[4];
    const ty = item.transform[5];
    const width = item.width || 0;
    const height = item.height || Math.abs(item.transform[3]) || 10;

    // Convert from PDF coords (bottom-left origin) to Screen coords (top-left origin)
    const x = tx;
    const y = viewport.height - ty - height;

    // Check if within crop region if region provided
    if (region) {
      const inside =
        x + width >= region.x &&
        x <= region.x + region.width &&
        y + height >= region.y &&
        y <= region.y + region.height;
      if (!inside) continue;
    }

    items.push({
      str: item.str,
      x,
      y,
      width,
      height,
    });
  }

  return items;
}

/**
 * Heuristic table parser: converts raw 2D text coordinates into a structured grid
 */
export function clusterTextItemsIntoTable(
  items: PdfTextItem[],
  options: {
    yTolerance?: number;
    minColumns?: number;
    firstRowIsHeader?: boolean;
    trimWhitespace?: boolean;
  } = {}
): { headers: string[]; rows: TableRow[] } {
  if (!items || items.length === 0) {
    return { headers: ['Column 1'], rows: [] };
  }

  const {
    yTolerance = 6,
    firstRowIsHeader = true,
    trimWhitespace = true,
  } = options;

  // 1. Sort all items primarily by Y (top to bottom), then by X (left to right)
  const sortedItems = [...items].sort((a, b) => {
    if (Math.abs(a.y - b.y) <= yTolerance) {
      return a.x - b.x;
    }
    return a.y - b.y;
  });

  // 2. Group into distinct rows
  interface RawRow {
    avgY: number;
    items: PdfTextItem[];
  }

  const rawRows: RawRow[] = [];

  for (const item of sortedItems) {
    let matchedRow = rawRows.find(
      (r) => Math.abs(r.avgY - item.y) <= yTolerance
    );

    if (matchedRow) {
      matchedRow.items.push(item);
      // Update average Y
      matchedRow.avgY =
        matchedRow.items.reduce((sum, it) => sum + it.y, 0) /
        matchedRow.items.length;
    } else {
      rawRows.push({
        avgY: item.y,
        items: [item],
      });
    }
  }

  // Sort raw rows vertically top-to-bottom
  rawRows.sort((a, b) => a.avgY - b.avgY);

  // 3. Detect column boundaries across all rows
  // Find all distinct X positions to infer column partitions
  const xPositions: number[] = [];
  for (const row of rawRows) {
    for (const it of row.items) {
      xPositions.push(it.x);
    }
  }
  xPositions.sort((a, b) => a - b);

  // Cluster X positions into column anchors
  const columnAnchors: number[] = [];
  const xThreshold = 18; // Min horizontal gap between distinct columns

  for (const x of xPositions) {
    const existing = columnAnchors.find((colX) => Math.abs(colX - x) < xThreshold);
    if (!existing) {
      columnAnchors.push(x);
    }
  }
  columnAnchors.sort((a, b) => a - b);

  // If very few columns detected, fallback to row-by-row max columns
  const numColumns = Math.max(
    columnAnchors.length,
    Math.max(...rawRows.map((r) => r.items.length), 1)
  );

  // 4. Map each row's items into the nearest column slots
  const grid: string[][] = [];

  for (const row of rawRows) {
    // Sort items within row from left to right
    row.items.sort((a, b) => a.x - b.x);

    const rowCells: string[] = new Array(columnAnchors.length || numColumns).fill('');

    for (const item of row.items) {
      // Find closest column anchor
      let bestColIdx = 0;
      let minDistance = Infinity;

      if (columnAnchors.length > 0) {
        for (let i = 0; i < columnAnchors.length; i++) {
          const dist = Math.abs(columnAnchors[i] - item.x);
          if (dist < minDistance) {
            minDistance = dist;
            bestColIdx = i;
          }
        }
      } else {
        bestColIdx = Math.min(rowCells.length - 1, grid.length);
      }

      // If cell already has text, append with a space (e.g. multi-word cell)
      const currentText = rowCells[bestColIdx];
      const newStr = trimWhitespace ? item.str.trim() : item.str;
      if (newStr) {
        rowCells[bestColIdx] = currentText ? `${currentText} ${newStr}` : newStr;
      }
    }

    // Only add row if it contains at least one non-empty cell
    if (rowCells.some((cell) => cell.trim() !== '')) {
      grid.push(rowCells);
    }
  }

  // Normalize column count for all rows and remove totally empty columns
  if (grid.length === 0) {
    return { headers: ['Column 1'], rows: [] };
  }

  // Find columns that have content in at least one row
  const activeColIndices: number[] = [];
  const totalCols = Math.max(...grid.map((r) => r.length));

  for (let c = 0; c < totalCols; c++) {
    const hasData = grid.some((r) => r[c] && r[c].trim() !== '');
    if (hasData) {
      activeColIndices.push(c);
    }
  }

  const cleanedGrid = grid.map((row) =>
    activeColIndices.map((colIdx) => row[colIdx] || '')
  );

  // Separate headers and data rows
  let headers: string[] = [];
  let rows: TableRow[] = [];

  if (firstRowIsHeader && cleanedGrid.length > 0) {
    headers = cleanedGrid[0].map((h, i) => (h && h.trim() ? h.trim() : `Column ${i + 1}`));
    rows = cleanedGrid.slice(1);
  } else {
    const colCount = cleanedGrid[0]?.length || 1;
    headers = Array.from({ length: colCount }, (_, i) => `Column ${i + 1}`);
    rows = cleanedGrid;
  }

  return { headers, rows };
}

/**
 * Parse page range strings such as "1-3, 5, 7-10"
 */
export function parsePageRange(rangeStr: string, maxPages: number): number[] {
  if (!rangeStr || !rangeStr.trim()) {
    return Array.from({ length: maxPages }, (_, i) => i + 1);
  }
  const pages = new Set<number>();
  const parts = rangeStr.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        for (let p = Math.min(start, end); p <= Math.max(start, end); p++) {
          if (p >= 1 && p <= maxPages) {
            pages.add(p);
          }
        }
      }
    } else {
      const p = parseInt(trimmed, 10);
      if (!isNaN(p) && p >= 1 && p <= maxPages) {
        pages.add(p);
      }
    }
  }
  const result = Array.from(pages).sort((a, b) => a - b);
  return result.length > 0 ? result : Array.from({ length: maxPages }, (_, i) => i + 1);
}

/**
 * Extract complete tables across all or selected pages of a PDF document
 */
export async function extractTablesFromPdf(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumbersOrOptions?:
    | number[]
    | {
        firstRowIsHeader?: boolean;
        trimWhitespace?: boolean;
        selectedRegion?: { [pageNumber: number]: RegionBounds } | RegionBounds | null;
        selectedPages?: 'all' | 'current' | 'custom';
        customPageRange?: string;
        combinePagesToOneSheet?: boolean;
        [key: string]: any;
      },
  extraOptions?: {
    firstRowIsHeader?: boolean;
    trimWhitespace?: boolean;
    selectedRegion?: { [pageNumber: number]: RegionBounds } | RegionBounds | null;
    combinePagesToOneSheet?: boolean;
  }
): Promise<SheetData[]> {
  let targetPages: number[] = [];
  let mergedOptions: any = {};

  if (Array.isArray(pageNumbersOrOptions)) {
    targetPages = pageNumbersOrOptions;
    mergedOptions = extraOptions || {};
  } else if (pageNumbersOrOptions && typeof pageNumbersOrOptions === 'object') {
    mergedOptions = pageNumbersOrOptions;
    if (mergedOptions.selectedPages === 'custom' && mergedOptions.customPageRange) {
      targetPages = parsePageRange(mergedOptions.customPageRange, pdfDoc.numPages);
    } else if (mergedOptions.selectedPages === 'current') {
      targetPages = [1];
    } else {
      targetPages = Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1);
    }
  } else {
    targetPages = Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1);
    mergedOptions = extraOptions || {};
  }

  // Ensure targetPages has at least one valid number within bounds
  if (!targetPages || targetPages.length === 0) {
    targetPages = Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1);
  }

  const sheets: SheetData[] = [];

  for (const pageNum of targetPages) {
    if (pageNum < 1 || pageNum > pdfDoc.numPages) continue;

    try {
      const page = await pdfDoc.getPage(pageNum);

      let region: RegionBounds | null = null;
      if (mergedOptions.selectedRegion) {
        if ('x' in mergedOptions.selectedRegion && 'y' in mergedOptions.selectedRegion) {
          region = mergedOptions.selectedRegion as RegionBounds;
        } else if (mergedOptions.selectedRegion[pageNum]) {
          region = mergedOptions.selectedRegion[pageNum];
        }
      }

      const items = await extractPageTextItems(page, region);
      const table = clusterTextItemsIntoTable(items, {
        firstRowIsHeader: mergedOptions.firstRowIsHeader ?? true,
        trimWhitespace: mergedOptions.trimWhitespace ?? true,
      });

      sheets.push({
        id: `sheet-page-${pageNum}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: `Page ${pageNum}`,
        pageNumber: pageNum,
        headers: table.headers.length > 0 ? table.headers : ['Column 1'],
        rows: table.rows,
        extractedAt: Date.now(),
        isAiExtracted: false,
        selectedRegion: region ? { ...region, page: pageNum } : null,
      });
    } catch (pageErr) {
      console.warn(`Failed extracting page ${pageNum}:`, pageErr);
    }
  }

  if (mergedOptions.combinePagesToOneSheet && sheets.length > 1) {
    return [consolidateSheets(sheets)];
  }

  return sheets;
}

/**
 * Merge multiple sheets into one unified master table if they share similar column structure
 */
export function consolidateSheets(sheets: SheetData[]): SheetData {
  if (sheets.length === 0) {
    return {
      id: 'consolidated-empty',
      name: 'Consolidated Table',
      pageNumber: 1,
      headers: ['Column 1'],
      rows: [],
    };
  }

  if (sheets.length === 1) {
    return { ...sheets[0], name: 'Consolidated Table' };
  }

  // Use headers from the sheet with the most columns as reference
  const baseSheet = [...sheets].sort((a, b) => b.headers.length - a.headers.length)[0];
  const masterHeaders = [...baseSheet.headers];

  const mergedRows: TableRow[] = [];

  for (const sheet of sheets) {
    for (const row of sheet.rows) {
      // Pad or trim row to match masterHeaders length
      const adjustedRow: string[] = [];
      for (let i = 0; i < masterHeaders.length; i++) {
        adjustedRow.push(row[i] || '');
      }
      mergedRows.push(adjustedRow);
    }
  }

  return {
    id: `consolidated-${Date.now()}`,
    name: 'Consolidated All Pages',
    pageNumber: 1,
    headers: masterHeaders,
    rows: mergedRows,
    extractedAt: Date.now(),
  };
}
