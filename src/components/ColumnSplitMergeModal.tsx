import React, { useState } from 'react';
import { Split, Combine, X, Check, ArrowRight, Table } from 'lucide-react';
import { SheetData, TableRow } from '../types';

interface ColumnSplitMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSheet: SheetData;
  onUpdateSheet: (sheet: SheetData) => void;
}

export const ColumnSplitMergeModal: React.FC<ColumnSplitMergeModalProps> = ({
  isOpen,
  onClose,
  currentSheet,
  onUpdateSheet,
}) => {
  const [activeTab, setActiveTab] = useState<'split' | 'merge'>('split');

  // Split state
  const [splitColIdx, setSplitColIdx] = useState<number>(0);
  const [splitDelimiter, setSplitDelimiter] = useState<string>(' ');
  const [newCol1Name, setNewCol1Name] = useState('Part 1');
  const [newCol2Name, setNewCol2Name] = useState('Part 2');

  // Merge state
  const [selectedMergeCols, setSelectedMergeCols] = useState<number[]>([0, 1]);
  const [mergeDelimiter, setMergeDelimiter] = useState<string>(' ');
  const [mergedColName, setMergedColName] = useState('Merged Column');
  const [deleteOriginals, setDeleteOriginals] = useState(false);

  if (!isOpen) return null;

  // Execute Split
  const handleExecuteSplit = () => {
    const targetHeader = currentSheet.headers[splitColIdx];
    const newHeaders = [...currentSheet.headers];
    newHeaders.splice(
      splitColIdx,
      1,
      newCol1Name.trim() || `${targetHeader} 1`,
      newCol2Name.trim() || `${targetHeader} 2`
    );

    const newRows = currentSheet.rows.map((row) => {
      const cellVal = String(row[splitColIdx] || '');
      const parts = cellVal.split(splitDelimiter);
      const part1 = parts[0] || '';
      const part2 = parts.slice(1).join(splitDelimiter) || '';

      const updated = [...row];
      updated.splice(splitColIdx, 1, part1, part2);
      return updated;
    });

    onUpdateSheet({ ...currentSheet, headers: newHeaders, rows: newRows });
    onClose();
  };

  // Execute Merge
  const handleExecuteMerge = () => {
    if (selectedMergeCols.length < 2) return;

    const newHeaders = [...currentSheet.headers, mergedColName.trim() || 'Merged Column'];

    const newRows = currentSheet.rows.map((row) => {
      const mergedVal = selectedMergeCols
        .map((idx) => row[idx] || '')
        .filter((v) => v.trim() !== '')
        .join(mergeDelimiter);

      return [...row, mergedVal];
    });

    if (deleteOriginals) {
      // Filter out original columns
      const colsToKeep = currentSheet.headers
        .map((_, i) => i)
        .filter((i) => !selectedMergeCols.includes(i));
      colsToKeep.push(newHeaders.length - 1); // keep the new merged column

      const finalHeaders = colsToKeep.map((i) => newHeaders[i]);
      const finalRows = newRows.map((r) => colsToKeep.map((i) => r[i]));

      onUpdateSheet({ ...currentSheet, headers: finalHeaders, rows: finalRows });
    } else {
      onUpdateSheet({ ...currentSheet, headers: newHeaders, rows: newRows });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Split className="w-3.5 h-3.5" />
            </div>
            <h3 className="font-bold text-white text-sm">Split / Merge Columns</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-5 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('split')}
            className={`pb-2 px-3 font-semibold transition-all border-b-2 ${
              activeTab === 'split'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Split Column
          </button>
          <button
            onClick={() => setActiveTab('merge')}
            className={`pb-2 px-3 font-semibold transition-all border-b-2 ${
              activeTab === 'merge'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Merge Columns
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-slate-300">
          {activeTab === 'split' ? (
            <>
              <div>
                <label className="block font-semibold text-slate-200 mb-1">
                  Select Column to Split
                </label>
                <select
                  value={splitColIdx}
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    setSplitColIdx(idx);
                    const h = currentSheet.headers[idx];
                    setNewCol1Name(`${h} (1)`);
                    setNewCol2Name(`${h} (2)`);
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                >
                  {currentSheet.headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-200 mb-1">Delimiter</label>
                <div className="flex gap-2">
                  {[
                    { label: 'Space (" ")', val: ' ' },
                    { label: 'Comma (",")', val: ',' },
                    { label: 'Dash ("-")', val: '-' },
                    { label: 'Slash ("/")', val: '/' },
                  ].map((d) => (
                    <button
                      key={d.val}
                      type="button"
                      onClick={() => setSplitDelimiter(d.val)}
                      className={`px-3 py-1.5 rounded-lg border text-xs cursor-pointer ${
                        splitDelimiter === d.val
                          ? 'bg-blue-950/60 border-blue-500 text-white font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-200 mb-1">Column 1 Name</label>
                  <input
                    type="text"
                    value={newCol1Name}
                    onChange={(e) => setNewCol1Name(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-200 mb-1">Column 2 Name</label>
                  <input
                    type="text"
                    value={newCol2Name}
                    onChange={(e) => setNewCol2Name(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Split Preview */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="font-semibold text-[10px] text-slate-500 uppercase tracking-wider">
                  Preview (Sample Rows)
                </span>
                {currentSheet.rows.slice(0, 3).map((r, i) => {
                  const val = String(r[splitColIdx] || '');
                  const parts = val.split(splitDelimiter);
                  return (
                    <div key={i} className="flex items-center gap-2 text-[11px]">
                      <span className="text-slate-400 truncate max-w-[120px]">{val || '-'}</span>
                      <ArrowRight className="w-3 h-3 text-slate-600" />
                      <span className="text-blue-400 font-mono bg-slate-900 px-1.5 py-0.5 rounded">
                        {parts[0] || '""'}
                      </span>
                      <span className="text-blue-400 font-mono bg-slate-900 px-1.5 py-0.5 rounded">
                        {parts.slice(1).join(splitDelimiter) || '""'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block font-semibold text-slate-200 mb-2">
                  Select Columns to Combine
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {currentSheet.headers.map((h, i) => {
                    const isChecked = selectedMergeCols.includes(i);
                    return (
                      <label
                        key={i}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMergeCols([...selectedMergeCols, i]);
                            } else {
                              setSelectedMergeCols(selectedMergeCols.filter((idx) => idx !== i));
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-slate-200">{h}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-200 mb-1">Merge Separator</label>
                <input
                  type="text"
                  value={mergeDelimiter}
                  onChange={(e) => setMergeDelimiter(e.target.value)}
                  placeholder="e.g. - or , or space"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-200 mb-1">Output Column Name</label>
                <input
                  type="text"
                  value={mergedColName}
                  onChange={(e) => setMergedColName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={deleteOriginals}
                  onChange={(e) => setDeleteOriginals(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Delete original source columns after merging</span>
              </label>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={activeTab === 'split' ? handleExecuteSplit : handleExecuteMerge}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors cursor-pointer"
          >
            {activeTab === 'split' ? 'Apply Split' : 'Merge Columns'}
          </button>
        </div>
      </div>
    </div>
  );
};
