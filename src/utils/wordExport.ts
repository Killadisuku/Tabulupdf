import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
} from 'docx';
import { SheetData } from '../types';

export interface ExtractedParagraph {
  text: string;
  isHeading?: boolean;
  headingLevel?: number;
  isListItem?: boolean;
  align?: 'left' | 'center' | 'right';
}

/**
 * Generate an editable Microsoft Word (.docx) document from extracted text and sheets/tables
 */
export async function exportToWordDocx(
  fileName: string,
  data: {
    title?: string;
    paragraphs?: ExtractedParagraph[];
    sheets?: SheetData[];
    rawText?: string;
  }
): Promise<Blob> {
  const children: (Paragraph | Table)[] = [];

  // Title
  if (data.title) {
    children.push(
      new Paragraph({
        text: data.title,
        heading: HeadingLevel.TITLE,
        spacing: { after: 300 },
      })
    );
  }

  // If structured sheets / tables are provided
  if (data.sheets && data.sheets.length > 0) {
    for (const sheet of data.sheets) {
      if (sheet.name) {
        children.push(
          new Paragraph({
            text: sheet.name,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
          })
        );
      }

      if (sheet.rows.length > 0 || sheet.headers.length > 0) {
        const tableRows: TableRow[] = [];

        // Header Row
        if (sheet.headers && sheet.headers.length > 0) {
          tableRows.push(
            new TableRow({
              tableHeader: true,
              children: sheet.headers.map(
                (h) =>
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: h, bold: true, color: 'FFFFFF' })],
                        alignment: AlignmentType.LEFT,
                      }),
                    ],
                    shading: { fill: '1E293B' },
                    margins: { top: 120, bottom: 120, left: 140, right: 140 },
                  })
              ),
            })
          );
        }

        // Data Rows
        sheet.rows.forEach((row, rIdx) => {
          tableRows.push(
            new TableRow({
              children: sheet.headers.map((_, cIdx) => {
                const cellText = row[cIdx] ?? '';
                return new TableCell({
                  children: [
                    new Paragraph({
                      text: cellText,
                      alignment: AlignmentType.LEFT,
                    }),
                  ],
                  shading: rIdx % 2 === 1 ? { fill: 'F8FAFC' } : undefined,
                  margins: { top: 100, bottom: 100, left: 140, right: 140 },
                });
              }),
            })
          );
        });

        const docxTable = new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
            left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
            right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
            insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
          },
        });

        children.push(docxTable);
        children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
      }
    }
  }

  // If structured paragraphs provided
  if (data.paragraphs && data.paragraphs.length > 0) {
    for (const p of data.paragraphs) {
      if (p.isHeading) {
        children.push(
          new Paragraph({
            text: p.text,
            heading: p.headingLevel === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          })
        );
      } else {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: p.text })],
            spacing: { after: 120 },
            bullet: p.isListItem ? { level: 0 } : undefined,
          })
        );
      }
    }
  } else if (data.rawText && (!data.sheets || data.sheets.length === 0)) {
    // Fallback: parse raw lines
    const lines = data.rawText.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        children.push(new Paragraph({ text: '', spacing: { after: 80 } }));
        continue;
      }

      if (trimmed.length < 50 && (trimmed.toUpperCase() === trimmed || /^[A-Z0-9\s:.-]+$/.test(trimmed))) {
        children.push(
          new Paragraph({
            text: trimmed,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 180, after: 80 },
          })
        );
      } else if (/^[-*•]\s+/.test(trimmed)) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: trimmed.replace(/^[-*•]\s+/, '') })],
            bullet: { level: 0 },
            spacing: { after: 80 },
          })
        );
      } else {
        children.push(
          new Paragraph({
            text: trimmed,
            spacing: { after: 100 },
          })
        );
      }
    }
  }

  // Create docx document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children.length > 0 ? children : [new Paragraph({ text: 'Converted Document' })],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Trigger download of Word Docx file
 */
export async function downloadWordDocx(
  fileName: string,
  data: {
    title?: string;
    paragraphs?: ExtractedParagraph[];
    sheets?: SheetData[];
    rawText?: string;
  }
) {
  const blob = await exportToWordDocx(fileName, data);
  const safeName = fileName.endsWith('.docx') ? fileName : `${fileName}.docx`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', safeName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
