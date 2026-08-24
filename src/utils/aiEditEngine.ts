import {
  PageEditData,
  TextElement,
  TableElement,
  WhiteoutElement,
  PdfEditorElement
} from '../types/editor';
import { PdfTextItem } from './pdfParser';

export interface AiEditAction {
  id: string;
  type:
    | 'replace_text'
    | 'delete_text'
    | 'update_table_cell'
    | 'add_table_row'
    | 'delete_table_row'
    | 'add_table_col'
    | 'delete_table_col'
    | 'delete_element'
    | 'replace_image';
  description: string;
  fieldLabel?: string;
  pageNumber: number;
  targetText?: string;
  replacementText?: string;
  tableId?: string;
  rowIndex?: number;
  colIndex?: number;
  colHeader?: string;
  rowMatchText?: string;
  oldValue?: string;
  newValue?: string;
  newRowValues?: string[];
  newColHeader?: string;
  elementId?: string;
  elementType?: string;
  selected?: boolean;
  highlightBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface AmbiguityChoice {
  label: string;
  oldValue: string;
  targetText: string;
  pageNumber: number;
  replacementText: string;
}

export interface AiHighlightBox {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  actionType: 'replace' | 'delete' | 'add' | 'update';
}

export interface AiEditPlanResult {
  success: boolean;
  found: boolean;
  notFoundMessage?: string;
  isSuggestion?: boolean;
  suggestionMessage?: string;
  explanation?: string;
  isAmbiguous?: boolean;
  ambiguityMessage?: string;
  ambiguityChoices?: AmbiguityChoice[];
  occurrencesCount?: number;
  changesSummary: string;
  edits: AiEditAction[];
  highlightBoxes: AiHighlightBox[];
}

export interface AiEditHistoryEntry {
  id: string;
  timestamp: Date;
  prompt: string;
  summary: string;
  editsCount: number;
  pagesSnapshot: PageEditData[];
}

/**
 * Helper to detect key-value pairs (e.g. Date: 20-08-2026, Purchaser: ..., PO NO: ...)
 */
function extractDetectedKeyValues(textItems: PdfTextItem[]): { label: string; value: string; fullText: string }[] {
  const pairs: { label: string; value: string; fullText: string }[] = [];
  const fullText = textItems.map((t) => t.str).join(' ');

  const patterns = [
    { label: 'Date', regex: /(?:Date|Date\s+of\s+Issue|Certificate\s+Date|Inv(?:oice)?\s+Date)\s*[:\-]?\s*([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{2,4}|[0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{2,4})/i },
    { label: 'PO No', regex: /(?:PO\s*(?:NO|Number|#)?|P\.O\.\s*No)\s*[:\-]?\s*([A-Za-z0-9\-_/]+)/i },
    { label: 'TC No', regex: /(?:TC\s*(?:NO|Number|#)?|Test\s+Certificate\s+No)\s*[:\-]?\s*([A-Za-z0-9\-_/]+)/i },
    { label: 'Purchaser', regex: /(?:Purchaser|Customer|Buyer|Billed\s+To|Client)\s*[:\-]?\s*([A-Za-z0-9\s.,&'\-]{3,50})(?=\s*(?:Date|PO|TC|Tel|Phone|Email|Address|QTY|\n|$))/i },
    { label: 'Quantity', regex: /(?:QTY|Quantity)\s*[:\-]?\s*([0-9]+\s*(?:NOS|PCS|UNITS|SETS|KG|MTR)?)/i },
    { label: 'Phone', regex: /(?:Phone|Tel|Mobile|Contact)\s*[:\-]?\s*(\+?[0-9\s\-()]{7,20})/i },
    { label: 'Email', regex: /(?:Email|E-mail)\s*[:\-]?\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/i },
  ];

  for (const item of textItems) {
    for (const p of patterns) {
      const m = item.str.match(p.regex);
      if (m && m[1]) {
        pairs.push({ label: p.label, value: m[1].trim(), fullText: item.str });
      }
    }
  }

  // Also check cross-item concatenation
  if (pairs.length < 2) {
    for (const p of patterns) {
      const m = fullText.match(p.regex);
      if (m && m[1] && !pairs.some((x) => x.label === p.label)) {
        pairs.push({ label: p.label, value: m[1].trim(), fullText: m[0] });
      }
    }
  }

  return pairs;
}

/**
 * Gather complete document context (text items, detected key-values, tables, and elements) for Gemini reasoning
 */
export function buildDocumentContext(
  pages: PageEditData[],
  allPageTextItems: Map<number, PdfTextItem[]>
) {
  return pages
    .filter((p) => !p.isDeleted)
    .map((page) => {
      const rawTextItems = allPageTextItems.get(page.pageNumber) || [];
      const textItems = rawTextItems.slice(0, 180).map((it) => ({
        text: it.str,
        x: Math.round(it.x),
        y: Math.round(it.y),
        width: Math.round(it.width),
        height: Math.round(it.height),
      }));

      const detectedKeyValues = extractDetectedKeyValues(rawTextItems);

      const tables = page.elements
        .filter((el) => el.type === 'table')
        .map((tbl) => {
          const t = tbl as TableElement;
          return {
            id: t.id,
            headers: t.headers,
            rows: t.rows,
            isNativePdfTable: t.isNativePdfTable,
            x: Math.round(t.x),
            y: Math.round(t.y),
            width: Math.round(t.width),
            height: Math.round(t.height),
          };
        });

      const otherElements = page.elements
        .filter((el) => el.type !== 'table')
        .map((el) => ({
          id: el.id,
          type: el.type,
          text: el.type === 'text' ? (el as TextElement).text : undefined,
          isSignature: el.type === 'image' ? (el as any).isSignature : undefined,
          x: Math.round(el.x),
          y: Math.round(el.y),
          width: Math.round(el.width),
          height: Math.round(el.height),
        }));

      return {
        pageNumber: page.pageNumber,
        detectedKeyValues,
        textItems,
        tables,
        otherElements,
      };
    });
}

/**
 * Execute AI Edit Analysis via Server-Side Gemini API
 */
export async function analyzeAiEditInstruction(
  instruction: string,
  activePageNumber: number,
  pages: PageEditData[],
  allPageTextItems: Map<number, PdfTextItem[]>
): Promise<AiEditPlanResult> {
  const documentContext = buildDocumentContext(pages, allPageTextItems);
  const currentDate = new Date().toISOString().split('T')[0];

  try {
    const response = await fetch('/api/ai-edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instruction,
        activePageNumber,
        totalPages: pages.filter((p) => !p.isDeleted).length,
        documentContext,
        currentDate,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to analyze AI edit request.');
    }

    if (!data.found && !data.isSuggestion) {
      return {
        success: true,
        found: false,
        notFoundMessage:
          data.notFoundMessage || `I couldn't identify the requested field or content in this PDF.`,
        changesSummary: 'Content not found',
        edits: [],
        highlightBoxes: [],
      };
    }

    // Resolve and enrich bounding boxes for visual preview highlights
    const enrichedEdits: AiEditAction[] = (data.edits || []).map((edit: any, idx: number) => {
      const editId = `edit-${Date.now()}-${idx}`;
      let highlightBox = edit.highlightBox;

      const pageNum = edit.pageNumber || activePageNumber;
      const pageTextItems = allPageTextItems.get(pageNum) || [];
      const targetPage = pages.find((p) => p.pageNumber === pageNum);

      // If text replacement or deletion, compute exact bounding box from text items
      if (
        (!highlightBox || highlightBox.width === 0) &&
        (edit.type === 'replace_text' || edit.type === 'delete_text') &&
        edit.targetText
      ) {
        const targetClean = edit.targetText.trim().toLowerCase();

        // 1. Check existing TextElements on canvas
        const matchedElement = targetPage?.elements.find(
          (el) =>
            el.type === 'text' &&
            ((el as TextElement).text?.toLowerCase().includes(targetClean) ||
              (el as TextElement).originalText?.toLowerCase().includes(targetClean))
        );

        if (matchedElement) {
          highlightBox = {
            x: matchedElement.x - 2,
            y: matchedElement.y - 2,
            width: matchedElement.width + 4,
            height: matchedElement.height + 4,
          };
        } else {
          // 2. Check native PDF text items
          // Look for exact substring match
          const matchingItems = pageTextItems.filter((it) =>
            it.str.toLowerCase().includes(targetClean)
          );

          if (matchingItems.length > 0) {
            const firstItem = matchingItems[0];
            const strLower = firstItem.str.toLowerCase();
            const subIdx = strLower.indexOf(targetClean);

            if (subIdx >= 0 && firstItem.str.length > targetClean.length) {
              // Precise sub-box offset calculation
              const charWidth = firstItem.width / Math.max(1, firstItem.str.length);
              const subX = firstItem.x + subIdx * charWidth;
              const subW = Math.max(20, targetClean.length * charWidth);

              highlightBox = {
                x: subX - 2,
                y: firstItem.y - 2,
                width: subW + 4,
                height: Math.max(14, firstItem.height + 4),
              };
            } else {
              const minX = Math.min(...matchingItems.map((it) => it.x));
              const minY = Math.min(...matchingItems.map((it) => it.y));
              const maxX = Math.max(...matchingItems.map((it) => it.x + it.width));
              const maxY = Math.max(...matchingItems.map((it) => it.y + it.height));

              highlightBox = {
                x: minX - 2,
                y: minY - 2,
                width: Math.max(20, maxX - minX + 4),
                height: Math.max(14, maxY - minY + 4),
              };
            }
          }
        }
      }

      // If table cell or row edit, compute table bounding box
      if (
        (!highlightBox || highlightBox.width === 0) &&
        edit.tableId &&
        targetPage
      ) {
        const table = targetPage.elements.find(
          (el) => el.id === edit.tableId && el.type === 'table'
        ) as TableElement | undefined;

        if (table) {
          if (edit.type === 'update_table_cell' && edit.rowIndex !== undefined) {
            const rHeight = table.rowHeights?.[edit.rowIndex] || table.height / Math.max(1, table.rows.length + 1);
            const numCols = Math.max(1, table.headers.length || table.rows[0]?.length || 1);
            const colWidths = table.colWidths || new Array(numCols).fill(table.width / numCols);
            const cIdx = edit.colIndex !== undefined ? edit.colIndex : 0;
            const cWidth = colWidths[cIdx] || table.width / numCols;
            const cellX = table.x + colWidths.slice(0, cIdx).reduce((a, b) => a + b, 0);
            const headerOffset = table.headers.length > 0 ? (table.headerHeight || 20) : 0;
            const rowOffset = (table.rowHeights?.slice(0, edit.rowIndex).reduce((a, b) => a + b, 0)) ?? (edit.rowIndex * rHeight);

            highlightBox = {
              x: cellX - 1,
              y: table.y + headerOffset + rowOffset - 1,
              width: cWidth + 2,
              height: rHeight + 2,
            };
          } else if ((edit.type === 'delete_table_row' || edit.type === 'add_table_row') && edit.rowIndex !== undefined) {
            const rHeight = table.rowHeights?.[edit.rowIndex] || 20;
            const headerOffset = table.headers.length > 0 ? (table.headerHeight || 20) : 0;
            const rowOffset = (table.rowHeights?.slice(0, edit.rowIndex).reduce((a, b) => a + b, 0)) ?? (edit.rowIndex * rHeight);

            highlightBox = {
              x: table.x - 2,
              y: table.y + headerOffset + rowOffset - 2,
              width: table.width + 4,
              height: rHeight + 4,
            };
          } else {
            highlightBox = {
              x: table.x - 2,
              y: table.y - 2,
              width: table.width + 4,
              height: table.height + 4,
            };
          }
        }
      }

      return {
        ...edit,
        id: editId,
        selected: true,
        highlightBox,
      };
    });

    // Generate highlight boxes for visual canvas rendering
    const highlightBoxes: AiHighlightBox[] = enrichedEdits
      .filter((e) => e.highlightBox)
      .map((e) => {
        let actionType: 'replace' | 'delete' | 'add' | 'update' = 'replace';
        if (e.type.startsWith('delete')) actionType = 'delete';
        else if (e.type.startsWith('add')) actionType = 'add';
        else if (e.type.startsWith('update')) actionType = 'update';

        let label = e.fieldLabel || e.description;
        if (e.type === 'replace_text' && e.targetText && e.replacementText) {
          label = `${e.fieldLabel ? `${e.fieldLabel}: ` : ''}${e.targetText} → ${e.replacementText}`;
        } else if (e.type === 'update_table_cell' && e.oldValue && e.newValue) {
          label = `${e.oldValue} → ${e.newValue}`;
        }

        return {
          id: `hl-${e.id}`,
          pageNumber: e.pageNumber,
          x: e.highlightBox!.x,
          y: e.highlightBox!.y,
          width: e.highlightBox!.width,
          height: e.highlightBox!.height,
          label,
          actionType,
        };
      });

    return {
      success: true,
      found: data.found ?? true,
      isSuggestion: data.isSuggestion ?? false,
      suggestionMessage: data.suggestionMessage,
      explanation: data.explanation || (enrichedEdits[0] ? `Identified ${enrichedEdits[0].fieldLabel || 'field'} on page ${enrichedEdits[0].pageNumber}.` : undefined),
      isAmbiguous: data.isAmbiguous ?? false,
      ambiguityMessage: data.ambiguityMessage,
      ambiguityChoices: data.ambiguityChoices || [],
      occurrencesCount: data.occurrencesCount || enrichedEdits.length,
      changesSummary: data.changesSummary || `Planned ${enrichedEdits.length} modification(s)`,
      edits: enrichedEdits,
      highlightBoxes,
    };
  } catch (error: any) {
    console.warn('AI Edit API call error, falling back to smart local matching:', error);
    return executeLocalSmartAiFallback(instruction, activePageNumber, pages, allPageTextItems);
  }
}

/**
 * Intelligent Local Semantic Matching Engine for instant offline/direct commands
 */
function executeLocalSmartAiFallback(
  instruction: string,
  activePageNumber: number,
  pages: PageEditData[],
  allPageTextItems: Map<number, PdfTextItem[]>
): AiEditPlanResult {
  const lower = instruction.toLowerCase().trim();
  const pageItems = allPageTextItems.get(activePageNumber) || [];
  const targetPage = pages.find((p) => p.pageNumber === activePageNumber);

  // Helper to parse relative date keywords
  const resolveDateValue = (raw: string): string => {
    const today = new Date();
    if (raw.includes('today')) {
      return `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
    }
    if (raw.includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return `${String(tomorrow.getDate()).padStart(2, '0')}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${tomorrow.getFullYear()}`;
    }
    return raw.replace(/^to\s+/i, '').trim();
  };

  // 1. DATE SEMANTIC INTENT (e.g. "Change the date to 30/08/2026", "Update certificate date to 30 August 2026")
  const dateIntentMatch =
    instruction.match(/(?:change|update|set|replace)\s+(?:the\s+)?(?:certificate\s+|issue\s+|expiry\s+)?date\s+to\s+([^\n\r]+)/i) ||
    instruction.match(/date\s*[:=]\s*([^\n\r]+)/i);

  if (dateIntentMatch) {
    const rawNewDate = dateIntentMatch[1].trim();
    const newDate = resolveDateValue(rawNewDate);

    // Find date candidates in the document text
    const dateRegex = /\b([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{2,4}|[0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{2,4})\b/;
    const foundDateItems: { item: PdfTextItem; val: string; label: string }[] = [];

    for (const it of pageItems) {
      const m = it.str.match(dateRegex);
      if (m && m[1]) {
        let label = 'Date';
        if (/issue/i.test(it.str)) label = 'Issue Date';
        else if (/expiry/i.test(it.str)) label = 'Expiry Date';
        else if (/cert/i.test(it.str)) label = 'Certificate Date';
        else if (/po/i.test(it.str)) label = 'PO Date';

        foundDateItems.push({ item: it, val: m[1], label });
      }
    }

    if (foundDateItems.length === 1) {
      const target = foundDateItems[0];
      const edit: AiEditAction = {
        id: `edit-${Date.now()}`,
        type: 'replace_text',
        description: `Change ${target.label} "${target.val}" to "${newDate}"`,
        fieldLabel: target.label,
        pageNumber: activePageNumber,
        targetText: target.val,
        replacementText: newDate,
        oldValue: target.val,
        newValue: newDate,
        selected: true,
        highlightBox: {
          x: target.item.x - 2,
          y: target.item.y - 2,
          width: target.item.width + 4,
          height: target.item.height + 4,
        },
      };

      return {
        success: true,
        found: true,
        explanation: `I found the ${target.label} field on page ${activePageNumber}.\nCurrent value: ${target.val}\nNew value: ${newDate}`,
        changesSummary: `${target.label}: ${target.val} → ${newDate}`,
        edits: [edit],
        highlightBoxes: [
          {
            id: `hl-${edit.id}`,
            pageNumber: activePageNumber,
            x: target.item.x - 2,
            y: target.item.y - 2,
            width: target.item.width + 4,
            height: target.item.height + 4,
            label: `${target.val} → ${newDate}`,
            actionType: 'replace',
          },
        ],
      };
    } else if (foundDateItems.length > 1) {
      // Multiple dates found -> Offer ambiguity selection
      const choices: AmbiguityChoice[] = foundDateItems.map((d) => ({
        label: d.label,
        oldValue: d.val,
        targetText: d.val,
        pageNumber: activePageNumber,
        replacementText: newDate,
      }));

      // Default to primary date for preview
      const primary = foundDateItems[0];
      const edit: AiEditAction = {
        id: `edit-${Date.now()}`,
        type: 'replace_text',
        description: `Change ${primary.label} "${primary.val}" to "${newDate}"`,
        fieldLabel: primary.label,
        pageNumber: activePageNumber,
        targetText: primary.val,
        replacementText: newDate,
        oldValue: primary.val,
        newValue: newDate,
        selected: true,
        highlightBox: {
          x: primary.item.x - 2,
          y: primary.item.y - 2,
          width: primary.item.width + 4,
          height: primary.item.height + 4,
        },
      };

      return {
        success: true,
        found: true,
        isAmbiguous: true,
        ambiguityMessage: `I found ${foundDateItems.length} dates in this document. Which one should I change?`,
        ambiguityChoices: choices,
        explanation: `Multiple dates found on page ${activePageNumber}. Please select which date to update.`,
        changesSummary: `Change date to ${newDate}`,
        edits: [edit],
        highlightBoxes: [
          {
            id: `hl-${edit.id}`,
            pageNumber: activePageNumber,
            x: primary.item.x - 2,
            y: primary.item.y - 2,
            width: primary.item.width + 4,
            height: primary.item.height + 4,
            label: `${primary.val} → ${newDate}`,
            actionType: 'replace',
          },
        ],
      };
    }
  }

  // 2. PO NUMBER / TC NUMBER / PURCHASER / PHONE SEMANTIC INTENT
  const poMatch = instruction.match(/(?:change|update|set|replace)\s+(?:the\s+)?po\s*(?:number|no|#)?\s+to\s+([A-Za-z0-9\-_/]+)/i);
  if (poMatch) {
    const newPO = poMatch[1].trim();
    const poItem = pageItems.find((it) => /po\s*(?:no|number|#)?/i.test(it.str));
    if (poItem) {
      const valMatch = poItem.str.match(/po\s*(?:no|number|#)?[:\-]?\s*([A-Za-z0-9\-_/]+)/i);
      const oldPO = valMatch ? valMatch[1] : poItem.str;
      const edit: AiEditAction = {
        id: `edit-${Date.now()}`,
        type: 'replace_text',
        description: `Change PO Number "${oldPO}" to "${newPO}"`,
        fieldLabel: 'PO NO',
        pageNumber: activePageNumber,
        targetText: oldPO,
        replacementText: newPO,
        selected: true,
        highlightBox: { x: poItem.x, y: poItem.y, width: poItem.width, height: poItem.height },
      };
      return {
        success: true,
        found: true,
        explanation: `I found PO NO on page ${activePageNumber}.\nCurrent value: ${oldPO}\nNew value: ${newPO}`,
        changesSummary: `PO NO: ${oldPO} → ${newPO}`,
        edits: [edit],
        highlightBoxes: [{ id: `hl-${edit.id}`, pageNumber: activePageNumber, x: poItem.x, y: poItem.y, width: poItem.width, height: poItem.height, label: `${oldPO} → ${newPO}`, actionType: 'replace' }],
      };
    }
  }

  const tcMatch = instruction.match(/(?:change|update|set|replace)\s+(?:the\s+)?tc\s*(?:number|no|#)?\s+to\s+([A-Za-z0-9\-_/]+)/i);
  if (tcMatch) {
    const newTC = tcMatch[1].trim();
    const tcItem = pageItems.find((it) => /tc\s*(?:no|number|#)?/i.test(it.str));
    if (tcItem) {
      const valMatch = tcItem.str.match(/tc\s*(?:no|number|#)?[:\-]?\s*([A-Za-z0-9\-_/]+)/i);
      const oldTC = valMatch ? valMatch[1] : tcItem.str;
      const edit: AiEditAction = {
        id: `edit-${Date.now()}`,
        type: 'replace_text',
        description: `Change TC Number "${oldTC}" to "${newTC}"`,
        fieldLabel: 'TC No',
        pageNumber: activePageNumber,
        targetText: oldTC,
        replacementText: newTC,
        selected: true,
        highlightBox: { x: tcItem.x, y: tcItem.y, width: tcItem.width, height: tcItem.height },
      };
      return {
        success: true,
        found: true,
        explanation: `I found TC No on page ${activePageNumber}.\nCurrent value: ${oldTC}\nNew value: ${newTC}`,
        changesSummary: `TC No: ${oldTC} → ${newTC}`,
        edits: [edit],
        highlightBoxes: [{ id: `hl-${edit.id}`, pageNumber: activePageNumber, x: tcItem.x, y: tcItem.y, width: tcItem.width, height: tcItem.height, label: `${oldTC} → ${newTC}`, actionType: 'replace' }],
      };
    }
  }

  const purchaserMatch = instruction.match(/(?:change|update|set|replace)\s+(?:the\s+)?(?:purchaser|customer|company|buyer)\s*(?:name)?\s+to\s+([^\n\r]+)/i);
  if (purchaserMatch) {
    const newPurchaser = purchaserMatch[1].trim();
    const pItem = pageItems.find((it) => /purchaser|customer|buyer/i.test(it.str));
    if (pItem) {
      const valMatch = pItem.str.match(/(?:purchaser|customer|buyer)\s*[:\-]?\s*(.+)/i);
      const oldPurchaser = valMatch ? valMatch[1].trim() : pItem.str;
      const edit: AiEditAction = {
        id: `edit-${Date.now()}`,
        type: 'replace_text',
        description: `Change Purchaser "${oldPurchaser}" to "${newPurchaser}"`,
        fieldLabel: 'Purchaser',
        pageNumber: activePageNumber,
        targetText: oldPurchaser,
        replacementText: newPurchaser,
        selected: true,
        highlightBox: { x: pItem.x, y: pItem.y, width: pItem.width, height: pItem.height },
      };
      return {
        success: true,
        found: true,
        explanation: `I found Purchaser on page ${activePageNumber}.\nCurrent value: ${oldPurchaser}\nNew value: ${newPurchaser}`,
        changesSummary: `Purchaser: ${oldPurchaser} → ${newPurchaser}`,
        edits: [edit],
        highlightBoxes: [{ id: `hl-${edit.id}`, pageNumber: activePageNumber, x: pItem.x, y: pItem.y, width: pItem.width, height: pItem.height, label: `${oldPurchaser} → ${newPurchaser}`, actionType: 'replace' }],
      };
    }
  }

  // 3. TABLE QUANTITY / CELL INTENT (e.g. "Change quantity of Needle Valve to 10" or "Change Needle Valve quantity to 10")
  const tableQtyMatch =
    instruction.match(/change\s+(?:the\s+)?quantity\s+of\s+([^to]+)\s+to\s+([0-9A-Za-z\s]+)/i) ||
    instruction.match(/change\s+([^to]+)\s+quantity\s+to\s+([0-9A-Za-z\s]+)/i);

  if (tableQtyMatch && targetPage) {
    const itemKeyword = tableQtyMatch[1].trim().toLowerCase();
    const newQty = tableQtyMatch[2].trim();

    for (const el of targetPage.elements) {
      if (el.type === 'table') {
        const tbl = el as TableElement;
        const qtyColIdx = tbl.headers.findIndex((h) => /qty|quantity|nos|count/i.test(h));
        const safeColIdx = qtyColIdx !== -1 ? qtyColIdx : (tbl.headers.length > 1 ? 1 : 0);

        const rowIdx = tbl.rows.findIndex((r) =>
          r.some((c) => c.toLowerCase().includes(itemKeyword))
        );

        if (rowIdx !== -1) {
          const oldVal = tbl.rows[rowIdx][safeColIdx] || '';
          const edit: AiEditAction = {
            id: `edit-${Date.now()}`,
            type: 'update_table_cell',
            description: `Change ${itemKeyword} quantity from "${oldVal}" to "${newQty}"`,
            fieldLabel: 'Quantity',
            pageNumber: activePageNumber,
            tableId: tbl.id,
            rowIndex: rowIdx,
            colIndex: safeColIdx,
            oldValue: oldVal,
            newValue: newQty,
            selected: true,
          };

          return {
            success: true,
            found: true,
            explanation: `I found ${itemKeyword} in the table.\nCurrent Quantity: ${oldVal} → New Quantity: ${newQty}`,
            changesSummary: `${itemKeyword} Qty: ${oldVal} → ${newQty}`,
            edits: [edit],
            highlightBoxes: [
              {
                id: `hl-${edit.id}`,
                pageNumber: activePageNumber,
                x: tbl.x,
                y: tbl.y + (rowIdx + 1) * 20,
                width: tbl.width / Math.max(1, tbl.headers.length),
                height: 20,
                label: `${oldVal} → ${newQty}`,
                actionType: 'update',
              },
            ],
          };
        }
      }
    }
  }

  // 4. LITERAL REPLACE WITH SMART SUGGESTION FALLBACK
  const literalReplaceMatch =
    instruction.match(/replace\s+["']?([^"']+)["']?\s+with\s+["']?([^"']+)["']?/i) ||
    instruction.match(/change\s+["']?([^"']+)["']?\s+to\s+["']?([^"']+)["']?/i);

  if (literalReplaceMatch) {
    const targetText = literalReplaceMatch[1].trim();
    const replacementText = literalReplaceMatch[2].trim();

    const itemMatch = pageItems.find((it) =>
      it.str.toLowerCase().includes(targetText.toLowerCase())
    );

    if (itemMatch) {
      const edit: AiEditAction = {
        id: `edit-${Date.now()}`,
        type: 'replace_text',
        description: `Replace "${targetText}" with "${replacementText}"`,
        pageNumber: activePageNumber,
        targetText,
        replacementText,
        selected: true,
        highlightBox: { x: itemMatch.x, y: itemMatch.y, width: itemMatch.width, height: itemMatch.height },
      };

      return {
        success: true,
        found: true,
        changesSummary: `Replace "${targetText}" with "${replacementText}"`,
        edits: [edit],
        highlightBoxes: [
          {
            id: `hl-${edit.id}`,
            pageNumber: activePageNumber,
            x: itemMatch.x,
            y: itemMatch.y,
            width: itemMatch.width,
            height: itemMatch.height,
            label: `${targetText} → ${replacementText}`,
            actionType: 'replace',
          },
        ],
      };
    }

    // If exact targetText not found, check if user provided a wrong date (e.g. 24/08/2026 when doc has 20-08-2026)
    const isDateQuery = /[0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{2,4}/.test(targetText);
    if (isDateQuery) {
      const docDateItem = pageItems.find((it) => /[0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{2,4}/.test(it.str));
      if (docDateItem) {
        const docDateMatch = docDateItem.str.match(/([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{2,4})/);
        const actualDocDate = docDateMatch ? docDateMatch[1] : '';

        if (actualDocDate) {
          const edit: AiEditAction = {
            id: `edit-${Date.now()}`,
            type: 'replace_text',
            description: `Change Date from "${actualDocDate}" to "${replacementText}"`,
            fieldLabel: 'Date',
            pageNumber: activePageNumber,
            targetText: actualDocDate,
            replacementText,
            oldValue: actualDocDate,
            newValue: replacementText,
            selected: true,
            highlightBox: { x: docDateItem.x, y: docDateItem.y, width: docDateItem.width, height: docDateItem.height },
          };

          return {
            success: true,
            found: true,
            isSuggestion: true,
            suggestionMessage: `I couldn't find "${targetText}", but I found a Date field containing "${actualDocDate}". Would you like to change it to "${replacementText}"?`,
            explanation: `Identified Date field on page ${activePageNumber}.\nCurrent: ${actualDocDate} → Suggested: ${replacementText}`,
            changesSummary: `Date: ${actualDocDate} → ${replacementText}`,
            edits: [edit],
            highlightBoxes: [
              {
                id: `hl-${edit.id}`,
                pageNumber: activePageNumber,
                x: docDateItem.x,
                y: docDateItem.y,
                width: docDateItem.width,
                height: docDateItem.height,
                label: `${actualDocDate} → ${replacementText}`,
                actionType: 'replace',
              },
            ],
          };
        }
      }
    }
  }

  // 5. DELETION INTENT
  const deleteMatch =
    instruction.match(/remove\s+(?:the\s+)?["']?([^"']+)["']?/i) ||
    instruction.match(/delete\s+(?:the\s+)?["']?([^"']+)["']?/i);

  if (deleteMatch) {
    const target = deleteMatch[1].trim().toLowerCase();

    // Check phone number removal
    if (target.includes('phone') || target.includes('mobile') || target.includes('tel')) {
      const phoneItem = pageItems.find((it) => /phone|tel|mobile|\+?[0-9\s\-()]{8,}/i.test(it.str));
      if (phoneItem) {
        const edit: AiEditAction = {
          id: `edit-${Date.now()}`,
          type: 'delete_text',
          description: `Remove phone number "${phoneItem.str}"`,
          fieldLabel: 'Phone',
          pageNumber: activePageNumber,
          targetText: phoneItem.str,
          selected: true,
          highlightBox: { x: phoneItem.x, y: phoneItem.y, width: phoneItem.width, height: phoneItem.height },
        };

        return {
          success: true,
          found: true,
          explanation: `I found the phone number on page ${activePageNumber}: "${phoneItem.str}"`,
          changesSummary: `Remove phone number`,
          edits: [edit],
          highlightBoxes: [{ id: `hl-${edit.id}`, pageNumber: activePageNumber, x: phoneItem.x, y: phoneItem.y, width: phoneItem.width, height: phoneItem.height, label: 'Delete Phone', actionType: 'delete' }],
        };
      }
    }

    // Check address removal
    if (target.includes('address')) {
      const addrItem = pageItems.find((it) => /address|p\.o\.?\s*box|street|road/i.test(it.str));
      if (addrItem) {
        const edit: AiEditAction = {
          id: `edit-${Date.now()}`,
          type: 'delete_text',
          description: `Remove address "${addrItem.str}"`,
          fieldLabel: 'Address',
          pageNumber: activePageNumber,
          targetText: addrItem.str,
          selected: true,
          highlightBox: { x: addrItem.x, y: addrItem.y, width: addrItem.width, height: addrItem.height },
        };

        return {
          success: true,
          found: true,
          explanation: `I found the address on page ${activePageNumber}: "${addrItem.str}"`,
          changesSummary: `Remove address`,
          edits: [edit],
          highlightBoxes: [{ id: `hl-${edit.id}`, pageNumber: activePageNumber, x: addrItem.x, y: addrItem.y, width: addrItem.width, height: addrItem.height, label: 'Delete Address', actionType: 'delete' }],
        };
      }
    }
  }

  return {
    success: true,
    found: false,
    notFoundMessage: `I couldn't identify the specific content for "${instruction}". Try describing what you'd like to change (e.g. "Change the date to 30/08/2026", "Update PO number to AOT-3008", "Change quantity of Needle Valve to 10").`,
    changesSummary: 'Instruction not recognized',
    edits: [],
    highlightBoxes: [],
  };
}

/**
 * Apply the verified AI Edit plan to the document state in-place with 100% precision
 */
export function applyAiEditPlanToPages(
  pages: PageEditData[],
  edits: AiEditAction[],
  allPageTextItems: Map<number, PdfTextItem[]>
): PageEditData[] {
  let updatedPages = JSON.parse(JSON.stringify(pages)) as PageEditData[];

  for (const edit of edits) {
    if (edit.selected === false) continue;

    const pageIndex = updatedPages.findIndex((p) => p.pageNumber === edit.pageNumber);
    if (pageIndex === -1) continue;

    const page = updatedPages[pageIndex];

    switch (edit.type) {
      case 'replace_text': {
        if (!edit.targetText || edit.replacementText === undefined) break;

        const targetClean = edit.targetText.trim();
        const targetCleanLower = targetClean.toLowerCase();
        const repText = edit.replacementText;

        // 1. Check if there's already an active TextElement on the canvas matching targetText
        const existingElIndex = page.elements.findIndex(
          (el) =>
            el.type === 'text' &&
            ((el as TextElement).text.toLowerCase().includes(targetCleanLower) ||
              (el as TextElement).originalText?.toLowerCase().includes(targetCleanLower))
        );

        if (existingElIndex !== -1) {
          const oldEl = page.elements[existingElIndex] as TextElement;
          const newText = oldEl.text.replaceAll(new RegExp(targetClean, 'gi'), repText);
          page.elements[existingElIndex] = {
            ...oldEl,
            text: newText,
          };
          break;
        }

        // 2. Otherwise find the exact native text item from PDF stream
        const pageItems = allPageTextItems.get(edit.pageNumber) || [];
        const matchingItem = pageItems.find((it) =>
          it.str.toLowerCase().includes(targetCleanLower)
        );

        if (matchingItem) {
          const estFontSize = Math.max(8, Math.round(matchingItem.height * 0.95));
          const replacedFullText = matchingItem.str.replaceAll(
            new RegExp(targetClean, 'gi'),
            repText
          );

          const newTextEl: TextElement = {
            id: `ai-text-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            pageNumber: edit.pageNumber,
            type: 'text',
            text: replacedFullText,
            originalText: matchingItem.str,
            originalBounds: {
              x: matchingItem.x,
              y: matchingItem.y,
              width: matchingItem.width,
              height: matchingItem.height,
            },
            x: matchingItem.x,
            y: matchingItem.y,
            width: Math.max(matchingItem.width, replacedFullText.length * estFontSize * 0.55),
            height: Math.max(16, matchingItem.height),
            fontSize: estFontSize,
            fontFamily: 'Helvetica',
            fontWeight: 'normal',
            fontStyle: 'normal',
            textAlign: 'left',
            color: '#0f172a',
            backgroundColor: '#ffffff',
            zIndex: page.elements.length + 5,
          };

          page.elements.push(newTextEl);
        } else if (edit.highlightBox) {
          const box = edit.highlightBox;
          const estFontSize = Math.max(9, Math.round(box.height * 0.85));

          const newTextEl: TextElement = {
            id: `ai-text-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            pageNumber: edit.pageNumber,
            type: 'text',
            text: repText,
            originalText: targetClean,
            originalBounds: {
              x: box.x,
              y: box.y,
              width: box.width,
              height: box.height,
            },
            x: box.x,
            y: box.y,
            width: Math.max(box.width, repText.length * estFontSize * 0.55),
            height: box.height,
            fontSize: estFontSize,
            fontFamily: 'Helvetica',
            fontWeight: 'normal',
            fontStyle: 'normal',
            textAlign: 'left',
            color: '#0f172a',
            backgroundColor: '#ffffff',
            zIndex: page.elements.length + 5,
          };

          page.elements.push(newTextEl);
        }
        break;
      }

      case 'delete_text': {
        if (!edit.targetText) break;
        const targetClean = edit.targetText.trim().toLowerCase();

        const existingElIndex = page.elements.findIndex(
          (el) =>
            el.type === 'text' &&
            ((el as TextElement).text.toLowerCase().includes(targetClean) ||
              (el as TextElement).originalText?.toLowerCase().includes(targetClean))
        );

        if (existingElIndex !== -1) {
          page.elements.splice(existingElIndex, 1);
          break;
        }

        const pageItems = allPageTextItems.get(edit.pageNumber) || [];
        const matchingItem = pageItems.find((it) =>
          it.str.toLowerCase().includes(targetClean)
        );

        if (matchingItem || edit.highlightBox) {
          const bounds = matchingItem
            ? {
                x: matchingItem.x - 2,
                y: matchingItem.y - 1,
                width: matchingItem.width + 4,
                height: matchingItem.height + 2,
              }
            : edit.highlightBox!;

          const whiteoutEl: WhiteoutElement = {
            id: `ai-whiteout-${Date.now()}`,
            pageNumber: edit.pageNumber,
            type: 'whiteout',
            color: '#ffffff',
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            zIndex: page.elements.length + 5,
          };

          page.elements.push(whiteoutEl);
        }
        break;
      }

      case 'update_table_cell': {
        const tableIndex = page.elements.findIndex(
          (el) => el.id === edit.tableId && el.type === 'table'
        );
        if (tableIndex === -1) {
          const firstTblIdx = page.elements.findIndex((el) => el.type === 'table');
          if (firstTblIdx !== -1 && edit.rowIndex !== undefined && edit.colIndex !== undefined) {
            const table = page.elements[firstTblIdx] as TableElement;
            if (table.rows[edit.rowIndex]) {
              table.rows[edit.rowIndex][edit.colIndex] = edit.newValue || '';
            }
          }
          break;
        }

        const table = page.elements[tableIndex] as TableElement;
        let rIdx = edit.rowIndex;
        let cIdx = edit.colIndex;

        if (rIdx === undefined && edit.rowMatchText) {
          rIdx = table.rows.findIndex((r) =>
            r.some((c) => c.toLowerCase().includes(edit.rowMatchText!.toLowerCase()))
          );
        }

        if (cIdx === undefined && edit.colHeader) {
          cIdx = table.headers.findIndex((h) =>
            h.toLowerCase().includes(edit.colHeader!.toLowerCase())
          );
        }

        if (rIdx !== undefined && rIdx >= 0 && rIdx < table.rows.length) {
          const safeCIdx = cIdx !== undefined && cIdx >= 0 ? cIdx : 0;
          const newRows = table.rows.map((row, r) => {
            if (r !== rIdx) return [...row];
            const updatedRow = [...row];
            updatedRow[safeCIdx] = edit.newValue || '';
            return updatedRow;
          });

          page.elements[tableIndex] = {
            ...table,
            rows: newRows,
          };
        }
        break;
      }

      case 'add_table_row': {
        const tableIndex = page.elements.findIndex(
          (el) => (edit.tableId ? el.id === edit.tableId : true) && el.type === 'table'
        );
        if (tableIndex === -1) break;

        const table = page.elements[tableIndex] as TableElement;
        const numCols = Math.max(1, table.headers.length || (table.rows[0]?.length ?? 1));

        let rowValues = edit.newRowValues;
        if (!rowValues || rowValues.length === 0) {
          rowValues = new Array(numCols).fill('');
        }
        while (rowValues.length < numCols) {
          rowValues.push('');
        }

        const insertIdx =
          edit.rowIndex !== undefined && edit.rowIndex >= 0
            ? edit.rowIndex + 1
            : table.rows.length;

        const newRows = [...table.rows];
        newRows.splice(insertIdx, 0, rowValues);

        const defaultRowHeight = 18;
        const newRowHeights = table.rowHeights
          ? [...table.rowHeights]
          : new Array(table.rows.length).fill(defaultRowHeight);
        newRowHeights.splice(insertIdx, 0, defaultRowHeight);

        page.elements[tableIndex] = {
          ...table,
          rows: newRows,
          rowHeights: newRowHeights,
          height: table.height + defaultRowHeight,
        };
        break;
      }

      case 'delete_table_row': {
        const tableIndex = page.elements.findIndex(
          (el) => (edit.tableId ? el.id === edit.tableId : true) && el.type === 'table'
        );
        if (tableIndex === -1) break;

        const table = page.elements[tableIndex] as TableElement;
        if (table.rows.length <= 1) break;

        let rIdx = edit.rowIndex;
        if (rIdx === undefined && edit.rowMatchText) {
          rIdx = table.rows.findIndex((r) =>
            r.some((c) => c.toLowerCase().includes(edit.rowMatchText!.toLowerCase()))
          );
        }

        const targetIdx = rIdx !== undefined && rIdx >= 0 ? rIdx : table.rows.length - 1;
        const newRows = table.rows.filter((_, idx) => idx !== targetIdx);

        const defaultRowHeight = 18;
        const removedHeight = table.rowHeights?.[targetIdx] || defaultRowHeight;
        const newRowHeights = table.rowHeights
          ? table.rowHeights.filter((_, idx) => idx !== targetIdx)
          : undefined;

        page.elements[tableIndex] = {
          ...table,
          rows: newRows,
          rowHeights: newRowHeights,
          height: Math.max(30, table.height - removedHeight),
        };
        break;
      }

      case 'delete_element': {
        page.elements = page.elements.filter((el) => {
          if (edit.elementId && el.id === edit.elementId) return false;
          if (edit.elementType === 'signature' && el.type === 'image' && (el as any).isSignature) {
            return false;
          }
          if (edit.elementType === 'image' && el.type === 'image' && !edit.elementId) {
            return false;
          }
          return true;
        });
        break;
      }
    }
  }

  return updatedPages;
}
