import * as pdfjsLib from 'pdfjs-dist';
import { SheetData } from '../types';

export interface DocumentStructuredContent {
  fileName: string;
  totalPages: number;
  pages: {
    pageNumber: number;
    text: string;
    paragraphs: string[];
    tables?: SheetData[];
  }[];
}

/**
 * Extract full clean text and structured content from PDF document
 */
export async function extractDocumentContent(
  pdfDoc: pdfjsLib.PDFDocumentProxy
): Promise<DocumentStructuredContent> {
  const pages: DocumentStructuredContent['pages'] = [];

  for (let p = 1; p <= pdfDoc.numPages; p++) {
    const page = await pdfDoc.getPage(p);
    const textContent = await page.getTextContent();
    
    // Group text items by vertical position into lines
    const lineMap = new Map<number, string[]>();
    for (const item of textContent.items) {
      if ('str' in item && item.str.trim()) {
        const y = Math.round(item.transform[5] / 8) * 8; // Snap to 8px line height
        const existing = lineMap.get(y) || [];
        existing.push(item.str);
        lineMap.set(y, existing);
      }
    }

    // Sort lines top to bottom (PDF y is bottom-up)
    const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a);
    const lines = sortedY.map((y) => (lineMap.get(y) || []).join(' '));
    const fullText = lines.join('\n');

    // Group into paragraphs by blank lines or length
    const paragraphs: string[] = [];
    let currentPara: string[] = [];

    for (const line of lines) {
      if (!line.trim()) {
        if (currentPara.length > 0) {
          paragraphs.push(currentPara.join(' '));
          currentPara = [];
        }
      } else {
        currentPara.push(line.trim());
      }
    }
    if (currentPara.length > 0) {
      paragraphs.push(currentPara.join(' '));
    }

    pages.push({
      pageNumber: p,
      text: fullText,
      paragraphs: paragraphs.length > 0 ? paragraphs : [fullText],
    });
  }

  return {
    fileName: 'Document',
    totalPages: pdfDoc.numPages,
    pages,
  };
}

/**
 * Export Document to Text (.txt) file
 */
export function exportToTextFile(
  content: DocumentStructuredContent,
  fileName: string = 'Converted_Document.txt'
) {
  const fullText = content.pages
    .map((p) => `--- PAGE ${p.pageNumber} OF ${content.totalPages} ---\n\n${p.text}`)
    .join('\n\n\n');

  const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName.endsWith('.txt') ? fileName : `${fileName}.txt`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export Document to clean standalone HTML (.html) file
 */
export function exportToHtmlDocument(
  content: DocumentStructuredContent,
  sheets: SheetData[] = [],
  fileName: string = 'Converted_Document.html'
) {
  const title = fileName.replace(/\.html$/i, '');
  
  const pagesHtml = content.pages
    .map((p) => {
      const pageSheets = sheets.filter((s) => s.pageNumber === p.pageNumber);
      const tablesHtml = pageSheets
        .map(
          (s) => `
        <div class="table-container">
          <h4>${s.name}</h4>
          <table>
            <thead>
              <tr>${s.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${s.rows
                .map(
                  (r) =>
                    `<tr>${s.headers.map((_, i) => `<td>${escapeHtml(r[i] || '')}</td>`).join('')}</tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>`
        )
        .join('');

      const paragraphsHtml = p.paragraphs
        .map((para) => `<p>${escapeHtml(para)}</p>`)
        .join('');

      return `
      <section class="document-page">
        <div class="page-header">Page ${p.pageNumber} of ${content.totalPages}</div>
        <div class="page-body">
          ${tablesHtml || paragraphsHtml}
        </div>
      </section>`;
    })
    .join('');

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --text: #0f172a;
      --muted: #64748b;
      --border: #e2e8f0;
      --primary: #10b981;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #090d16;
        --card-bg: #111827;
        --text: #f8fafc;
        --muted: #94a3b8;
        --border: #1f2937;
        --primary: #34d399;
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
      color: var(--text);
      background-color: var(--bg);
      margin: 0;
      padding: 2rem 1rem;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    header {
      margin-bottom: 2rem;
      border-bottom: 2px solid var(--border);
      padding-bottom: 1rem;
    }
    h1 { margin: 0 0 0.5rem; font-size: 1.75rem; }
    .meta { font-size: 0.875rem; color: var(--muted); }
    .document-page {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .page-header {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted);
      margin-bottom: 1.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px dashed var(--border);
    }
    p { margin: 0 0 1rem; }
    .table-container {
      margin: 1.5rem 0;
      overflow-x: auto;
    }
    h4 { margin: 0 0 0.5rem; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    th, td {
      border: 1px solid var(--border);
      padding: 0.5rem 0.75rem;
      text-align: left;
    }
    th {
      background: rgba(16, 185, 129, 0.1);
      font-weight: 600;
    }
    tr:nth-child(even) { background: rgba(0, 0, 0, 0.02); }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${escapeHtml(title)}</h1>
      <div class="meta">Converted by TabulaPDF • ${content.totalPages} Pages</div>
    </header>
    <main>
      ${pagesHtml}
    </main>
  </div>
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName.endsWith('.html') ? fileName : `${fileName}.html`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export Document to structured XML (.xml) file
 */
export function exportToXmlFile(
  content: DocumentStructuredContent,
  sheets: SheetData[] = [],
  fileName: string = 'Converted_Document.xml'
) {
  const pagesXml = content.pages
    .map((p) => {
      const pageSheets = sheets.filter((s) => s.pageNumber === p.pageNumber);
      const tablesXml = pageSheets
        .map(
          (s) => `
    <table name="${escapeXml(s.name)}">
      <headers>
        ${s.headers.map((h) => `<column>${escapeXml(h)}</column>`).join('')}
      </headers>
      <rows>
        ${s.rows
          .map(
            (r) => `
        <row>
          ${s.headers.map((h, i) => `<cell column="${escapeXml(h)}">${escapeXml(r[i] || '')}</cell>`).join('')}
        </row>`
          )
          .join('')}
      </rows>
    </table>`
        )
        .join('');

      return `
  <page number="${p.pageNumber}">
    <text>${escapeXml(p.text)}</text>${tablesXml}
  </page>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<document pages="${content.totalPages}" generator="TabulaPDF">
  ${pagesXml}
</document>`;

  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName.endsWith('.xml') ? fileName : `${fileName}.xml`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeHtml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeXml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
