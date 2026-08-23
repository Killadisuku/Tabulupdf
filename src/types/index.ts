export interface CellValue {
  raw: string;
  type: 'string' | 'number' | 'date' | 'currency' | 'percentage';
  formatted?: string;
}

export type TableRow = string[];
export type TableData = TableRow[];

export interface SheetData {
  id: string;
  name: string;
  pageNumber: number;
  headers: string[];
  rows: TableRow[];
  extractedAt?: number;
  isAiExtracted?: boolean;
  confidence?: number;
  selectedRegion?: {
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
  } | null;
}

export interface PdfDocumentInfo {
  name: string;
  size: number;
  totalPages: number;
  file: File | null;
  arrayBuffer: ArrayBuffer | null;
  pagesTextPreview?: string[];
}

export interface ExtractionOptions {
  mode: 'auto' | 'heuristic' | 'ai';
  selectedPages: 'all' | 'current' | 'custom';
  customPageRange: string;
  combinePagesToOneSheet: boolean;
  firstRowIsHeader: boolean;
  detectDataTypes: boolean;
  trimWhitespace: boolean;
  removeEmptyRows: boolean;
  aiPrompt?: string;
  preset?: TablePreset;
}

export type TablePreset = 'general' | 'bank_statement' | 'invoice' | 'sales_report' | 'inventory';

export interface BatchItem {
  id: string;
  file: File;
  name: string;
  size: number;
  status: 'queued' | 'processing' | 'done' | 'error';
  progress: number;
  totalPages?: number;
  sheets?: SheetData[];
  error?: string;
}

export interface AiExtractionRequest {
  imageBase64?: string;
  pageText?: string;
  pageNumber: number;
  customPrompt?: string;
  preset?: TablePreset;
}

export interface AiExtractionResponse {
  success: boolean;
  tableName?: string;
  headers: string[];
  rows: TableRow[];
  summary?: string;
  confidence?: number;
  error?: string;
}
