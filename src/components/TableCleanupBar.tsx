import React, { useState } from 'react';
import {
  Wand2,
  Scissors,
  DollarSign,
  Sparkles,
  Eraser,
  Split,
  Combine,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  FileCode2
} from 'lucide-react';
import { SheetData, TableRow } from '../types';

interface TableCleanupBarProps {
  currentSheet: SheetData;
  onUpdateSheet: (sheet: SheetData) => void;
  onOpenFindReplace: () => void;
  onOpenSplitMerge: () => void;
  onOpenAiModal: () => void;
}

export const TableCleanupBar: React.FC<TableCleanupBarProps> = ({
  currentSheet,
  onUpdateSheet,
  onOpenFindReplace,
  onOpenSplitMerge,
  onOpenAiModal,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Trim whitespace
  const handleTrimWhitespace = () => {
    const newHeaders = currentSheet.headers.map((h) => h.trim());
    const newRows = currentSheet.rows.map((row) =>
      row.map((cell) => (typeof cell === 'string' ? cell.trim().replace(/\s+/g, ' ') : cell))
    );
    onUpdateSheet({ ...currentSheet, headers: newHeaders, rows: newRows });
    showToast('Cleaned & trimmed whitespace in all cells.');
  };

  // 2. Strip currency symbols & commas
  const handleStripCurrencies = () => {
    const newRows = currentSheet.rows.map((row) =>
      row.map((cell) => {
        if (typeof cell === 'string') {
          // If resembles currency e.g. $1,234.50 -> 1234.50
          if (/^[$€£¥₹\s]*-?\d+([.,]\d+)?/.test(cell.trim())) {
            return cell
              .replace(/[$€£¥₹]/g, '')
              .replace(/,/g, '')
              .trim();
          }
        }
        return cell;
      })
    );
    onUpdateSheet({ ...currentSheet, rows: newRows });
    showToast('Removed currency symbols and thousand-separators for clean numeric export.');
  };

  // 3. Remove empty rows
  const handleRemoveEmptyRows = () => {
    const initialCount = currentSheet.rows.length;
    const newRows = currentSheet.rows.filter((row) =>
      row.some((cell) => cell && String(cell).trim() !== '')
    );
    const removed = initialCount - newRows.length;
    onUpdateSheet({ ...currentSheet, rows: newRows });
    showToast(`Removed ${removed} empty row(s).`);
  };

  // 4. Remove empty columns
  const handleRemoveEmptyColumns = () => {
    const initialCols = currentSheet.headers.length;
    const nonEmptyColIndices: number[] = [];

    for (let c = 0; c < currentSheet.headers.length; c++) {
      const hasContent =
        (currentSheet.headers[c] && currentSheet.headers[c].trim() !== '') ||
        currentSheet.rows.some((r) => r[c] && String(r[c]).trim() !== '');
      if (hasContent) {
        nonEmptyColIndices.push(c);
      }
    }

    if (nonEmptyColIndices.length === 0) return;

    const newHeaders = nonEmptyColIndices.map((i) => currentSheet.headers[i]);
    const newRows = currentSheet.rows.map((row) => nonEmptyColIndices.map((i) => row[i] || ''));

    onUpdateSheet({ ...currentSheet, headers: newHeaders, rows: newRows });
    showToast(`Cleaned table columns (kept ${newHeaders.length} active columns).`);
  };

  return (
    <div className="bg-slate-900 border-t border-slate-800 px-4 py-2.5 flex items-center justify-between gap-3 text-xs shrink-0 select-none">
      {/* Tools Group */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <span className="text-[11px] font-bold uppercase text-slate-500 mr-1 flex items-center gap-1">
          <Wand2 className="w-3 h-3 text-emerald-400" /> Tools:
        </span>

        <button
          onClick={handleTrimWhitespace}
          className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 flex items-center gap-1.5 transition-all whitespace-nowrap"
          title="Remove excess whitespace & clean cell text"
        >
          <Scissors className="w-3 h-3 text-cyan-400" />
          <span>Trim Spaces</span>
        </button>

        <button
          onClick={handleStripCurrencies}
          className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 flex items-center gap-1.5 transition-all whitespace-nowrap"
          title="Clean currency symbols ($ € £) and commas into plain numbers"
        >
          <DollarSign className="w-3 h-3 text-emerald-400" />
          <span>Clean Numbers</span>
        </button>

        <button
          onClick={handleRemoveEmptyRows}
          className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 flex items-center gap-1.5 transition-all whitespace-nowrap"
          title="Purge completely empty rows"
        >
          <Eraser className="w-3 h-3 text-amber-400" />
          <span>Remove Empty Rows</span>
        </button>

        <button
          onClick={handleRemoveEmptyColumns}
          className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 flex items-center gap-1.5 transition-all whitespace-nowrap"
          title="Purge empty columns"
        >
          <Layers className="w-3 h-3 text-slate-400" />
          <span>Purge Empty Cols</span>
        </button>

        <div className="w-px h-4 bg-slate-800 mx-1" />

        <button
          onClick={onOpenSplitMerge}
          className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 flex items-center gap-1.5 transition-all whitespace-nowrap"
          title="Split or merge columns"
        >
          <Split className="w-3 h-3 text-blue-400" />
          <span>Split / Merge Cols</span>
        </button>

        <button
          onClick={onOpenFindReplace}
          className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 flex items-center gap-1.5 transition-all whitespace-nowrap"
          title="Find and replace text"
        >
          <Search className="w-3 h-3 text-purple-400" />
          <span>Find & Replace</span>
        </button>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-[11px] font-medium animate-in fade-in shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
