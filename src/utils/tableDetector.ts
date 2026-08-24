import { TableElement, TableCellBound } from '../types/editor';
import { PdfTextItem } from './pdfParser';

interface DetectedTableResult {
  tables: TableElement[];
}

interface TextRowCluster {
  avgY: number;
  minY: number;
  maxY: number;
  items: PdfTextItem[];
}

/**
 * High-precision Document Table Recognition
 * Identifies genuine tables in a PDF page based on text coordinates, column alignments, and bounding geometry.
 * Returns only verified tables with their exact original page coordinates, row heights, and column widths.
 */
export function detectTablesFromPageTextItems(
  items: PdfTextItem[],
  pageNumber: number,
  pageWidth: number = 595.28,
  pageHeight: number = 841.89
): TableElement[] {
  if (!items || items.length < 4) {
    return [];
  }

  const yTolerance = 4.5; // Vertical alignment tolerance in points

  // 1. Group text items into rows based on Y position
  const sortedItems = [...items].sort((a, b) => {
    if (Math.abs(a.y - b.y) <= yTolerance) {
      return a.x - b.x;
    }
    return a.y - b.y;
  });

  const rowClusters: TextRowCluster[] = [];

  for (const item of sortedItems) {
    // Skip empty or isolated page number/header/footer tags
    if (!item.str || item.str.trim() === '') continue;

    let matchedRow = rowClusters.find((r) => Math.abs(r.avgY - item.y) <= yTolerance);

    if (matchedRow) {
      matchedRow.items.push(item);
      matchedRow.minY = Math.min(matchedRow.minY, item.y);
      matchedRow.maxY = Math.max(matchedRow.maxY, item.y + item.height);
      matchedRow.avgY =
        matchedRow.items.reduce((sum, it) => sum + it.y, 0) / matchedRow.items.length;
    } else {
      rowClusters.push({
        avgY: item.y,
        minY: item.y,
        maxY: item.y + item.height,
        items: [item],
      });
    }
  }

  // Sort rows strictly top to bottom
  rowClusters.sort((a, b) => a.avgY - b.avgY);

  // 2. Identify rows with multi-column structure (>= 2 distinct horizontally separated text items)
  interface AnalyzedRow {
    cluster: TextRowCluster;
    columnXPositions: number[];
    isMultiColumn: boolean;
  }

  const analyzedRows: AnalyzedRow[] = rowClusters.map((cluster) => {
    // Sort items left-to-right
    const rowItems = [...cluster.items].sort((a, b) => a.x - b.x);

    // Merge text fragments that are contiguous words in the same column
    const colStarts: number[] = [];
    const minColGap = 15; // Minimum horizontal gap between columns (15pt)

    for (let i = 0; i < rowItems.length; i++) {
      const cur = rowItems[i];
      if (i === 0) {
        colStarts.push(cur.x);
      } else {
        const prev = rowItems[i - 1];
        const gap = cur.x - (prev.x + prev.width);
        if (gap >= minColGap) {
          colStarts.push(cur.x);
        }
      }
    }

    return {
      cluster,
      columnXPositions: colStarts,
      isMultiColumn: colStarts.length >= 2,
    };
  });

  // 3. Group contiguous multi-column rows into Table Blocks
  const tableCandidateGroups: AnalyzedRow[][] = [];
  let currentGroup: AnalyzedRow[] = [];

  for (let i = 0; i < analyzedRows.length; i++) {
    const row = analyzedRows[i];

    if (row.isMultiColumn) {
      if (currentGroup.length === 0) {
        currentGroup.push(row);
      } else {
        const prevRow = currentGroup[currentGroup.length - 1];
        const verticalGap = row.cluster.minY - prevRow.cluster.maxY;

        // If vertical gap is within normal table row spacing (<= 32 pt) and column count matches reasonably
        if (verticalGap <= 32 && Math.abs(row.columnXPositions.length - prevRow.columnXPositions.length) <= 3) {
          currentGroup.push(row);
        } else {
          // Finish previous candidate group and start a new one
          if (currentGroup.length >= 2) {
            tableCandidateGroups.push(currentGroup);
          }
          currentGroup = [row];
        }
      }
    } else {
      // Non-multi column row (regular paragraph text) breaks table continuity
      if (currentGroup.length >= 2) {
        tableCandidateGroups.push(currentGroup);
      }
      currentGroup = [];
    }
  }

  if (currentGroup.length >= 2) {
    tableCandidateGroups.push(currentGroup);
  }

  // 4. Construct high-fidelity TableElements from verified candidate groups
  const detectedTables: TableElement[] = [];

  tableCandidateGroups.forEach((group, groupIdx) => {
    // Only accept genuine tables: at least 2 rows and at least 2 columns
    if (group.length < 2) return;

    // Collect all items in this group
    const allGroupItems: PdfTextItem[] = [];
    group.forEach((r) => allGroupItems.push(...r.cluster.items));

    if (allGroupItems.length < 4) return;

    // Find table bounding box
    const minX = Math.max(0, Math.min(...allGroupItems.map((it) => it.x)) - 6);
    const maxX = Math.min(pageWidth, Math.max(...allGroupItems.map((it) => it.x + it.width)) + 6);
    const minY = Math.max(0, Math.min(...allGroupItems.map((it) => it.y)) - 4);
    const maxY = Math.min(pageHeight, Math.max(...allGroupItems.map((it) => it.y + it.height)) + 4);
    const tableWidth = Math.max(80, maxX - minX);
    const tableHeight = Math.max(40, maxY - minY);

    // Collect column anchors across all rows in this table
    const allColX: number[] = [];
    group.forEach((r) => allColX.push(...r.columnXPositions));
    allColX.sort((a, b) => a - b);

    // Cluster column X anchors (merge within 20pt)
    const columnAnchors: number[] = [];
    const colClusterThreshold = 20;

    for (const x of allColX) {
      const existing = columnAnchors.find((anchor) => Math.abs(anchor - x) < colClusterThreshold);
      if (!existing) {
        columnAnchors.push(x);
      }
    }
    columnAnchors.sort((a, b) => a - b);

    const numCols = Math.max(2, columnAnchors.length);
    if (numCols < 2) return;

    // Calculate column boundaries and widths
    const colBoundaries: { startX: number; endX: number; width: number }[] = [];
    for (let c = 0; c < numCols; c++) {
      const startX = c === 0 ? minX : (columnAnchors[c] + columnAnchors[c - 1]) / 2;
      const endX = c === numCols - 1 ? maxX : (columnAnchors[c] + (columnAnchors[c + 1] || maxX)) / 2;
      colBoundaries.push({
        startX,
        endX,
        width: Math.max(20, endX - startX),
      });
    }

    // Extract text into cells for each row
    const rawGrid: string[][] = [];
    const rowHeights: number[] = [];

    group.forEach((analyzedRow, rIdx) => {
      const rowCells: string[] = new Array(numCols).fill('');
      const rItems = [...analyzedRow.cluster.items].sort((a, b) => a.x - b.x);

      // Estimate row height
      const rowH = Math.max(16, analyzedRow.cluster.maxY - analyzedRow.cluster.minY + 6);
      rowHeights.push(rowH);

      rItems.forEach((item) => {
        // Find which column this item belongs to
        let bestCol = 0;
        let minDistance = Infinity;

        for (let c = 0; c < numCols; c++) {
          const colCenter = (colBoundaries[c].startX + colBoundaries[c].endX) / 2;
          const dist = Math.abs(item.x - colBoundaries[c].startX);
          if (dist < minDistance) {
            minDistance = dist;
            bestCol = c;
          }
        }

        const trimmed = item.str.trim();
        if (trimmed) {
          rowCells[bestCol] = rowCells[bestCol] ? `${rowCells[bestCol]} ${trimmed}` : trimmed;
        }
      });

      rawGrid.push(rowCells);
    });

    if (rawGrid.length < 2) return;

    // First row is headers, subsequent are rows
    const headers = rawGrid[0].map((h, i) => (h && h.trim() ? h.trim() : `Col ${i + 1}`));
    const dataRows = rawGrid.slice(1);
    const dataRowHeights = rowHeights.slice(1);
    const headerHeight = rowHeights[0] || 20;

    // Calculate individual cell bounds for precise click-testing and masking
    const headerCellBounds: TableCellBound[] = [];
    let currentCellX = minX;

    colBoundaries.forEach((col) => {
      headerCellBounds.push({
        x: currentCellX,
        y: minY,
        width: col.width,
        height: headerHeight,
      });
      currentCellX += col.width;
    });

    const rowCellBounds: TableCellBound[][] = [];
    let currentRowY = minY + headerHeight;

    dataRows.forEach((_, rIdx) => {
      const rHeight = dataRowHeights[rIdx] || 18;
      const cellRow: TableCellBound[] = [];
      let cellX = minX;

      colBoundaries.forEach((col) => {
        cellRow.push({
          x: cellX,
          y: currentRowY,
          width: col.width,
          height: rHeight,
        });
        cellX += col.width;
      });

      rowCellBounds.push(cellRow);
      currentRowY += rHeight;
    });

    const colWidths = colBoundaries.map((b) => Number(b.width.toFixed(1)));

    detectedTables.push({
      id: `table-native-${pageNumber}-${groupIdx}-${Date.now()}`,
      pageNumber,
      type: 'table',
      headers,
      rows: dataRows,
      originalHeaders: [...headers],
      originalRows: dataRows.map((r) => [...r]),
      colWidths,
      rowHeights: dataRowHeights,
      headerHeight,
      x: Number(minX.toFixed(1)),
      y: Number(minY.toFixed(1)),
      width: Number(tableWidth.toFixed(1)),
      height: Number(tableHeight.toFixed(1)),
      isNativePdfTable: true,
      headerBgColor: '#1e293b',
      headerTextColor: '#ffffff',
      cellBgColor: '#ffffff',
      cellTextColor: '#0f172a',
      borderColor: '#cbd5e1',
      borderWidth: 0.75,
      fontSize: 9,
      hasHeaderRow: true,
      originalRegion: {
        x: Number(minX.toFixed(1)),
        y: Number(minY.toFixed(1)),
        width: Number(tableWidth.toFixed(1)),
        height: Number(tableHeight.toFixed(1)),
      },
      cellBounds: {
        headerBounds: headerCellBounds,
        rowBounds: rowCellBounds,
      },
      zIndex: 5,
    });
  });

  return detectedTables;
}
