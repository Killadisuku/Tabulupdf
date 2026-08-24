import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Check,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sparkles,
  Palette,
  Calculator,
  Grid
} from 'lucide-react';
import { TableElement } from '../../types/editor';

interface TableEditorModalProps {
  isOpen: boolean;
  tableElement: TableElement | null;
  onClose: () => void;
  onSave: (updated: TableElement) => void;
}

export const TableEditorModal: React.FC<TableEditorModalProps> = ({
  isOpen,
  tableElement,
  onClose,
  onSave,
}) => {
  if (!isOpen || !tableElement) return null;

  const [headers, setHeaders] = useState<string[]>([...(tableElement.headers || ['Item', 'Description', 'Qty', 'Price'])]);
  const [rows, setRows] = useState<string[][]>(
    tableElement.rows && tableElement.rows.length > 0
      ? tableElement.rows.map((r) => [...r])
      : [
          ['001', 'Widget A', '5', '$120.00'],
          ['002', 'Widget B', '10', '$35.00'],
        ]
  );
  const [headerBgColor, setHeaderBgColor] = useState<string>(tableElement.headerBgColor || '#1e293b');
  const [headerTextColor, setHeaderTextColor] = useState<string>(tableElement.headerTextColor || '#ffffff');
  const [borderColor, setBorderColor] = useState<string>(tableElement.borderColor || '#cbd5e1');
  const [fontSize, setFontSize] = useState<number>(tableElement.fontSize || 9);

  // Row operations
  const handleAddRow = () => {
    const emptyRow = new Array(headers.length).fill('');
    setRows([...rows, emptyRow]);
  };

  const handleDeleteRow = (rowIndex: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, idx) => idx !== rowIndex));
  };

  // Column operations
  const handleAddColumn = () => {
    setHeaders([...headers, `Col ${headers.length + 1}`]);
    setRows(rows.map((row) => [...row, '']));
  };

  const handleDeleteColumn = (colIndex: number) => {
    if (headers.length <= 1) return;
    setHeaders(headers.filter((_, idx) => idx !== colIndex));
    setRows(rows.map((row) => row.filter((_, idx) => idx !== colIndex)));
  };

  // Cell change
  const handleHeaderChange = (colIndex: number, val: string) => {
    const updated = [...headers];
    updated[colIndex] = val;
    setHeaders(updated);
  };

  const handleCellChange = (rowIndex: number, colIndex: number, val: string) => {
    const updated = [...rows];
    updated[rowIndex] = [...updated[rowIndex]];
    updated[rowIndex][colIndex] = val;
    setRows(updated);
  };

  // Auto calculate sum for a column
  const handleAutoSumColumn = (colIndex: number) => {
    let sum = 0;
    let numericFound = false;
    rows.forEach((row) => {
      const raw = (row[colIndex] || '').replace(/[^0-9.-]+/g, '');
      const num = parseFloat(raw);
      if (!isNaN(num)) {
        sum += num;
        numericFound = true;
      }
    });

    if (numericFound) {
      const totalRow = new Array(headers.length).fill('');
      totalRow[0] = 'Total';
      totalRow[colIndex] = sum % 1 === 0 ? sum.toString() : sum.toFixed(2);
      setRows([...rows, totalRow]);
    }
  };

  const handleSave = () => {
    onSave({
      ...tableElement,
      headers,
      rows,
      headerBgColor,
      headerTextColor,
      borderColor,
      fontSize,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">Edit Table on PDF</h3>
              <p className="text-xs text-slate-400">
                Modify cells, add/remove rows & columns directly on this document
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAddRow}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Row
            </button>
            <button
              onClick={handleAddColumn}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Column
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Table Content Area */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          <div className="border border-slate-700 rounded-xl overflow-hidden shadow-inner bg-slate-950">
            <div className="overflow-x-auto max-h-[50vh]">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr style={{ backgroundColor: headerBgColor }}>
                    <th className="w-10 px-2 py-2 text-slate-400 font-normal border-b border-r border-slate-700/50 text-center">
                      #
                    </th>
                    {headers.map((hdr, colIdx) => (
                      <th
                        key={colIdx}
                        className="px-2 py-2 border-b border-r border-slate-700/50 relative group"
                        style={{ color: headerTextColor }}
                      >
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={hdr}
                            onChange={(e) => handleHeaderChange(colIdx, e.target.value)}
                            className="w-full bg-transparent font-semibold focus:outline-none border-b border-transparent focus:border-emerald-400 px-1"
                          />
                          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleAutoSumColumn(colIdx)}
                              title="Auto Sum Column"
                              className="p-1 hover:text-emerald-400 text-slate-400 rounded"
                            >
                              <Calculator className="w-3 h-3" />
                            </button>
                            {headers.length > 1 && (
                              <button
                                onClick={() => handleDeleteColumn(colIdx)}
                                title="Delete Column"
                                className="p-1 hover:text-rose-400 text-slate-400 rounded"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-slate-900/50 transition-colors group">
                      <td className="w-10 px-2 py-1.5 text-slate-500 border-r border-slate-800 text-center font-mono text-[10px]">
                        <div className="flex items-center justify-center gap-1">
                          <span>{rowIdx + 1}</span>
                          {rows.length > 1 && (
                            <button
                              onClick={() => handleDeleteRow(rowIdx)}
                              title="Delete Row"
                              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-opacity"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      {headers.map((_, colIdx) => (
                        <td key={colIdx} className="p-0 border-r border-slate-800/80">
                          <input
                            type="text"
                            value={row[colIdx] || ''}
                            onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-transparent text-slate-200 focus:outline-none focus:bg-emerald-950/30 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Style Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400">Header Color:</span>
                <input
                  type="color"
                  value={headerBgColor}
                  onChange={(e) => setHeaderBgColor(e.target.value)}
                  className="w-7 h-7 rounded border border-slate-700 cursor-pointer bg-transparent"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Border:</span>
                <input
                  type="color"
                  value={borderColor}
                  onChange={(e) => setBorderColor(e.target.value)}
                  className="w-7 h-7 rounded border border-slate-700 cursor-pointer bg-transparent"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Font Size:</span>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 focus:outline-none"
                >
                  {[7, 8, 9, 10, 11, 12, 14].map((size) => (
                    <option key={size} value={size}>
                      {size} pt
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-[11px] text-slate-500">
              💡 Press Tab to quickly move between cells
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/10 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            Apply Changes to PDF
          </button>
        </div>
      </div>
    </div>
  );
};
