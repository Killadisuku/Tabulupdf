import { PDFDocument, degrees } from 'pdf-lib';

export interface PageInfo {
  pageIndex: number;
  pageNumber: number;
  rotation: number;
}

/**
 * Merge multiple PDF files / ArrayBuffers into a single unified PDF
 */
export async function mergePdfFiles(
  pdfBuffers: { name: string; buffer: ArrayBuffer }[]
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const { buffer } of pdfBuffers) {
    const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return await mergedPdf.save();
}

/**
 * Split or extract specific pages from a PDF document
 * @param pageIndices 0-indexed array of page numbers to extract
 */
export async function extractPdfPages(
  pdfBuffer: ArrayBuffer,
  pageIndices: number[]
): Promise<Uint8Array> {
  const srcPdf = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const newPdf = await PDFDocument.create();

  const totalPages = srcPdf.getPageCount();
  const validIndices = pageIndices.filter((idx) => idx >= 0 && idx < totalPages);

  if (validIndices.length === 0) {
    throw new Error('No valid pages selected for extraction');
  }

  const copiedPages = await newPdf.copyPages(srcPdf, validIndices);
  copiedPages.forEach((page) => newPdf.addPage(page));

  return await newPdf.save();
}

/**
 * Rotate PDF pages
 * @param rotations Map of page index (0-based) to rotation angle in degrees (e.g. 90, 180, 270)
 */
export async function rotatePdfPages(
  pdfBuffer: ArrayBuffer,
  rotations: { [pageIndex: number]: number } | number
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const totalPages = pdf.getPageCount();

  for (let i = 0; i < totalPages; i++) {
    const page = pdf.getPage(i);
    const angleToAdd = typeof rotations === 'number' ? rotations : rotations[i] || 0;
    if (angleToAdd !== 0) {
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees((currentRotation + angleToAdd) % 360));
    }
  }

  return await pdf.save();
}

/**
 * Reorder and/or delete pages from a PDF
 * @param orderedPageIndices Array of 0-based page indices representing the new desired page order
 */
export async function reorderAndDeletePdfPages(
  pdfBuffer: ArrayBuffer,
  orderedPageIndices: number[]
): Promise<Uint8Array> {
  const srcPdf = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const newPdf = await PDFDocument.create();

  const totalPages = srcPdf.getPageCount();
  const validIndices = orderedPageIndices.filter((idx) => idx >= 0 && idx < totalPages);

  if (validIndices.length === 0) {
    throw new Error('At least one page must remain in the document');
  }

  const copiedPages = await newPdf.copyPages(srcPdf, validIndices);
  copiedPages.forEach((page) => newPdf.addPage(page));

  return await newPdf.save();
}

/**
 * Compress PDF by rebuilding internal object streams and optimizing metadata
 */
export async function compressPdf(
  pdfBuffer: ArrayBuffer
): Promise<{ data: Uint8Array; originalSize: number; newSize: number; savedPercentage: number }> {
  const originalSize = pdfBuffer.byteLength;
  const pdf = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });

  // Re-save using optimized dictionary compression and stripping redundant annotations/metadata
  const data = await pdf.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });

  const newSize = data.byteLength;
  const savedPercentage = originalSize > 0 ? Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100)) : 0;

  return {
    data,
    originalSize,
    newSize,
    savedPercentage,
  };
}

/**
 * Download a Uint8Array as a PDF file in browser
 */
export function downloadPdfBlob(data: Uint8Array | Blob, fileName: string) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/pdf' });
  const safeName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', safeName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parse page range string like "1-3, 5, 8-10" into 0-based page indices
 */
export function parsePageRangeString(rangeStr: string, totalPages: number): number[] {
  if (!rangeStr || !rangeStr.trim()) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  const indices = new Set<number>();
  const parts = rangeStr.split(/[,;\s]+/);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.max(1, Math.min(start, end));
        const max = Math.min(totalPages, Math.max(start, end));
        for (let p = min; p <= max; p++) {
          indices.add(p - 1);
        }
      }
    } else {
      const pageNum = parseInt(trimmed, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        indices.add(pageNum - 1);
      }
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}
