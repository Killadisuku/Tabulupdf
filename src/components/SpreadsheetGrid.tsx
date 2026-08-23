import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  ArrowUpDown,
  Search,
  SlidersHorizontal,
  Table as TableIcon,
  ChevronDown,
  Sparkles,
  Layers,
  Edit2,
  Check,
  X,
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react';
import { SheetData, TableRow } from '../types';
import { inferCellValue } from '../utils/excelExport';

interface SpreadsheetGridProps {
  sheets: SheetData[];
  activeSheetId: string;
  onSelectSheet: (id: string) => void;
  onUpdateSheet: (sheet: SheetData) => void;
  onDeleteSheet: (id: string) => void;
  onAddSheet: () => void;
  onConsolidateAll: () => void;
  onOpenAiModal: () => void;
}

export const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({
  sheets,
  activeSheetId,
  onSelectSheet,
  onUpdateSheet,
  onDeleteSheet,
  onAddSheet,
  onConsolidateAll,
  onOpenAiModal,
}) => {
  const currentSheet = useMemo(
    () => sheets.find((s) => s.id === activeSheetId) || sheets[0],
    [sheets, activeSheetId]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; colIdx: number } | null>(null);
  const [cellEditValue, setCellEditValue] = useState('');
  const [editingHeaderIdx, setEditingHeaderIdx] = useState<number | null>(null);
  const [headerEditValue, setHeaderEditValue] = useState('');
  const [editingSheetNameId, setEditingSheetNameId] = useState<string | null>(null);
  const [sheetNameEditValue, setSheetNameEditValue] = useState('');
  const [sortConfig, setSortConfig] = useState<{ colIdx: number; direction: 'asc' | 'desc' } | null>(
    null
  );

  if (!currentSheet) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-slate-900">
        <FileSpreadsheet className="w-12 h-12 text-slate-700 mb-3" />
        <p className="text-sm font-semibold text-slate-400">No active worksheet</p>
        <p className="text-xs text-slate-600 mt-1">Upload a PDF or select a demo to generate data</p>
      </div>
    );
  }

  // Filter and Sort rows
  const displayedRows = useMemo(() => {
    let rows = currentSheet.rows.map((row, originalIndex) => ({
      originalIndex,
      data: row,
    }));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((r) =>
        r.data.some((cell) => String(cell || '').toLowerCase().includes(q))
      );
    }

    if (sortConfig !== null) {
      const { colIdx, direction } = sortConfig;
      rows.sort((a, b) => {
        const valA = a.data[colIdx] ?? '';
        const valB = b.data[colIdx] ?? '';
        const inferredA = inferCellValue(valA);
        const inferredB = inferCellValue(valB);

        if (typeof inferredA.v === 'number' && typeof inferredB.v === 'number') {
          return direction === 'asc' ? inferredA.v - inferredB.v : inferredB.v - inferredA.v;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return direction === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    return rows;
  }, [currentSheet.rows, searchQuery, sortConfig]);

  // Column data type inference
  const columnDataTypes = useMemo(() => {
    return currentSheet.headers.map((_, colIdx) => {
      const sampleCells = currentSheet.rows
        .slice(0, 10)
        .map((r) => r[colIdx])
        .filter(Boolean);
      if (sampleCells.length === 0) return 'text';

      let numCount = 0;
      let currencyCount = 0;
      let dateCount = 0;

      sampleCells.forEach((c) => {
        const inferred = inferCellValue(c);
        if (typeof inferred.v === 'number') {
          numCount++;
          if (/[$€£¥]/.test(c)) currencyCount++;
        } else if (/\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}/.test(c)) {
          dateCount++;
        }
      });

      if (currencyCount > sampleCells.length * 0.5) return 'currency';
      if (numCount > sampleCells.length * 0.5) return 'number';
      if (dateCount > sampleCells.length * 0.5) return 'date';
      return 'text';
    });
  }, [currentSheet.headers, currentSheet.rows]);

  // Cell Editing
  const startEditingCell = (rowIdx: number, colIdx: number, currentVal: string) => {
    setEditingCell({ rowIdx, colIdx });
    setCellEditValue(currentVal || '');
  };

  const saveEditingCell = () => {
    if (!editingCell) return;
    const newRows = currentSheet.rows.map((row, rIdx) => {
      if (rIdx === editingCell.rowIdx) {
        const updated = [...row];
        updated[editingCell.colIdx] = cellEditValue;
        return updated;
      }
      return row;
    });
    onUpdateSheet({ ...currentSheet, rows: newRows });
    setEditingCell(null);
  };

  // Header Editing
  const startEditingHeader = (colIdx: number, currentVal: string) => {
    setEditingHeaderIdx(colIdx);
    setHeaderEditValue(currentVal);
  };

  const saveEditingHeader = () => {
    if (editingHeaderIdx === null) return;
    const newHeaders = [...currentSheet.headers];
    newHeaders[editingHeaderIdx] = headerEditValue.trim() || `Column ${editingHeaderIdx + 1}`;
    onUpdateSheet({ ...currentSheet, headers: newHeaders });
    setEditingHeaderIdx(null);
  };

  // Sheet Name Editing
  const saveSheetName = (sheetId: string) => {
    if (!sheetNameEditValue.trim()) return;
    const sheet = sheets.find((s) => s.id === sheetId);
    if (sheet) {
      onUpdateSheet({ ...sheet, name: sheetNameEditValue.trim() });
    }
    setEditingSheetNameId(null);
  };

  // Sorting
  const toggleSort = (colIdx: number) => {
    if (sortConfig && sortConfig.colIdx === colIdx) {
      if (sortConfig.direction === 'asc') {
        setSortConfig({ colIdx, direction: 'desc' });
      } else {
        setSortConfig(null);
      }
    } else {
      setSortConfig({ colIdx, direction: 'asc' });
    }
  };

  // Row Manipulation
  const handleAddRow = () => {
    const emptyRow = new Array(currentSheet.headers.length).fill('');
    onUpdateSheet({ ...currentSheet, rows: [...currentSheet.rows, emptyRow] });
  };

  const handleDeleteRow = (originalRowIdx: number) => {
    const newRows = currentSheet.rows.filter((_, idx) => idx !== originalRowIdx);
    onUpdateSheet({ ...currentSheet, rows: newRows });
  };

  const handlePromoteRowToHeader = (originalRowIdx: number) => {
    const targetRow = currentSheet.rows[originalRowIdx];
    const remainingRows = currentSheet.rows.filter((_, idx) => idx !== originalRowIdx);
    const newHeaders = targetRow.map((c, i) => (c && c.trim() ? c.trim() : `Column ${i + 1}`));
    onUpdateSheet({ ...currentSheet, headers: newHeaders, rows: remainingRows });
  };

  // Column Manipulation
  const handleAddColumn = (afterColIdx: number) => {
    const newHeaders = [...currentSheet.headers];
    newHeaders.splice(afterColIdx + 1, 0, `Column ${newHeaders.length + 1}`);

    const newRows = currentSheet.rows.map((row) => {
      const updated = [...row];
      updated.splice(afterColIdx + 1, 0, '');
      return updated;
    });

    onUpdateSheet({ ...currentSheet, headers: newHeaders, rows: newRows });
  };

  const handleDeleteColumn = (colIdx: number) => {
    if (currentSheet.headers.length <= 1) return;
    const newHeaders = currentSheet.headers.filter((_, i) => i !== colIdx);
    const newRows = currentSheet.rows.map((row) => row.filter((_, i) => i !== colIdx));
    onUpdateSheet({ ...currentSheet, headers: newHeaders, rows: newRows });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden">
      {/* Sheet Tabs Bar */}
      <div className="h-12 bg-slate-950 border-b border-slate-800 px-3 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
          {sheets.map((sheet) => {
            const isActive = sheet.id === currentSheet.id;
            return (
              <div
                key={sheet.id}
                onClick={() => onSelectSheet(sheet.id)}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all border whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-850 text-emerald-400 border-emerald-500/30 shadow-sm font-semibold'
                    : 'text-slate-400 border-transparent hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                {editingSheetNameId === sheet.id ? (
                  <input
                    type="text"
                    value={sheetNameEditValue}
                    autoFocus
                    onChange={(e) => setSheetNameEditValue(e.target.value)}
                    onBlur={() => saveSheetName(sheet.id)}
                    onKeyDown={(e) => e.key === 'Enter' && saveSheetName(sheet.id)}
                    className="bg-slate-950 text-white px-1 py-0.5 rounded text-xs outline-none border border-emerald-500 w-24"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingSheetNameId(sheet.id);
                      setSheetNameEditValue(sheet.name);
                    }}
                    title="Double-click to rename"
                  >
                    {sheet.name}
                  </span>
                )}

                <span className="text-[10px] text-slate-500 px-1 py-0.2 rounded bg-slate-950/60 font-mono">
                  {sheet.rows.length}r
                </span>

                {sheets.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSheet(sheet.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 transition-opacity"
                    title="Delete Sheet"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={onAddSheet}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Add New Sheet"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Consolidate Pages Action */}
        {sheets.length > 1 && (
          <button
            onClick={onConsolidateAll}
            className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300 hover:text-emerald-400 bg-slate-900 border border-slate-800 hover:border-emerald-500/30 px-2.5 py-1 rounded-lg transition-all"
            title="Merge all page sheets into one consolidated master worksheet"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Consolidate All</span>
          </button>
        )}
      </div>

      {/* Grid Sub-header & Search Filter */}
      <div className="h-11 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative w-48 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search table rows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <span className="text-slate-400 text-[11px]">
            Showing <strong className="text-white">{displayedRows.length}</strong> of{' '}
            <strong className="text-white">{currentSheet.rows.length}</strong> rows ×{' '}
            <strong className="text-white">{currentSheet.headers.length}</strong> cols
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAddRow}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 flex items-center gap-1 transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add Row</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet Table Viewport */}
      <div className="flex-1 overflow-auto bg-slate-950 font-sans text-xs">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 shadow-sm">
            <tr>
              {/* Row index header */}
              <th className="w-12 px-2 py-2 text-center text-[10px] font-mono uppercase text-slate-500 border-r border-slate-800 bg-slate-900/90 select-none">
                #
              </th>

              {currentSheet.headers.map((header, colIdx) => {
                const dataType = columnDataTypes[colIdx];
                const isSorted = sortConfig?.colIdx === colIdx;

                return (
                  <th
                    key={colIdx}
                    className="group px-3 py-2 border-r border-slate-800 min-w-[140px] max-w-[260px] select-none hover:bg-slate-850 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      {editingHeaderIdx === colIdx ? (
                        <input
                          type="text"
                          value={headerEditValue}
                          autoFocus
                          onChange={(e) => setHeaderEditValue(e.target.value)}
                          onBlur={saveEditingHeader}
                          onKeyDown={(e) => e.key === 'Enter' && saveEditingHeader()}
                          className="bg-slate-950 text-white px-1.5 py-0.5 rounded text-xs outline-none border border-emerald-500 w-full font-bold"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div
                          className="flex items-center gap-1.5 truncate cursor-pointer flex-1"
                          onClick={() => toggleSort(colIdx)}
                          title="Click to sort / Double click to rename"
                          onDoubleClick={() => startEditingHeader(colIdx, header)}
                        >
                          <span className="font-bold text-slate-200 truncate">{header}</span>
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-mono uppercase ${
                              dataType === 'currency'
                                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40'
                                : dataType === 'number'
                                ? 'bg-blue-950/80 text-blue-400 border border-blue-800/40'
                                : dataType === 'date'
                                ? 'bg-purple-950/80 text-purple-400 border border-purple-800/40'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {dataType}
                          </span>
                        </div>
                      )}

                      {/* Header Column Actions */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleAddColumn(colIdx)}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400"
                          title="Insert column to right"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        {currentSheet.headers.length > 1 && (
                          <button
                            onClick={() => handleDeleteColumn(colIdx)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400"
                            title="Delete column"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60">
            {displayedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={currentSheet.headers.length + 1}
                  className="py-12 text-center text-slate-500 text-xs"
                >
                  No rows found matching &quot;{searchQuery}&quot;
                </td>
              </tr>
            ) : (
              displayedRows.map(({ originalIndex, data }) => (
                <tr
                  key={originalIndex}
                  className="group hover:bg-slate-900/70 transition-colors"
                >
                  {/* Row Number & Actions */}
                  <td className="w-12 px-2 py-1.5 text-center text-[10px] font-mono text-slate-500 border-r border-slate-800 bg-slate-950/50 select-none relative">
                    <span className="group-hover:hidden">{originalIndex + 1}</span>
                    <div className="hidden group-hover:flex items-center justify-center gap-1">
                      <button
                        onClick={() => handlePromoteRowToHeader(originalIndex)}
                        className="p-0.5 text-slate-400 hover:text-amber-400"
                        title="Set this row as table header"
                      >
                        <TableIcon className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteRow(originalIndex)}
                        className="p-0.5 text-slate-400 hover:text-red-400"
                        title="Delete row"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>

                  {/* Cell Values */}
                  {currentSheet.headers.map((_, colIdx) => {
                    const cellVal = data[colIdx] || '';
                    const isEditing =
                      editingCell?.rowIdx === originalIndex &&
                      editingCell?.colIdx === colIdx;

                    return (
                      <td
                        key={colIdx}
                        onClick={() => startEditingCell(originalIndex, colIdx, cellVal)}
                        className={`px-3 py-1.5 border-r border-slate-800/80 truncate max-w-[260px] cursor-text transition-colors ${
                          isEditing
                            ? 'bg-slate-900 p-0'
                            : 'text-slate-300 hover:bg-slate-850/50'
                        }`}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            value={cellEditValue}
                            autoFocus
                            onChange={(e) => setCellEditValue(e.target.value)}
                            onBlur={saveEditingCell}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditingCell();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="w-full px-2 py-1 bg-slate-950 text-white text-xs border border-emerald-500 outline-none rounded-none"
                          />
                        ) : (
                          <span className="truncate block select-text">
                            {cellVal || <span className="text-slate-600 italic">-</span>}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
