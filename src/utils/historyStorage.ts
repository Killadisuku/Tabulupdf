export interface HistoryItem {
  id: string;
  fileName: string;
  outputFormat: 'xlsx' | 'docx' | 'csv' | 'pptx' | 'images' | 'txt' | 'html' | 'json' | 'xml' | 'merged_pdf' | 'split_pdf' | 'compressed_pdf' | 'rotated_pdf' | 'edited_pdf';
  outputName: string;
  timestamp: number;
  originalSize: number;
  status: 'completed' | 'failed';
  pagesCount?: number;
  tableCount?: number;
}

const HISTORY_STORAGE_KEY = 'tabulapdf_conversion_history_v1';

export function getConversionHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to read history from localStorage:', e);
    return [];
  }
}

export function saveConversionHistoryItem(item: Omit<HistoryItem, 'id' | 'timestamp'>): HistoryItem {
  const newItem: HistoryItem = {
    ...item,
    id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    timestamp: Date.now(),
  };

  try {
    const history = getConversionHistory();
    // Keep max 50 recent records
    const updated = [newItem, ...history.filter((h) => h.fileName !== item.fileName || h.outputFormat !== item.outputFormat)].slice(0, 50);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save history item:', e);
  }

  return newItem;
}

export function removeHistoryItem(id: string) {
  try {
    const history = getConversionHistory();
    const updated = history.filter((h) => h.id !== id);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete history item:', e);
  }
}

export function clearConversionHistory() {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch (e) {}
}
