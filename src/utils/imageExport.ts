import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';

export interface ImageExportOptions {
  format: 'png' | 'jpeg';
  quality: number; // 0.1 to 1.0 for jpeg
  scale: number; // 1.0 = standard, 2.0 = high-res / retina, 3.0 = print 300dpi
  pageIndices?: number[];
  onProgress?: (current: number, total: number) => void;
}

/**
 * Render a single PDF page to an Image Data URL or Blob
 */
export async function renderPageToImageBlob(
  page: pdfjsLib.PDFPageProxy,
  options: { format: 'png' | 'jpeg'; quality: number; scale: number }
): Promise<Blob> {
  const viewport = page.getViewport({ scale: options.scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create canvas context');

  // Fill white background for JPEGs
  if (options.format === 'jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const renderContext: any = {
    canvasContext: ctx,
    viewport: viewport,
  };

  await page.render(renderContext).promise;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      },
      options.format === 'jpeg' ? 'image/jpeg' : 'image/png',
      options.quality
    );
  });
}

/**
 * Convert PDF pages to images and package into a ZIP file or download single image
 */
export async function exportPdfToImages(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  baseFileName: string,
  options: ImageExportOptions
): Promise<void> {
  const totalPages = pdfDoc.numPages;
  const targetIndices = options.pageIndices && options.pageIndices.length > 0
    ? options.pageIndices.filter((idx) => idx >= 0 && idx < totalPages)
    : Array.from({ length: totalPages }, (_, i) => i);

  const cleanBase = baseFileName.replace(/\.pdf$/i, '');
  const ext = options.format === 'jpeg' ? 'jpg' : 'png';

  // If only 1 page selected, download directly as single image
  if (targetIndices.length === 1) {
    const pageNum = targetIndices[0] + 1;
    const page = await pdfDoc.getPage(pageNum);
    const blob = await renderPageToImageBlob(page, {
      format: options.format,
      quality: options.quality,
      scale: options.scale,
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${cleanBase}_page_${pageNum}.${ext}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  // Multiple pages -> Package into ZIP
  const zip = new JSZip();
  let doneCount = 0;

  for (const pageIdx of targetIndices) {
    const pageNum = pageIdx + 1;
    const page = await pdfDoc.getPage(pageNum);
    const blob = await renderPageToImageBlob(page, {
      format: options.format,
      quality: options.quality,
      scale: options.scale,
    });

    const paddedNum = String(pageNum).padStart(3, '0');
    zip.file(`${cleanBase}_page_${paddedNum}.${ext}`, blob);

    doneCount++;
    if (options.onProgress) {
      options.onProgress(doneCount, targetIndices.length);
    }
  }

  const zipContent = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipContent);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${cleanBase}_images.zip`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
