import {
  PDFDocument,
  rgb,
  StandardFonts,
  degrees,
  PDFPage,
  PDFFont
} from 'pdf-lib';
import {
  PageEditData,
  PdfEditorElement,
  TextElement,
  TableElement,
  ShapeElement,
  DrawingElement,
  ImageElement,
  WhiteoutElement
} from '../types/editor';

/**
 * Convert Hex Color string (#rrggbb) or rgba to pdf-lib rgb(r, g, b)
 */
export function hexToRgb(hex: string | undefined, defaultColor = rgb(0, 0, 0)) {
  if (!hex) return defaultColor;
  if (hex === 'transparent') return undefined;

  let cleaned = hex.trim();
  if (cleaned.startsWith('#')) {
    cleaned = cleaned.slice(1);
    if (cleaned.length === 3) {
      cleaned = cleaned
        .split('')
        .map((c) => c + c)
        .join('');
    }
    if (cleaned.length === 6 || cleaned.length === 8) {
      const r = parseInt(cleaned.substring(0, 2), 16) / 255;
      const g = parseInt(cleaned.substring(2, 4), 16) / 255;
      const b = parseInt(cleaned.substring(4, 6), 16) / 255;
      return rgb(Math.max(0, Math.min(1, r)), Math.max(0, Math.min(1, g)), Math.max(0, Math.min(1, b)));
    }
  }

  // Handle rgb(r,g,b) / rgba(r,g,b,a)
  const rgbMatch = cleaned.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10) / 255;
    const g = parseInt(rgbMatch[2], 10) / 255;
    const b = parseInt(rgbMatch[3], 10) / 255;
    return rgb(Math.max(0, Math.min(1, r)), Math.max(0, Math.min(1, g)), Math.max(0, Math.min(1, b)));
  }

  return defaultColor;
}

/**
 * Data URI to Uint8Array helper
 */
function dataUriToUint8Array(dataUri: string): Uint8Array {
  const base64 = dataUri.split(',')[1] || dataUri;
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Render all user edits, text replacements, tables, shapes, and images into a modified PDF
 */
export async function exportModifiedPdf(
  originalPdfBuffer: ArrayBuffer | null,
  pagesData: PageEditData[],
  fallbackWidth = 595.28,
  fallbackHeight = 841.89
): Promise<Uint8Array> {
  let pdfDoc: PDFDocument;

  if (originalPdfBuffer && originalPdfBuffer.byteLength > 0) {
    try {
      pdfDoc = await PDFDocument.load(originalPdfBuffer, { ignoreEncryption: true });
    } catch {
      pdfDoc = await PDFDocument.create();
    }
  } else {
    pdfDoc = await PDFDocument.create();
  }

  // Load standard fonts
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontHelveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const fontTimes = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontCourier = await pdfDoc.embedFont(StandardFonts.Courier);

  const getFont = (family?: string, weight?: string, style?: string): PDFFont => {
    if (family === 'Times') return fontTimes;
    if (family === 'Courier') return fontCourier;
    if (weight === 'bold') return fontHelveticaBold;
    if (style === 'italic') return fontHelveticaOblique;
    return fontHelvetica;
  };

  const existingPageCount = pdfDoc.getPageCount();

  // If pages were added or document was created from scratch, add missing pages
  while (pdfDoc.getPageCount() < pagesData.length) {
    pdfDoc.addPage([fallbackWidth, fallbackHeight]);
  }

  // Handle deletions: collect pages to keep
  const nonDeletedPages = pagesData.filter((p) => !p.isDeleted);
  const deletedPageIndices = pagesData
    .map((p, idx) => (p.isDeleted ? idx : -1))
    .filter((idx) => idx !== -1);

  // Process each page
  for (let i = 0; i < pagesData.length; i++) {
    const pageData = pagesData[i];
    if (pageData.isDeleted) continue;

    let page: PDFPage;
    if (i < pdfDoc.getPageCount()) {
      page = pdfDoc.getPage(i);
    } else {
      page = pdfDoc.addPage([pageData.originalWidth || fallbackWidth, pageData.originalHeight || fallbackHeight]);
    }

    const { width: pageWidth, height: pageHeight } = page.getSize();

    // Apply rotation if needed
    if (pageData.rotation) {
      const currentRot = page.getRotation().angle;
      page.setRotation(degrees((currentRot + pageData.rotation) % 360));
    }

    // Sort elements by zIndex
    const sortedElements = [...pageData.elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    for (const el of sortedElements) {
      try {
        switch (el.type) {
          case 'whiteout':
            drawWhiteoutElement(page, el as WhiteoutElement, pageHeight);
            break;
          case 'text':
            await drawTextElement(page, el as TextElement, pageHeight, getFont);
            break;
          case 'table':
            await drawTableElement(page, el as TableElement, pageHeight, getFont);
            break;
          case 'shape':
            drawShapeElement(page, el as ShapeElement, pageHeight);
            break;
          case 'drawing':
            drawDrawingElement(page, el as DrawingElement, pageHeight);
            break;
          case 'image':
            await drawImageElement(pdfDoc, page, el as ImageElement, pageHeight);
            break;
        }
      } catch (err) {
        console.warn('Error drawing element on PDF export:', el, err);
      }
    }
  }

  // Remove deleted pages from the end backwards to keep indices stable
  for (let idx = deletedPageIndices.length - 1; idx >= 0; idx--) {
    const pIndex = deletedPageIndices[idx];
    if (pIndex < pdfDoc.getPageCount() && pdfDoc.getPageCount() > 1) {
      pdfDoc.removePage(pIndex);
    }
  }

  return await pdfDoc.save();
}

/**
 * Draw Whiteout mask
 */
function drawWhiteoutElement(page: PDFPage, el: WhiteoutElement, pageHeight: number) {
  const pdfX = el.x;
  const pdfY = pageHeight - el.y - el.height;
  const fillColor = hexToRgb(el.color, rgb(1, 1, 1));

  if (fillColor) {
    page.drawRectangle({
      x: pdfX,
      y: pdfY,
      width: Math.max(1, el.width),
      height: Math.max(1, el.height),
      color: fillColor,
      opacity: el.opacity ?? 1,
    });
  }
}

/**
 * Draw Text element with smart background mask and line wrapping
 */
async function drawTextElement(
  page: PDFPage,
  el: TextElement,
  pageHeight: number,
  getFont: (f?: string, w?: string, s?: string) => PDFFont
) {
  const font = getFont(el.fontFamily, el.fontWeight, el.fontStyle);
  const fontSize = Math.max(6, el.fontSize || 12);
  const textColor = hexToRgb(el.color, rgb(0.08, 0.08, 0.12));

  // If there's an originalBounds or whiteout background, draw mask first
  if (el.originalBounds) {
    const origY = pageHeight - el.originalBounds.y - el.originalBounds.height - 2;
    page.drawRectangle({
      x: el.originalBounds.x - 2,
      y: origY,
      width: el.originalBounds.width + 4,
      height: el.originalBounds.height + 4,
      color: rgb(1, 1, 1),
    });
  }

  if (el.backgroundColor && el.backgroundColor !== 'transparent') {
    const bg = hexToRgb(el.backgroundColor);
    if (bg) {
      const pdfY = pageHeight - el.y - el.height;
      page.drawRectangle({
        x: el.x,
        y: pdfY,
        width: Math.max(1, el.width),
        height: Math.max(1, el.height),
        color: bg,
        opacity: el.opacity ?? 1,
      });
    }
  }

  // Split lines
  const lines = (el.text || '').split('\n');
  const lineHeight = fontSize * 1.25;

  lines.forEach((lineText, lineIdx) => {
    if (!lineText) return;
    const textWidth = font.widthOfTextAtSize(lineText, fontSize);
    let lineX = el.x;

    if (el.textAlign === 'center') {
      lineX = el.x + (el.width - textWidth) / 2;
    } else if (el.textAlign === 'right') {
      lineX = el.x + el.width - textWidth;
    }

    // Baseline calculation in PDF points
    const linePdfY = pageHeight - el.y - (lineIdx + 1) * lineHeight + (lineHeight - fontSize) / 2;

    page.drawText(lineText, {
      x: Math.max(0, lineX),
      y: Math.max(0, linePdfY),
      size: fontSize,
      font: font,
      color: textColor,
      opacity: el.opacity ?? 1,
    });
  });
}

/**
 * Draw Table element onto PDF with granular in-place cell editing & native preservation
 */
async function drawTableElement(
  page: PDFPage,
  el: TableElement,
  pageHeight: number,
  getFont: (f?: string, w?: string, s?: string) => PDFFont
) {
  const fontRegular = getFont('Helvetica', 'normal');
  const fontBold = getFont('Helvetica', 'bold');
  const fontSize = Math.max(7, el.fontSize || 9);

  const numCols = Math.max(1, el.headers?.length || (el.rows[0]?.length ?? 1));
  const totalRows = (el.headers?.length ? 1 : 0) + (el.rows?.length || 0);

  // Column widths in points
  const colWidths = el.colWidths && el.colWidths.length === numCols
    ? el.colWidths
    : new Array(numCols).fill(el.width / numCols);

  const defaultRowHeight = Math.max(16, el.height / Math.max(1, totalRows));
  const headerHeight = el.headerHeight || defaultRowHeight;
  const rowHeights = el.rowHeights && el.rowHeights.length === el.rows?.length
    ? el.rowHeights
    : new Array(el.rows?.length || 0).fill(defaultRowHeight);

  const headerBg = hexToRgb(el.headerBgColor, rgb(0.12, 0.16, 0.23));
  const headerText = hexToRgb(el.headerTextColor, rgb(1, 1, 1));
  const cellBg = hexToRgb(el.cellBgColor, rgb(1, 1, 1));
  const cellText = hexToRgb(el.cellTextColor, rgb(0.1, 0.1, 0.1));
  const borderColor = hexToRgb(el.borderColor, rgb(0.8, 0.84, 0.9));

  // Case 1: Native PDF Table - only update changed cells and added rows to preserve original vector document
  if (el.isNativePdfTable && el.originalHeaders && el.originalRows) {
    const origRowCount = el.originalRows.length;
    const origColCount = el.originalHeaders.length;

    // Check if column structure is unchanged
    if (numCols === origColCount) {
      // 1. Check Header cell modifications
      let curColX = el.x;
      for (let c = 0; c < numCols; c++) {
        const cWidth = colWidths[c];
        const currentVal = el.headers[c] || '';
        const originalVal = el.originalHeaders[c] || '';

        if (currentVal !== originalVal) {
          const cellPdfY = pageHeight - el.y - headerHeight;
          // Draw whiteout patch over changed cell
          page.drawRectangle({
            x: curColX,
            y: cellPdfY,
            width: cWidth,
            height: headerHeight,
            color: rgb(1, 1, 1),
          });
          // Draw updated text
          if (currentVal) {
            page.drawText(currentVal, {
              x: curColX + 3,
              y: cellPdfY + (headerHeight - fontSize) / 2 + 1,
              size: fontSize,
              font: fontBold,
              color: cellText,
            });
          }
        }
        curColX += cWidth;
      }

      // 2. Check existing data rows modifications
      let curY = el.y + headerHeight;
      for (let r = 0; r < Math.min(el.rows.length, origRowCount); r++) {
        const rHeight = rowHeights[r] || defaultRowHeight;
        const cellPdfY = pageHeight - curY - rHeight;
        let cellX = el.x;

        for (let c = 0; c < numCols; c++) {
          const cWidth = colWidths[c];
          const currentVal = el.rows[r]?.[c] || '';
          const originalVal = el.originalRows[r]?.[c] || '';

          if (currentVal !== originalVal) {
            // Draw whiteout patch over changed cell
            page.drawRectangle({
              x: cellX,
              y: cellPdfY,
              width: cWidth,
              height: rHeight,
              color: rgb(1, 1, 1),
            });
            // Draw updated text
            if (currentVal) {
              page.drawText(currentVal, {
                x: cellX + 3,
                y: cellPdfY + (rHeight - fontSize) / 2 + 1,
                size: fontSize,
                font: fontRegular,
                color: cellText,
              });
            }
          }
          cellX += cWidth;
        }
        curY += rHeight;
      }

      // 3. Draw newly ADDED rows at the bottom of the table
      if (el.rows.length > origRowCount) {
        for (let r = origRowCount; r < el.rows.length; r++) {
          const rHeight = rowHeights[r] || defaultRowHeight;
          const cellPdfY = pageHeight - curY - rHeight;
          let cellX = el.x;

          for (let c = 0; c < numCols; c++) {
            const cWidth = colWidths[c];
            const text = el.rows[r]?.[c] || '';

            // Draw new row cell background & border
            page.drawRectangle({
              x: cellX,
              y: cellPdfY,
              width: cWidth,
              height: rHeight,
              color: cellBg || rgb(1, 1, 1),
              borderColor: borderColor,
              borderWidth: el.borderWidth || 0.5,
            });

            if (text) {
              page.drawText(text, {
                x: cellX + 3,
                y: cellPdfY + (rHeight - fontSize) / 2 + 1,
                size: fontSize,
                font: fontRegular,
                color: cellText,
              });
            }
            cellX += cWidth;
          }
          curY += rHeight;
        }
      }

      return;
    }
  }

  // Case 2: Full Table Drawing (for newly added tables or modified columns/deletions)
  if (el.originalRegion) {
    const origY = pageHeight - el.originalRegion.y - el.originalRegion.height;
    page.drawRectangle({
      x: el.originalRegion.x - 2,
      y: origY - 2,
      width: el.originalRegion.width + 4,
      height: el.originalRegion.height + 4,
      color: rgb(1, 1, 1),
    });
  }

  let currentYOffset = 0;

  // 1. Draw Header Row
  if (el.headers && el.headers.length > 0) {
    const rowPdfY = pageHeight - el.y - currentYOffset - headerHeight;
    let cellX = el.x;

    for (let c = 0; c < numCols; c++) {
      const cWidth = colWidths[c] || el.width / numCols;
      const text = el.headers[c] || '';

      if (headerBg) {
        page.drawRectangle({
          x: cellX,
          y: rowPdfY,
          width: cWidth,
          height: headerHeight,
          color: headerBg,
          borderColor: borderColor,
          borderWidth: el.borderWidth || 0.75,
        });
      }

      if (text) {
        page.drawText(text, {
          x: cellX + 4,
          y: rowPdfY + (headerHeight - fontSize) / 2 + 1,
          size: fontSize,
          font: fontBold,
          color: headerText,
        });
      }
      cellX += cWidth;
    }
    currentYOffset += headerHeight;
  }

  // 2. Draw Data Rows
  if (el.rows) {
    el.rows.forEach((row, rIdx) => {
      const rHeight = rowHeights[rIdx] || defaultRowHeight;
      const rowPdfY = pageHeight - el.y - currentYOffset - rHeight;
      const isAlt = rIdx % 2 === 1;
      const bg = isAlt ? rgb(0.97, 0.98, 0.99) : cellBg;
      let cellX = el.x;

      for (let c = 0; c < numCols; c++) {
        const cWidth = colWidths[c] || el.width / numCols;
        const text = row[c] || '';

        if (bg) {
          page.drawRectangle({
            x: cellX,
            y: rowPdfY,
            width: cWidth,
            height: rHeight,
            color: bg,
            borderColor: borderColor,
            borderWidth: el.borderWidth || 0.5,
          });
        }

        if (text) {
          page.drawText(text, {
            x: cellX + 4,
            y: rowPdfY + (rHeight - fontSize) / 2 + 1,
            size: fontSize,
            font: fontRegular,
            color: cellText,
          });
        }
        cellX += cWidth;
      }
      currentYOffset += rHeight;
    });
  }
}

/**
 * Draw Vector Shape elements (rectangles, circles, lines, arrows, highlights, checkboxes)
 */
function drawShapeElement(page: PDFPage, el: ShapeElement, pageHeight: number) {
  const pdfX = el.x;
  const pdfY = pageHeight - el.y - el.height;
  const stroke = hexToRgb(el.strokeColor, rgb(0.2, 0.2, 0.2));
  const fill = hexToRgb(el.fillColor);
  const strokeWidth = el.strokeWidth || 1.5;

  switch (el.shapeType) {
    case 'rectangle':
    case 'highlight': {
      const isHighlight = el.shapeType === 'highlight';
      page.drawRectangle({
        x: pdfX,
        y: pdfY,
        width: Math.max(1, el.width),
        height: Math.max(1, el.height),
        color: isHighlight ? hexToRgb(el.fillColor, rgb(1, 0.95, 0.2)) : fill,
        borderColor: isHighlight ? undefined : stroke,
        borderWidth: isHighlight ? 0 : strokeWidth,
        opacity: isHighlight ? (el.opacity ?? 0.4) : (el.opacity ?? 1),
      });
      break;
    }

    case 'circle': {
      page.drawEllipse({
        x: pdfX + el.width / 2,
        y: pdfY + el.height / 2,
        xScale: el.width / 2,
        yScale: el.height / 2,
        color: fill,
        borderColor: stroke,
        borderWidth: strokeWidth,
        opacity: el.opacity ?? 1,
      });
      break;
    }

    case 'line': {
      page.drawLine({
        start: { x: el.x, y: pageHeight - el.y },
        end: { x: el.x + el.width, y: pageHeight - (el.y + el.height) },
        thickness: strokeWidth,
        color: stroke || rgb(0, 0, 0),
        opacity: el.opacity ?? 1,
      });
      break;
    }

    case 'arrow': {
      const startX = el.x;
      const startY = pageHeight - el.y;
      const endX = el.x + el.width;
      const endY = pageHeight - (el.y + el.height);

      page.drawLine({
        start: { x: startX, y: startY },
        end: { x: endX, y: endY },
        thickness: strokeWidth,
        color: stroke || rgb(0, 0, 0),
        opacity: el.opacity ?? 1,
      });

      // Draw arrowhead
      const angle = Math.atan2(endY - startY, endX - startX);
      const headLen = Math.max(8, strokeWidth * 3.5);
      page.drawLine({
        start: { x: endX, y: endY },
        end: {
          x: endX - headLen * Math.cos(angle - Math.PI / 6),
          y: endY - headLen * Math.sin(angle - Math.PI / 6),
        },
        thickness: strokeWidth,
        color: stroke || rgb(0, 0, 0),
      });
      page.drawLine({
        start: { x: endX, y: endY },
        end: {
          x: endX - headLen * Math.cos(angle + Math.PI / 6),
          y: endY - headLen * Math.sin(angle + Math.PI / 6),
        },
        thickness: strokeWidth,
        color: stroke || rgb(0, 0, 0),
      });
      break;
    }

    case 'checkbox':
    case 'checkmark':
    case 'crossmark': {
      // Draw checkbox box
      page.drawRectangle({
        x: pdfX,
        y: pdfY,
        width: el.width,
        height: el.height,
        color: fill || rgb(1, 1, 1),
        borderColor: stroke || rgb(0.2, 0.2, 0.2),
        borderWidth: 1.5,
      });

      // Draw checkmark or cross inside if checked or checkmark type
      if (el.shapeType === 'checkmark' || el.isChecked) {
        page.drawLine({
          start: { x: pdfX + el.width * 0.2, y: pdfY + el.height * 0.5 },
          end: { x: pdfX + el.width * 0.45, y: pdfY + el.height * 0.2 },
          thickness: 2,
          color: rgb(0.1, 0.65, 0.3),
        });
        page.drawLine({
          start: { x: pdfX + el.width * 0.45, y: pdfY + el.height * 0.2 },
          end: { x: pdfX + el.width * 0.85, y: pdfY + el.height * 0.8 },
          thickness: 2,
          color: rgb(0.1, 0.65, 0.3),
        });
      } else if (el.shapeType === 'crossmark') {
        page.drawLine({
          start: { x: pdfX + el.width * 0.25, y: pdfY + el.height * 0.25 },
          end: { x: pdfX + el.width * 0.75, y: pdfY + el.height * 0.75 },
          thickness: 2,
          color: rgb(0.85, 0.15, 0.15),
        });
        page.drawLine({
          start: { x: pdfX + el.width * 0.75, y: pdfY + el.height * 0.25 },
          end: { x: pdfX + el.width * 0.25, y: pdfY + el.height * 0.75 },
          thickness: 2,
          color: rgb(0.85, 0.15, 0.15),
        });
      }
      break;
    }
  }
}

/**
 * Draw Freehand Drawing SVG segments
 */
function drawDrawingElement(page: PDFPage, el: DrawingElement, pageHeight: number) {
  if (!el.points || el.points.length < 2) return;
  const stroke = hexToRgb(el.strokeColor, rgb(0.1, 0.1, 0.1));
  const strokeWidth = el.strokeWidth || 2;
  const isHighlighter = el.isHighlighter;

  for (let i = 0; i < el.points.length - 1; i++) {
    const p1 = el.points[i];
    const p2 = el.points[i + 1];

    page.drawLine({
      start: { x: p1.x, y: pageHeight - p1.y },
      end: { x: p2.x, y: pageHeight - p2.y },
      thickness: isHighlighter ? strokeWidth * 2 : strokeWidth,
      color: stroke || rgb(0, 0, 0),
      opacity: isHighlighter ? 0.35 : (el.opacity ?? 1),
    });
  }
}

/**
 * Draw Embedded Image / Signature onto PDF
 */
async function drawImageElement(
  pdfDoc: PDFDocument,
  page: PDFPage,
  el: ImageElement,
  pageHeight: number
) {
  if (!el.src) return;

  const pdfX = el.x;
  const pdfY = pageHeight - el.y - el.height;
  const imageBytes = dataUriToUint8Array(el.src);

  let embeddedImage;
  if (el.src.startsWith('data:image/png') || el.src.includes('image/png')) {
    embeddedImage = await pdfDoc.embedPng(imageBytes);
  } else {
    try {
      embeddedImage = await pdfDoc.embedJpg(imageBytes);
    } catch {
      embeddedImage = await pdfDoc.embedPng(imageBytes);
    }
  }

  page.drawImage(embeddedImage, {
    x: pdfX,
    y: pdfY,
    width: Math.max(1, el.width),
    height: Math.max(1, el.height),
    opacity: el.opacity ?? 1,
  });
}
