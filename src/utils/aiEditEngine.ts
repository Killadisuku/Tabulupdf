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

export interface DetectedDocumentField {
  id: string;
  category: 'price' | 'date' | 'quantity' | 'reference' | 'contact' | 'table_cell' | 'text';
  label: string;
  value: string;
  pageNumber: number;
  tableId?: string;
  rowIndex?: number;
  colIndex?: number;
  bounds?: { x: number; y: number; width: number; height: number };
}

export interface AiEditPlanResult {
  success: boolean;
  found: boolean;
  responseType?: 'edit_proposal' | 'answer' | 'confirmation' | 'ambiguity' | 'suggestion' | 'not_found_help' | 'greeting' | 'undo_report' | 'history_report';
  conversationText?: string;
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
  detectedFields?: DetectedDocumentField[];
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  text: string;
  responseType?: 'greeting' | 'edit_proposal' | 'answer' | 'confirmation' | 'ambiguity' | 'suggestion' | 'not_found_help' | 'undo_report' | 'history_report';
  plan?: AiEditPlanResult;
  applied?: boolean;
  undone?: boolean;
  ambiguityChoices?: AmbiguityChoice[];
  highlightBoxes?: AiHighlightBox[];
  focusPage?: number;
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
 * Comprehensive Multi-Layer Normalization & OCR Resilience Engine:
 * - Unicode NFKC normalization (ligatures, superscripts, full-width chars)
 * - Zero-width, non-breaking space & control char stripping
 * - Punctuation, bracket, quotes & dash canonicalization
 * - Common OCR artifact & trailing punctuation stripping
 * - Alphanumeric pure-token comparison for 100% resilient PDF text matching
 */

/**
 * Basic Unicode and whitespace normalization
 */
export function normalizeText(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFKC')
    // Remove zero-width spaces, directional marks, soft hyphens, byte order marks
    .replace(/[\u200B-\u200D\uFEFF\u00AD\u200E\u200F]/g, '')
    // Normalize non-breaking spaces and exotic whitespace to standard ASCII space
    .replace(/[\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/g, ' ')
    // Normalize quotes, backticks and prime marks
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035`]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB\u2033\u2036]/g, '"')
    // Normalize dashes, hyphens, minus signs
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D_]/g, '-')
    // Normalize bullets and special points
    .replace(/[\u2022\u2023\u25E6\u2043\u2219\u00B7]/g, ' ')
    // Convert newlines/tabs to space and collapse repeated whitespace
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Normalizes text while stripping common OCR artifacts and outer brackets/punctuation
 * e.g. "210 including vat )" -> "210 including vat"
 * e.g. "( USED OIL PER DRUM )" -> "used oil per drum"
 * e.g. "Price : 210.00 /-" -> "price: 210.00"
 */
export function normalizePunctuationAndOcr(str: string): string {
  if (!str) return '';
  let norm = normalizeText(str);

  // Strip enclosing or trailing unmatched parentheses, brackets, braces
  norm = norm.replace(/^[()[\]{}<>\s]+|[()[\]{}<>\s]+$/g, '');

  // Strip trailing punctuation like colons, periods, commas, dashes, slashes at the ends of extracted fields
  norm = norm.replace(/[:;,.\-/\\]+$/g, '').trim();

  // Strip leading punctuation like colons, bullet marks, dashes
  norm = norm.replace(/^[:;,.\-/\\]+/g, '').trim();

  // Replace multiple repeated punctuation (e.g. "...", "---", ":::") with a single space
  norm = norm.replace(/([.\-_:;/\\])\1+/g, ' ');

  // Collapse spaces again
  norm = norm.replace(/\s+/g, ' ').trim();

  return norm;
}

/**
 * Strips all non-alphanumeric characters, leaving only pure letters, numbers, and spaces
 * Perfect for resilient matching where punctuation, formatting, or OCR stray marks differ
 */
export function stripAllPunctuation(str: string): string {
  if (!str) return '';
  return normalizeText(str)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface NormalizedStringBundle {
  raw: string;
  strict: string;
  clean: string;
  alphanumeric: string;
  tokens: string[];
}

export function createNormalizedBundle(str: string): NormalizedStringBundle {
  const strict = normalizeText(str);
  const clean = normalizePunctuationAndOcr(str);
  const alphanumeric = stripAllPunctuation(str);
  const tokens = alphanumeric.split(' ').filter(Boolean);
  return {
    raw: str,
    strict,
    clean,
    alphanumeric,
    tokens,
  };
}

/**
 * Flexible Multi-Layer String Matcher:
 * Evaluates candidate against target query across 7 resilience layers
 */
export function isFlexibleStringMatch(
  candidate: string,
  query: string,
  minSimilarity = 0.75
): {
  matched: boolean;
  score: number;
  matchType: 'exact' | 'strict' | 'clean' | 'alphanumeric' | 'substring' | 'token_containment' | 'fuzzy' | 'none';
} {
  if (!candidate || !query) {
    return { matched: false, score: 0, matchType: 'none' };
  }

  // 1. Raw exact match
  if (candidate.trim() === query.trim()) {
    return { matched: true, score: 1.0, matchType: 'exact' };
  }

  const candBundle = createNormalizedBundle(candidate);
  const qBundle = createNormalizedBundle(query);

  // 2. Strict normalized match
  if (candBundle.strict === qBundle.strict) {
    return { matched: true, score: 1.0, matchType: 'strict' };
  }

  // 3. Clean (OCR artifact & outer punctuation stripped) match
  if (candBundle.clean && qBundle.clean && candBundle.clean === qBundle.clean) {
    return { matched: true, score: 0.98, matchType: 'clean' };
  }

  // 4. Pure alphanumeric match
  if (candBundle.alphanumeric && qBundle.alphanumeric && candBundle.alphanumeric === qBundle.alphanumeric) {
    return { matched: true, score: 0.95, matchType: 'alphanumeric' };
  }

  // 5. Substring match (clean or strict)
  if (
    (candBundle.clean && qBundle.clean && candBundle.clean.includes(qBundle.clean)) ||
    (candBundle.strict && qBundle.strict && candBundle.strict.includes(qBundle.strict))
  ) {
    return { matched: true, score: 0.90, matchType: 'substring' };
  }

  // 6. Alphanumeric Substring match
  if (
    candBundle.alphanumeric &&
    qBundle.alphanumeric &&
    candBundle.alphanumeric.includes(qBundle.alphanumeric)
  ) {
    return { matched: true, score: 0.88, matchType: 'substring' };
  }

  // 7. Token containment: all query tokens are present in candidate
  if (qBundle.tokens.length > 0 && qBundle.tokens.every((t) => candBundle.tokens.includes(t))) {
    return { matched: true, score: 0.85, matchType: 'token_containment' };
  }

  // 8. Numeric extraction match (e.g. query is "210" and candidate contains "210 including vat")
  const numericQuery = qBundle.alphanumeric.match(/^[0-9]+(?:\.[0-9]+)?$/);
  if (numericQuery) {
    const numVal = numericQuery[0];
    const candidateNums = candBundle.tokens.filter((t) => /^[0-9]+(?:\.[0-9]+)?$/.test(t));
    if (candidateNums.includes(numVal)) {
      return { matched: true, score: 0.85, matchType: 'token_containment' };
    }
  }

  // 9. Levenshtein + Jaccard similarity fallback
  const similarity = calculateSimilarity(candBundle.clean, qBundle.clean);
  if (similarity >= minSimilarity) {
    return { matched: true, score: similarity, matchType: 'fuzzy' };
  }

  return { matched: false, score: similarity, matchType: 'none' };
}

/**
 * Calculate similarity between two strings (0.0 to 1.0)
 */
export function calculateSimilarity(s1: string, s2: string): number {
  const norm1 = normalizePunctuationAndOcr(s1);
  const norm2 = normalizePunctuationAndOcr(s2);

  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0.0;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.88;

  // Token-based Jaccard similarity
  const tokens1 = new Set(norm1.split(' ').filter(Boolean));
  const tokens2 = new Set(norm2.split(' ').filter(Boolean));
  let intersection = 0;
  tokens1.forEach((t) => {
    if (tokens2.has(t)) intersection++;
  });
  const union = new Set([...tokens1, ...tokens2]).size;
  const jaccard = union > 0 ? intersection / union : 0;

  // Simple Levenshtein distance
  const len1 = norm1.length;
  const len2 = norm2.length;
  const maxLen = Math.max(len1, len2);
  if (maxLen === 0) return 1.0;

  const track = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));
  for (let i = 0; i <= len1; i += 1) track[0][i] = i;
  for (let j = 0; j <= len2; j += 1) track[j][0] = j;

  for (let j = 1; j <= len2; j += 1) {
    for (let i = 1; i <= len1; i += 1) {
      const indicator = norm1[i - 1] === norm2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }

  const levSim = 1.0 - track[len2][len1] / maxLen;
  return Math.max(jaccard, levSim);
}

/**
 * Reconstructs logical horizontal text lines by grouping text items with close Y baseline
 */
export function reconstructPageLines(
  items: PdfTextItem[]
): { text: string; items: PdfTextItem[]; bounds: { x: number; y: number; width: number; height: number } }[] {
  if (!items || items.length === 0) return [];

  const yTolerance = 4.0;
  const sorted = [...items].sort((a, b) => {
    if (Math.abs(a.y - b.y) <= yTolerance) return a.x - b.x;
    return a.y - b.y;
  });

  const lines: { text: string; items: PdfTextItem[]; bounds: { x: number; y: number; width: number; height: number } }[] = [];

  for (const item of sorted) {
    if (!item.str || item.str.trim() === '') continue;

    const matchedLine = lines.find((l) => {
      const avgY = l.items.reduce((sum, it) => sum + it.y, 0) / l.items.length;
      return Math.abs(avgY - item.y) <= yTolerance;
    });

    if (matchedLine) {
      matchedLine.items.push(item);
      matchedLine.items.sort((a, b) => a.x - b.x);
      matchedLine.text = matchedLine.items.map((it) => it.str).join(' ');
      const minX = Math.min(...matchedLine.items.map((it) => it.x));
      const minY = Math.min(...matchedLine.items.map((it) => it.y));
      const maxX = Math.max(...matchedLine.items.map((it) => it.x + it.width));
      const maxY = Math.max(...matchedLine.items.map((it) => it.y + it.height));
      matchedLine.bounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    } else {
      lines.push({
        text: item.str,
        items: [item],
        bounds: { x: item.x, y: item.y, width: item.width, height: item.height },
      });
    }
  }

  return lines;
}

/**
 * Extract comprehensive semantic catalog of all fields present in the document
 */
export function extractDocumentSemanticCatalog(
  pages: PageEditData[],
  allPageTextItems: Map<number, PdfTextItem[]>
): DetectedDocumentField[] {
  const fields: DetectedDocumentField[] = [];

  pages.forEach((page) => {
    if (page.isDeleted) return;
    const pageNum = page.pageNumber;
    const items = allPageTextItems.get(pageNum) || [];
    const lines = reconstructPageLines(items);
    const fullText = lines.map((l) => l.text).join('\n');

    // 1. Table Cells
    page.elements.forEach((el) => {
      if (el.type === 'table') {
        const tbl = el as TableElement;
        const headers = tbl.headers || [];
        tbl.rows.forEach((row, rIdx) => {
          row.forEach((cell, cIdx) => {
            const trimmed = (cell || '').trim();
            if (!trimmed) return;
            const header = headers[cIdx] || `Column ${cIdx + 1}`;

            let category: DetectedDocumentField['category'] = 'table_cell';
            if (/price|rate|amount|vat|drum|cost|fee|total/i.test(header)) category = 'price';
            else if (/date/i.test(header)) category = 'date';
            else if (/qty|quantity|nos|pcs|count/i.test(header)) category = 'quantity';
            else if (/po|tc|ref|inv/i.test(header)) category = 'reference';

            const numCols = Math.max(1, headers.length);
            const colWidth = tbl.colWidths?.[cIdx] || tbl.width / numCols;
            const cellX = tbl.x + (tbl.colWidths?.slice(0, cIdx).reduce((a, b) => a + b, 0) || cIdx * colWidth);
            const rHeight = tbl.rowHeights?.[rIdx] || 18;
            const headerOffset = tbl.headerHeight || 20;
            const rowOffset = tbl.rowHeights?.slice(0, rIdx).reduce((a, b) => a + b, 0) || rIdx * rHeight;

            fields.push({
              id: `field-tbl-${pageNum}-${tbl.id}-${rIdx}-${cIdx}`,
              category,
              label: header,
              value: trimmed,
              pageNumber: pageNum,
              tableId: tbl.id,
              rowIndex: rIdx,
              colIndex: cIdx,
              bounds: {
                x: cellX,
                y: tbl.y + headerOffset + rowOffset,
                width: colWidth,
                height: rHeight,
              },
            });
          });
        });
      }
    });

    // 2. Semantic Patterns from text lines
    const patterns = [
      {
        category: 'price' as const,
        label: 'Purchase Price / Drum',
        regex: /(?:Purchase\s+Price(?:\s*[\/\\–-]\s*Drum)?|Drum\s+Price|Unit\s+Price|Price|Rate)\s*[:\-]?\s*([0-9.,]+(?:\s*(?:including\s+vat|incl\s+vat|vat|usd|aed|eur|inr|\$|€|£|[a-z]+))?)/i,
      },
      {
        category: 'date' as const,
        label: 'Date',
        regex: /(?:Date(?:\s*of\s*Issue)?|Certificate\s*Date|Issue\s*Date|Expiry\s*Date|Inv(?:oice)?\s*Date|PO\s*Date)\s*[:\-]?\s*([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{2,4}|[0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{2,4})/i,
      },
      {
        category: 'quantity' as const,
        label: 'Quantity',
        regex: /(?:QTY|Quantity|Volume|Count|Total\s+Qty)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?\s*(?:NOS|PCS|UNITS|SETS|KG|MTR|DRUMS|LITERS|L|BOXES|MT)?)/i,
      },
      {
        category: 'reference' as const,
        label: 'PO No',
        regex: /(?:PO\s*(?:NO|Number|#)?|P\.O\.\s*No)\s*[:\-]?\s*([A-Za-z0-9\-_/]+)/i,
      },
      {
        category: 'reference' as const,
        label: 'TC No',
        regex: /(?:TC\s*(?:NO|Number|#)?|Test\s+Certificate\s+No|Certificate\s+No)\s*[:\-]?\s*([A-Za-z0-9\-_/]+)/i,
      },
      {
        category: 'contact' as const,
        label: 'Purchaser',
        regex: /(?:Purchaser|Customer|Buyer|Billed\s+To|Client|Company)\s*[:\-]?\s*([A-Za-z0-9\s.,&'\-]{3,60})(?=\s*(?:Date|PO|TC|Tel|Phone|Email|Address|QTY|\n|$))/i,
      },
      {
        category: 'contact' as const,
        label: 'Attn',
        regex: /(?:Attn|Attention|Contact\s+Person|Kind\s+Attn)\s*[:\-]?\s*([A-Za-z0-9\s.,'\-]{3,40})/i,
      },
      {
        category: 'contact' as const,
        label: 'Phone',
        regex: /(?:Phone|Tel|Mobile|Contact)\s*[:\-]?\s*(\+?[0-9\s\-()]{7,20})/i,
      },
      {
        category: 'contact' as const,
        label: 'Email',
        regex: /(?:Email|E-mail)\s*[:\-]?\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/i,
      },
    ];

    lines.forEach((line, lIdx) => {
      patterns.forEach((pat) => {
        const m = line.text.match(pat.regex);
        if (m && m[1]) {
          const val = m[1].trim();
          // Avoid duplicate field values
          if (!fields.some((f) => f.pageNumber === pageNum && f.value.toLowerCase() === val.toLowerCase())) {
            fields.push({
              id: `field-line-${pageNum}-${lIdx}-${pat.category}`,
              category: pat.category,
              label: pat.label,
              value: val,
              pageNumber: pageNum,
              bounds: line.bounds,
            });
          }
        }
      });
    });

    // Also standalone date detection
    const genericDateRegex = /\b([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{2,4}|[0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{2,4})\b/g;
    let match: RegExpExecArray | null;
    while ((match = genericDateRegex.exec(fullText)) !== null) {
      const dateVal = match[1];
      if (!fields.some((f) => f.pageNumber === pageNum && f.value === dateVal)) {
        const lineWithDate = lines.find((l) => l.text.includes(dateVal));
        fields.push({
          id: `field-date-${pageNum}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          category: 'date',
          label: 'Date',
          value: dateVal,
          pageNumber: pageNum,
          bounds: lineWithDate?.bounds,
        });
      }
    }
  });

  return fields;
}

/**
 * Gather complete document context for Gemini reasoning
 */
export function buildDocumentContext(
  pages: PageEditData[],
  allPageTextItems: Map<number, PdfTextItem[]>
) {
  return pages
    .filter((p) => !p.isDeleted)
    .map((page) => {
      const rawTextItems = allPageTextItems.get(page.pageNumber) || [];
      const lines = reconstructPageLines(rawTextItems);

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

      const detectedKeyValues = extractDocumentSemanticCatalog([page], allPageTextItems).map((f) => ({
        category: f.category,
        label: f.label,
        value: f.value,
        tableId: f.tableId,
        rowIndex: f.rowIndex,
        colIndex: f.colIndex,
      }));

      const textLines = lines.map((l) => ({
        text: l.text,
        x: Math.round(l.bounds.x),
        y: Math.round(l.bounds.y),
        width: Math.round(l.bounds.width),
        height: Math.round(l.bounds.height),
      }));

      return {
        pageNumber: page.pageNumber,
        detectedKeyValues,
        tables,
        textLines,
      };
    });
}

/**
 * Execute AI Edit Analysis with Multi-Layer Document Understanding
 */
export async function analyzeAiEditInstruction(
  instruction: string,
  activePageNumber: number,
  pages: PageEditData[],
  allPageTextItems: Map<number, PdfTextItem[]>,
  imageBase64?: string,
  chatHistory?: Array<{ role: 'user' | 'assistant'; text: string; edits?: any[] }>
): Promise<AiEditPlanResult> {
  const documentContext = buildDocumentContext(pages, allPageTextItems);
  const currentDate = new Date().toISOString().split('T')[0];
  const detectedCatalog = extractDocumentSemanticCatalog(pages, allPageTextItems);

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
        imageBase64,
        chatHistory,
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
      // Before giving up, run our smart local multi-layer engine
      const localResult = executeLocalSmartAiFallback(
        instruction,
        activePageNumber,
        pages,
        allPageTextItems,
        detectedCatalog
      );
      if (localResult.found || localResult.isSuggestion) {
        return localResult;
      }

      return {
        success: true,
        found: false,
        responseType: 'not_found_help',
        conversationText:
          data.conversationText ||
          data.notFoundMessage ||
          `I couldn't identify the requested field or content for "${instruction}". You can ask me what's on this document or tell me what to change.`,
        notFoundMessage:
          data.notFoundMessage ||
          `I couldn't identify the requested field or content for "${instruction}".`,
        changesSummary: 'Content not found',
        edits: [],
        highlightBoxes: [],
        detectedFields: detectedCatalog,
      };
    }

    // Resolve and enrich bounding boxes for visual preview highlights
    const enrichedEdits: AiEditAction[] = (data.edits || []).map((edit: any, idx: number) => {
      const editId = `edit-${Date.now()}-${idx}`;
      let highlightBox = edit.highlightBox;

      const pageNum = edit.pageNumber || activePageNumber;
      const pageTextItems = allPageTextItems.get(pageNum) || [];
      const targetPage = pages.find((p) => p.pageNumber === pageNum);

      // If text replacement or deletion, compute exact bounding box
      if (
        (!highlightBox || highlightBox.width === 0) &&
        (edit.type === 'replace_text' || edit.type === 'delete_text') &&
        edit.targetText
      ) {
        const targetClean = edit.targetText.trim();

        // 1. Check existing TextElements on canvas
        const matchedElement = targetPage?.elements.find((el) => {
          if (el.type !== 'text') return false;
          const textEl = el as TextElement;
          return (
            isFlexibleStringMatch(textEl.text || '', targetClean).matched ||
            isFlexibleStringMatch(textEl.originalText || '', targetClean).matched
          );
        });

        if (matchedElement) {
          highlightBox = {
            x: matchedElement.x - 2,
            y: matchedElement.y - 2,
            width: matchedElement.width + 4,
            height: matchedElement.height + 4,
          };
        } else {
          // 2. Check native PDF text items or composite lines
          const lines = reconstructPageLines(pageTextItems);
          const matchedLine = lines.find(
            (l) => isFlexibleStringMatch(l.text, targetClean).matched
          );

          if (matchedLine) {
            highlightBox = {
              x: matchedLine.bounds.x - 2,
              y: matchedLine.bounds.y - 2,
              width: matchedLine.bounds.width + 4,
              height: Math.max(14, matchedLine.bounds.height + 4),
            };
          } else {
            const matchingItems = pageTextItems.filter(
              (it) => isFlexibleStringMatch(it.str, targetClean).matched
            );
            if (matchingItems.length > 0) {
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
        targetPage
      ) {
        const table = targetPage.elements.find(
          (el) => (edit.tableId ? el.id === edit.tableId : true) && el.type === 'table'
        ) as TableElement | undefined;

        if (table) {
          if (edit.type === 'update_table_cell' && edit.rowIndex !== undefined) {
            const rHeight = table.rowHeights?.[edit.rowIndex] || 18;
            const numCols = Math.max(1, table.headers.length || table.rows[0]?.length || 1);
            const colWidths = table.colWidths || new Array(numCols).fill(table.width / numCols);
            const cIdx = edit.colIndex !== undefined ? edit.colIndex : 0;
            const cWidth = colWidths[cIdx] || table.width / numCols;
            const cellX = table.x + (colWidths.slice(0, cIdx).reduce((a, b) => a + b, 0) || cIdx * cWidth);
            const headerOffset = table.headers.length > 0 ? (table.headerHeight || 20) : 0;
            const rowOffset = table.rowHeights?.slice(0, edit.rowIndex).reduce((a, b) => a + b, 0) ?? (edit.rowIndex * rHeight);

            highlightBox = {
              x: cellX - 1,
              y: table.y + headerOffset + rowOffset - 1,
              width: cWidth + 2,
              height: rHeight + 2,
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

    const highlightBoxes: AiHighlightBox[] = enrichedEdits
      .filter((e) => e.highlightBox)
      .map((e) => {
        let actionType: 'replace' | 'delete' | 'add' | 'update' = 'replace';
        if (e.type.startsWith('delete')) actionType = 'delete';
        else if (e.type.startsWith('add')) actionType = 'add';
        else if (e.type.startsWith('update')) actionType = 'update';

        let label = e.fieldLabel || e.description;
        if (e.type === 'replace_text' && e.targetText && e.replacementText) {
          label = `${e.targetText} → ${e.replacementText}`;
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
      responseType: data.responseType || (enrichedEdits.length > 0 ? 'edit_proposal' : 'answer'),
      conversationText: data.conversationText || data.explanation || `I analyzed your request.`,
      isSuggestion: data.isSuggestion ?? false,
      suggestionMessage: data.suggestionMessage,
      explanation: data.conversationText || data.explanation || (enrichedEdits[0] ? `Identified ${enrichedEdits[0].fieldLabel || 'field'} on page ${enrichedEdits[0].pageNumber}.` : undefined),
      isAmbiguous: data.isAmbiguous ?? false,
      ambiguityMessage: data.ambiguityMessage,
      ambiguityChoices: data.ambiguityChoices || [],
      occurrencesCount: data.occurrencesCount || enrichedEdits.length,
      changesSummary: data.changesSummary || `Planned ${enrichedEdits.length} modification(s)`,
      edits: enrichedEdits,
      highlightBoxes,
      detectedFields: detectedCatalog,
    };
  } catch (error: any) {
    console.warn('AI Edit API call error, falling back to smart local matching:', error);
    return executeLocalSmartAiFallback(
      instruction,
      activePageNumber,
      pages,
      allPageTextItems,
      detectedCatalog
    );
  }
}

/**
 * High-Precision Multi-Layer Local Semantic Matching Engine
 */
export function executeLocalSmartAiFallback(
  instruction: string,
  activePageNumber: number,
  pages: PageEditData[],
  allPageTextItems: Map<number, PdfTextItem[]>,
  cachedCatalog?: DetectedDocumentField[]
): AiEditPlanResult {
  const normInstruction = normalizeText(instruction);
  const catalog = cachedCatalog || extractDocumentSemanticCatalog(pages, allPageTextItems);
  const activePage = pages.find((p) => p.pageNumber === activePageNumber);

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

  // 1. DATE SEMANTIC INTENT (e.g. "Change the date to 30/08/2026", "Update date to tomorrow")
  const dateIntentMatch =
    instruction.match(/(?:change|update|set|replace)\s+(?:the\s+)?(?:certificate\s+|issue\s+|expiry\s+)?date\s+to\s+([^\n\r]+)/i) ||
    instruction.match(/date\s*[:=]\s*([^\n\r]+)/i);

  if (dateIntentMatch) {
    const rawNewDate = dateIntentMatch[1].trim();
    const newDate = resolveDateValue(rawNewDate);

    const dateFields = catalog.filter((f) => f.category === 'date');
    if (dateFields.length === 1) {
      const target = dateFields[0];
      const edit: AiEditAction = {
        id: `edit-${Date.now()}`,
        type: target.tableId ? 'update_table_cell' : 'replace_text',
        description: `Change ${target.label} "${target.value}" to "${newDate}"`,
        fieldLabel: target.label,
        pageNumber: target.pageNumber,
        targetText: target.value,
        replacementText: newDate,
        tableId: target.tableId,
        rowIndex: target.rowIndex,
        colIndex: target.colIndex,
        oldValue: target.value,
        newValue: newDate,
        selected: true,
        highlightBox: target.bounds,
      };

      return {
        success: true,
        found: true,
        explanation: `I found the ${target.label} field on page ${target.pageNumber}.\nCurrent value: ${target.value}\nNew value: ${newDate}`,
        changesSummary: `${target.label}: ${target.value} → ${newDate}`,
        edits: [edit],
        highlightBoxes: [
          {
            id: `hl-${edit.id}`,
            pageNumber: target.pageNumber,
            x: target.bounds?.x || 50,
            y: target.bounds?.y || 50,
            width: target.bounds?.width || 120,
            height: target.bounds?.height || 20,
            label: `${target.value} → ${newDate}`,
            actionType: 'replace',
          },
        ],
        detectedFields: catalog,
      };
    } else if (dateFields.length > 1) {
      const choices: AmbiguityChoice[] = dateFields.map((d) => ({
        label: d.label,
        oldValue: d.value,
        targetText: d.value,
        pageNumber: d.pageNumber,
        replacementText: newDate,
      }));

      const primary = dateFields[0];
      const edit: AiEditAction = {
        id: `edit-${Date.now()}`,
        type: primary.tableId ? 'update_table_cell' : 'replace_text',
        description: `Change ${primary.label} "${primary.value}" to "${newDate}"`,
        fieldLabel: primary.label,
        pageNumber: primary.pageNumber,
        targetText: primary.value,
        replacementText: newDate,
        tableId: primary.tableId,
        rowIndex: primary.rowIndex,
        colIndex: primary.colIndex,
        oldValue: primary.value,
        newValue: newDate,
        selected: true,
        highlightBox: primary.bounds,
      };

      return {
        success: true,
        found: true,
        isAmbiguous: true,
        ambiguityMessage: `I found ${dateFields.length} dates in this document. Which one should I update?`,
        ambiguityChoices: choices,
        explanation: `Multiple dates found in document. Please select which date to update.`,
        changesSummary: `Change date to ${newDate}`,
        edits: [edit],
        highlightBoxes: [
          {
            id: `hl-${edit.id}`,
            pageNumber: primary.pageNumber,
            x: primary.bounds?.x || 50,
            y: primary.bounds?.y || 50,
            width: primary.bounds?.width || 120,
            height: primary.bounds?.height || 20,
            label: `${primary.value} → ${newDate}`,
            actionType: 'replace',
          },
        ],
        detectedFields: catalog,
      };
    }
  }

  // 2. PURCHASE PRICE / PRICE / DRUM PRICE INTENT (e.g. "Change the purchase price to 208", "Change the price to 208", "Update drum price to 208", "Make the price 208 including vat", "Change purchase price from 210 to 208")
  const priceIntentMatch =
    instruction.match(/(?:change|update|set|make|replace)\s+(?:the\s+)?(?:purchase\s+price(?:\s*[\/\\–-]\s*drum)?|drum\s+price|unit\s+price|price|rate)\s+(?:from\s+[0-9A-Za-z\s]+\s+)?to\s+([^\n\r]+)/i) ||
    instruction.match(/(?:purchase\s+price|price|drum\s+price)\s*[:=]\s*([^\n\r]+)/i);

  if (priceIntentMatch) {
    const rawNewPrice = priceIntentMatch[1].trim();
    const priceFields = catalog.filter((f) => f.category === 'price' || /price|rate|drum|vat/i.test(f.label));

    if (priceFields.length > 0) {
      const target = priceFields[0];
      const oldVal = target.value;

      // Construct formatted replacement: if old had "including vat" and user only gave number "208", append "including vat"
      let formattedNewPrice = rawNewPrice;
      if (/^[0-9]+(?:\.[0-9]+)?$/.test(rawNewPrice.trim()) && /including\s+vat|incl\s+vat/i.test(oldVal)) {
        formattedNewPrice = `${rawNewPrice.trim()} including vat`;
      }

      const edit: AiEditAction = {
        id: `edit-${Date.now()}`,
        type: target.tableId ? 'update_table_cell' : 'replace_text',
        description: `Change ${target.label} "${oldVal}" to "${formattedNewPrice}"`,
        fieldLabel: target.label,
        pageNumber: target.pageNumber,
        targetText: oldVal,
        replacementText: formattedNewPrice,
        tableId: target.tableId,
        rowIndex: target.rowIndex,
        colIndex: target.colIndex,
        oldValue: oldVal,
        newValue: formattedNewPrice,
        selected: true,
        highlightBox: target.bounds,
      };

      return {
        success: true,
        found: true,
        explanation: `I found ${target.label} on page ${target.pageNumber}.\nCurrent value: ${oldVal} → New value: ${formattedNewPrice}`,
        changesSummary: `${target.label}: ${oldVal} → ${formattedNewPrice}`,
        edits: [edit],
        highlightBoxes: [
          {
            id: `hl-${edit.id}`,
            pageNumber: target.pageNumber,
            x: target.bounds?.x || 50,
            y: target.bounds?.y || 50,
            width: target.bounds?.width || 120,
            height: target.bounds?.height || 20,
            label: `${oldVal} → ${formattedNewPrice}`,
            actionType: 'update',
          },
        ],
        detectedFields: catalog,
      };
    }
  }

  // 3. QUANTITY INTENT (e.g. "Change the quantity to 10", "Change quantity of Needle Valve to 10")
  const qtyIntentMatch =
    instruction.match(/change\s+(?:the\s+)?quantity\s+(?:of\s+([^to]+)\s+)?to\s+([0-9A-Za-z\s]+)/i) ||
    instruction.match(/quantity\s*[:=]\s*([0-9A-Za-z\s]+)/i);

  if (qtyIntentMatch) {
    const specificItem = qtyIntentMatch[1]?.trim().toLowerCase();
    const rawNewQty = (qtyIntentMatch[2] || qtyIntentMatch[1]).trim();

    let targetField = catalog.find((f) => f.category === 'quantity');
    if (specificItem) {
      // Find row containing specific item
      const itemRowField = catalog.find(
        (f) => f.tableId && f.category === 'quantity' && catalog.some((other) => other.tableId === f.tableId && other.rowIndex === f.rowIndex && other.value.toLowerCase().includes(specificItem))
      );
      if (itemRowField) targetField = itemRowField;
    }

    if (targetField) {
      const oldVal = targetField.value;
      let formattedNewQty = rawNewQty;

      // Preserve suffix like "NOS" if user supplied only number
      const unitMatch = oldVal.match(/[0-9]+\s*([A-Za-z]+)/);
      if (unitMatch && /^[0-9]+$/.test(rawNewQty) && !/[A-Za-z]/.test(rawNewQty)) {
        formattedNewQty = `${rawNewQty} ${unitMatch[1]}`;
      }

      const edit: AiEditAction = {
        id: `edit-${Date.now()}`,
        type: targetField.tableId ? 'update_table_cell' : 'replace_text',
        description: `Change Quantity "${oldVal}" to "${formattedNewQty}"`,
        fieldLabel: 'Quantity',
        pageNumber: targetField.pageNumber,
        targetText: oldVal,
        replacementText: formattedNewQty,
        tableId: targetField.tableId,
        rowIndex: targetField.rowIndex,
        colIndex: targetField.colIndex,
        oldValue: oldVal,
        newValue: formattedNewQty,
        selected: true,
        highlightBox: targetField.bounds,
      };

      return {
        success: true,
        found: true,
        explanation: `I found Quantity on page ${targetField.pageNumber}.\nCurrent value: ${oldVal} → New value: ${formattedNewQty}`,
        changesSummary: `Quantity: ${oldVal} → ${formattedNewQty}`,
        edits: [edit],
        highlightBoxes: [
          {
            id: `hl-${edit.id}`,
            pageNumber: targetField.pageNumber,
            x: targetField.bounds?.x || 50,
            y: targetField.bounds?.y || 50,
            width: targetField.bounds?.width || 100,
            height: targetField.bounds?.height || 20,
            label: `${oldVal} → ${formattedNewQty}`,
            actionType: 'update',
          },
        ],
        detectedFields: catalog,
      };
    }
  }

  // 4. PURCHASER / CUSTOMER INTENT (e.g. "Change the purchaser to XYZ Trading LLC", "Update customer to ABC Corp")
  const purchaserMatch = instruction.match(/(?:change|update|set|replace)\s+(?:the\s+)?(?:purchaser|customer|company|buyer)\s*(?:name)?\s+to\s+([^\n\r]+)/i);
  if (purchaserMatch) {
    const newPurchaser = purchaserMatch[1].trim();
    const pField = catalog.find((f) => f.label.toLowerCase() === 'purchaser' || f.category === 'contact');
    if (pField) {
      const oldPurchaser = pField.value;
      const edit: AiEditAction = {
        id: `edit-${Date.now()}`,
        type: 'replace_text',
        description: `Change Purchaser "${oldPurchaser}" to "${newPurchaser}"`,
        fieldLabel: 'Purchaser',
        pageNumber: pField.pageNumber,
        targetText: oldPurchaser,
        replacementText: newPurchaser,
        oldValue: oldPurchaser,
        newValue: newPurchaser,
        selected: true,
        highlightBox: pField.bounds,
      };

      return {
        success: true,
        found: true,
        explanation: `I found Purchaser on page ${pField.pageNumber}.\nCurrent value: ${oldPurchaser} → New value: ${newPurchaser}`,
        changesSummary: `Purchaser: ${oldPurchaser} → ${newPurchaser}`,
        edits: [edit],
        highlightBoxes: [
          {
            id: `hl-${edit.id}`,
            pageNumber: pField.pageNumber,
            x: pField.bounds?.x || 50,
            y: pField.bounds?.y || 50,
            width: pField.bounds?.width || 200,
            height: pField.bounds?.height || 20,
            label: `${oldPurchaser} → ${newPurchaser}`,
            actionType: 'replace',
          },
        ],
        detectedFields: catalog,
      };
    }
  }

  // 5. EXPLICIT REPLACE: "Replace X with Y" or "Change X to Y"
  const literalMatch =
    instruction.match(/replace\s+["']?([^"']+)["']?\s+with\s+["']?([^"']+)["']?/i) ||
    instruction.match(/change\s+["']?([^"']+)["']?\s+to\s+["']?([^"']+)["']?/i);

  if (literalMatch) {
    const rawTarget = literalMatch[1].trim();
    const rawReplacement = literalMatch[2].trim();

    // Search 1: Direct or Partial match in Table Cells
    for (const field of catalog) {
      const matchResult = isFlexibleStringMatch(field.value, rawTarget);

      if (matchResult.matched) {
        let finalReplacement = rawReplacement;

        // If target was a substring of the cell (e.g. "210" inside "210 including vat"), replace only the substring
        const fieldNorm = normalizePunctuationAndOcr(field.value);
        const targetNorm = normalizePunctuationAndOcr(rawTarget);
        if (fieldNorm.includes(targetNorm) && fieldNorm.length > targetNorm.length) {
          // Replace using case-insensitive substring or regex
          const escaped = targetNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          finalReplacement = field.value.replace(new RegExp(escaped, 'i'), rawReplacement);
        }

        const edit: AiEditAction = {
          id: `edit-${Date.now()}`,
          type: field.tableId ? 'update_table_cell' : 'replace_text',
          description: `Change "${field.value}" to "${finalReplacement}"`,
          fieldLabel: field.label,
          pageNumber: field.pageNumber,
          targetText: field.value,
          replacementText: finalReplacement,
          tableId: field.tableId,
          rowIndex: field.rowIndex,
          colIndex: field.colIndex,
          oldValue: field.value,
          newValue: finalReplacement,
          selected: true,
          highlightBox: field.bounds,
        };

        return {
          success: true,
          found: true,
          explanation: `I identified "${field.value}" on page ${field.pageNumber}.\nReplacing with "${finalReplacement}".`,
          changesSummary: `${field.label ? `${field.label}: ` : ''}${field.value} → ${finalReplacement}`,
          edits: [edit],
          highlightBoxes: [
            {
              id: `hl-${edit.id}`,
              pageNumber: field.pageNumber,
              x: field.bounds?.x || 50,
              y: field.bounds?.y || 50,
              width: field.bounds?.width || 120,
              height: field.bounds?.height || 20,
              label: `${field.value} → ${finalReplacement}`,
              actionType: field.tableId ? 'update' : 'replace',
            },
          ],
          detectedFields: catalog,
        };
      }
    }

    // Search 2: Native text items / lines
    const pageItems = allPageTextItems.get(activePageNumber) || [];
    const lines = reconstructPageLines(pageItems);

    for (const line of lines) {
      const matchResult = isFlexibleStringMatch(line.text, rawTarget);
      if (matchResult.matched) {
        const edit: AiEditAction = {
          id: `edit-${Date.now()}`,
          type: 'replace_text',
          description: `Replace "${rawTarget}" with "${rawReplacement}"`,
          pageNumber: activePageNumber,
          targetText: rawTarget,
          replacementText: rawReplacement,
          selected: true,
          highlightBox: line.bounds,
        };

        return {
          success: true,
          found: true,
          explanation: `Found "${rawTarget}" on page ${activePageNumber}.\nReplacing with "${rawReplacement}".`,
          changesSummary: `Replace "${rawTarget}" with "${rawReplacement}"`,
          edits: [edit],
          highlightBoxes: [
            {
              id: `hl-${edit.id}`,
              pageNumber: activePageNumber,
              x: line.bounds.x,
              y: line.bounds.y,
              width: line.bounds.width,
              height: line.bounds.height,
              label: `${rawTarget} → ${rawReplacement}`,
              actionType: 'replace',
            },
          ],
          detectedFields: catalog,
        };
      }
    }
  }

  return {
    success: true,
    found: false,
    notFoundMessage: `I couldn't identify the specific content for "${instruction}". Tap "Show detected fields" below to see what was recognized on this document.`,
    changesSummary: 'Instruction not recognized',
    edits: [],
    highlightBoxes: [],
    detectedFields: catalog,
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
        const repText = edit.replacementText;

        // 1. Check if there's already an active TextElement on the canvas matching targetText
        const existingElIndex = page.elements.findIndex((el) => {
          if (el.type !== 'text') return false;
          const textEl = el as TextElement;
          return (
            isFlexibleStringMatch(textEl.text || '', targetClean).matched ||
            isFlexibleStringMatch(textEl.originalText || '', targetClean).matched
          );
        });

        if (existingElIndex !== -1) {
          const oldEl = page.elements[existingElIndex] as TextElement;
          let newText = repText;
          if (oldEl.text.toLowerCase().includes(targetClean.toLowerCase())) {
            const escaped = targetClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            newText = oldEl.text.replace(new RegExp(escaped, 'gi'), repText);
          }
          page.elements[existingElIndex] = {
            ...oldEl,
            text: newText,
          };
          break;
        }

        // 2. Otherwise find the exact native text item from PDF stream
        const pageItems = allPageTextItems.get(edit.pageNumber) || [];
        const matchingItem = pageItems.find(
          (it) => isFlexibleStringMatch(it.str, targetClean).matched
        );

        if (matchingItem) {
          const estFontSize = Math.max(8, Math.round(matchingItem.height * 0.95));
          let replacedFullText = repText;
          if (matchingItem.str.toLowerCase().includes(targetClean.toLowerCase())) {
            const escaped = targetClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            replacedFullText = matchingItem.str.replace(new RegExp(escaped, 'gi'), repText);
          }

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
        const targetClean = edit.targetText.trim();

        const existingElIndex = page.elements.findIndex((el) => {
          if (el.type !== 'text') return false;
          const textEl = el as TextElement;
          return (
            isFlexibleStringMatch(textEl.text || '', targetClean).matched ||
            isFlexibleStringMatch(textEl.originalText || '', targetClean).matched
          );
        });

        if (existingElIndex !== -1) {
          page.elements.splice(existingElIndex, 1);
          break;
        }

        const pageItems = allPageTextItems.get(edit.pageNumber) || [];
        const matchingItem = pageItems.find(
          (it) => isFlexibleStringMatch(it.str, targetClean).matched
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
          (el) => (edit.tableId ? el.id === edit.tableId : true) && el.type === 'table'
        );

        if (tableIndex !== -1) {
          const table = page.elements[tableIndex] as TableElement;
          let rIdx = edit.rowIndex;
          let cIdx = edit.colIndex;

          if (rIdx === undefined && edit.rowMatchText) {
            rIdx = table.rows.findIndex((r) =>
              r.some((c) => isFlexibleStringMatch(c, edit.rowMatchText!).matched)
            );
          }

          if (cIdx === undefined && edit.colHeader) {
            cIdx = table.headers.findIndex(
              (h) => isFlexibleStringMatch(h, edit.colHeader!).matched
            );
          }

          if (rIdx !== undefined && rIdx >= 0 && rIdx < table.rows.length) {
            const safeCIdx = cIdx !== undefined && cIdx >= 0 ? cIdx : 0;
            const newRows = table.rows.map((row, r) => {
              if (r !== rIdx) return [...row];
              const updatedRow = [...row];
              updatedRow[safeCIdx] = edit.newValue || edit.replacementText || '';
              return updatedRow;
            });

            page.elements[tableIndex] = {
              ...table,
              rows: newRows,
            };
          }
        } else if (edit.highlightBox) {
          // If table not found in page.elements, apply text overlay at cell bounds
          const box = edit.highlightBox;
          const repText = edit.newValue || edit.replacementText || '';
          const estFontSize = Math.max(9, Math.round(box.height * 0.85));

          const newTextEl: TextElement = {
            id: `ai-text-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            pageNumber: edit.pageNumber,
            type: 'text',
            text: repText,
            originalBounds: box,
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
            r.some((c) => isFlexibleStringMatch(c, edit.rowMatchText!).matched)
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
