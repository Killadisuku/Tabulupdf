import React, { useState } from 'react';
import { Search, Replace, X, CheckCircle2, Check } from 'lucide-react';
import { SheetData } from '../types';

interface FindReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSheet: SheetData;
  onUpdateSheet: (sheet: SheetData) => void;
}

export const FindReplaceModal: React.FC<FindReplaceModalProps> = ({
  isOpen,
  onClose,
  currentSheet,
  onUpdateSheet,
}) => {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<string>('all');
  const [replacedCount, setReplacedCount] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleExecuteReplace = () => {
    if (!findText) return;

    let count = 0;
    const targetColIdx =
      selectedColumn === 'all' ? -1 : currentSheet.headers.indexOf(selectedColumn);

    const newRows = currentSheet.rows.map((row) =>
      row.map((cell, colIdx) => {
        if (targetColIdx !== -1 && colIdx !== targetColIdx) {
          return cell;
        }

        const cellStr = String(cell || '');
        let newCell = cellStr;

        if (matchCase) {
          if (cellStr.includes(findText)) {
            const matches = cellStr.split(findText).length - 1;
            count += matches;
            newCell = cellStr.replaceAll(findText, replaceText);
          }
        } else {
          const regex = new RegExp(
            findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            'gi'
          );
          const matches = (cellStr.match(regex) || []).length;
          if (matches > 0) {
            count += matches;
            newCell = cellStr.replace(regex, replaceText);
          }
        }

        return newCell;
      })
    );

    onUpdateSheet({ ...currentSheet, rows: newRows });
    setReplacedCount(count);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden text-xs">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <Replace className="w-4 h-4 text-purple-400" />
            <h3 className="font-bold text-white text-sm">Find & Replace</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-slate-300">
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">Find Text</label>
            <input
              type="text"
              value={findText}
              autoFocus
              onChange={(e) => {
                setFindText(e.target.value);
                setReplacedCount(null);
              }}
              placeholder="e.g. USD or N/A or typo"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">Replace With</label>
            <input
              type="text"
              value={replaceText}
              onChange={(e) => {
                setReplaceText(e.target.value);
                setReplacedCount(null);
              }}
              placeholder="e.g. $ or leave empty to delete"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">Apply to Column</label>
            <select
              value={selectedColumn}
              onChange={(e) => setSelectedColumn(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Columns</option>
              {currentSheet.headers.map((h, i) => (
                <option key={i} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={matchCase}
              onChange={(e) => setMatchCase(e.target.checked)}
              className="rounded border-slate-700 text-purple-600 focus:ring-purple-500"
            />
            <span>Match Case (Exact capitalization)</span>
          </label>

          {replacedCount !== null && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>
                Successfully replaced <strong>{replacedCount}</strong> occurrence(s).
              </span>
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-white"
          >
            Close
          </button>
          <button
            onClick={handleExecuteReplace}
            disabled={!findText}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold disabled:opacity-40 transition-colors cursor-pointer"
          >
            Replace All
          </button>
        </div>
      </div>
    </div>
  );
};
