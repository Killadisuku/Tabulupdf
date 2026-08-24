import React, { useState, useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  SlidersHorizontal,
  Trash2,
  Check,
  X,
  Undo2,
  Redo2,
  Table as TableIcon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { TextElement, TableElement } from '../../types/editor';

export interface SelectedTableCellInfo {
  table: TableElement;
  rowIndex: number; // -1 for headers
  colIndex: number;
  text: string;
}

interface CompactTextEditorProps {
  // Either a TextElement OR a Table cell is being edited
  textElement: TextElement | null;
  tableCell: SelectedTableCellInfo | null;
  onUpdateText: (newText: string) => void;
  onUpdateTextElement?: (updated: TextElement) => void;
  onUpdateTableElement?: (updated: TableElement) => void;
  onDeleteElement?: (id: string) => void;
  onOpenFullTableEditor?: (table: TableElement) => void;
  onDone: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const CompactTextEditor: React.FC<CompactTextEditorProps> = ({
  textElement,
  tableCell,
  onUpdateText,
  onUpdateTextElement,
  onUpdateTableElement,
  onDeleteElement,
  onOpenFullTableEditor,
  onDone,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) => {
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Determine active text value
  const currentText = textElement
    ? textElement.text
    : tableCell
    ? tableCell.text
    : '';

  const fontSize = textElement
    ? textElement.fontSize || 12
    : tableCell?.table?.fontSize || 9;

  const isBold = textElement ? textElement.fontWeight === 'bold' : false;
  const isItalic = textElement ? textElement.fontStyle === 'italic' : false;
  const textAlign = textElement ? textElement.textAlign || 'left' : 'left';
  const textColor = textElement ? textElement.color || '#0f172a' : tableCell?.table?.cellTextColor || '#0f172a';
  const fontFamily = textElement ? textElement.fontFamily || 'Helvetica' : 'Helvetica';
  const isMasked = textElement ? textElement.backgroundColor === '#ffffff' : false;

  // Auto-focus input on mount or when target changes
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      // Select all text for fast quick-edit
      inputRef.current.select();
    }
  }, [textElement?.id, tableCell?.rowIndex, tableCell?.colIndex]);

  // Determine smart inputMode (numeric/decimal/tel vs standard text)
  const isNumericOrDate = /^[\d\s.,:/+$-]+$/.test(currentText.trim()) && currentText.trim().length > 0;
  const isPhoneNumber = /^\+?[\d\s()-]{6,}$/.test(currentText.trim());
  const inputMode = isPhoneNumber ? 'tel' : isNumericOrDate ? 'decimal' : 'text';

  // Quick Font Size Adjustments
  const handleIncreaseFontSize = () => {
    if (textElement && onUpdateTextElement) {
      onUpdateTextElement({
        ...textElement,
        fontSize: Math.min(72, (textElement.fontSize || 12) + 1),
      });
    } else if (tableCell && onUpdateTableElement) {
      onUpdateTableElement({
        ...tableCell.table,
        fontSize: Math.min(24, (tableCell.table.fontSize || 9) + 1),
      });
    }
  };

  const handleDecreaseFontSize = () => {
    if (textElement && onUpdateTextElement) {
      onUpdateTextElement({
        ...textElement,
        fontSize: Math.max(6, (textElement.fontSize || 12) - 1),
      });
    } else if (tableCell && onUpdateTableElement) {
      onUpdateTableElement({
        ...tableCell.table,
        fontSize: Math.max(6, (tableCell.table.fontSize || 9) - 1),
      });
    }
  };

  const handleToggleBold = () => {
    if (textElement && onUpdateTextElement) {
      onUpdateTextElement({
        ...textElement,
        fontWeight: textElement.fontWeight === 'bold' ? 'normal' : 'bold',
      });
    }
  };

  const handleToggleItalic = () => {
    if (textElement && onUpdateTextElement) {
      onUpdateTextElement({
        ...textElement,
        fontStyle: textElement.fontStyle === 'italic' ? 'normal' : 'italic',
      });
    }
  };

  const handleSetAlignment = (align: 'left' | 'center' | 'right') => {
    if (textElement && onUpdateTextElement) {
      onUpdateTextElement({
        ...textElement,
        textAlign: align,
      });
    }
  };

  const handleSetColor = (color: string) => {
    if (textElement && onUpdateTextElement) {
      onUpdateTextElement({
        ...textElement,
        color,
      });
    } else if (tableCell && onUpdateTableElement) {
      onUpdateTableElement({
        ...tableCell.table,
        cellTextColor: color,
      });
    }
  };

  const handleToggleMask = () => {
    if (textElement && onUpdateTextElement) {
      onUpdateTextElement({
        ...textElement,
        backgroundColor: textElement.backgroundColor === '#ffffff' ? 'transparent' : '#ffffff',
      });
    }
  };

  const handleSetFontFamily = (ff: any) => {
    if (textElement && onUpdateTextElement) {
      onUpdateTextElement({
        ...textElement,
        fontFamily: ff,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onDone();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onDone();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 sm:bottom-auto sm:top-4 sm:right-4 sm:left-auto z-50 sm:w-84 max-w-full bg-slate-900/98 backdrop-blur-md border-t sm:border border-slate-700/80 sm:rounded-2xl shadow-2xl p-2.5 sm:p-3 text-xs select-none animate-in fade-in slide-in-from-bottom-2 sm:slide-in-from-right-2">
      {/* 1. ULTRA-COMPACT HEADER ROW */}
      <div className="flex items-center justify-between gap-2 mb-1.5 px-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-bold text-slate-300 tracking-tight flex items-center gap-1">
            {tableCell ? (
              <>
                <TableIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">
                  {tableCell.rowIndex === -1 ? 'Header Cell' : `Row ${tableCell.rowIndex + 1}, Col ${tableCell.colIndex + 1}`}
                </span>
              </>
            ) : (
              'Edit text'
            )}
          </span>
        </div>

        {/* Undo / Redo & Close (×) */}
        <div className="flex items-center gap-1 shrink-0">
          {onUndo && (
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onRedo && (
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onDone}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors ml-0.5"
            title="Close editor (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. PRIMARY TEXT INPUT (Immediately active & editable) */}
      <div className="relative mb-2">
        <input
          ref={inputRef}
          type="text"
          inputMode={inputMode}
          value={currentText}
          onChange={(e) => onUpdateText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-3 py-1.5 sm:py-2 rounded-xl bg-slate-950 border border-slate-700/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 text-slate-100 font-sans text-xs sm:text-sm outline-none shadow-inner pr-8 placeholder:text-slate-600 transition-all"
          placeholder="Enter text..."
        />
        {currentText.length > 0 && (
          <button
            onClick={() => onUpdateText('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5"
            title="Clear text"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 3. COMPACT EDITING CONTROLS ROW */}
      <div className="flex items-center justify-between gap-1.5 pt-0.5">
        {/* Quick format: Bold, A-, Size, A+ */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={handleToggleBold}
            className={`px-2 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
              isBold
                ? 'bg-emerald-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleDecreaseFontSize}
            className="px-1.5 py-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors font-semibold text-xs cursor-pointer"
            title="Decrease font size"
          >
            A−
          </button>

          <span className="text-[11px] font-mono font-medium text-slate-300 px-1 min-w-[28px] text-center">
            {fontSize}pt
          </span>

          <button
            onClick={handleIncreaseFontSize}
            className="px-1.5 py-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors font-semibold text-xs cursor-pointer"
            title="Increase font size"
          >
            A+
          </button>
        </div>

        {/* More Toggle & DONE Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowMoreOptions(!showMoreOptions)}
            className={`px-2 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 border transition-all cursor-pointer ${
              showMoreOptions
                ? 'bg-slate-800 text-emerald-400 border-emerald-500/40'
                : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border-slate-800'
            }`}
            title="Advanced options (Font, Color, Alignment, Background)"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden xs:inline text-[11px]">More</span>
            {showMoreOptions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* PRIMARY COMMIT ACTION: DONE */}
          <button
            onClick={onDone}
            className="px-3.5 py-1 sm:py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md shadow-emerald-500/20 cursor-pointer transition-all shrink-0"
            title="Done editing (Return to full PDF)"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Done</span>
          </button>
        </div>
      </div>

      {/* 4. EXPANDABLE "MORE" OPTIONS TRAY (Revealed only when requested) */}
      {showMoreOptions && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-800 space-y-2 animate-in fade-in zoom-in-95">
          {/* Row 1: Font & Color */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Font Style</label>
              <select
                value={fontFamily}
                onChange={(e) => handleSetFontFamily(e.target.value)}
                className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-[11px] outline-none"
              >
                <option value="Helvetica">Helvetica (Sans)</option>
                <option value="Times">Times (Serif)</option>
                <option value="Courier">Courier (Mono)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Text Color</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => handleSetColor(e.target.value)}
                  className="w-6 h-6 rounded border border-slate-700 cursor-pointer bg-transparent"
                />
                <span className="font-mono text-[10px] text-slate-400">{textColor}</span>
              </div>
            </div>
          </div>

          {/* Row 2: Alignment, Background Mask & Italic */}
          {textElement && (
            <div className="flex items-center justify-between gap-1 pt-1">
              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={handleToggleItalic}
                  className={`p-1 rounded text-xs transition-colors ${
                    isItalic ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Italic"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-3 bg-slate-800"></div>
                <button
                  onClick={() => handleSetAlignment('left')}
                  className={`p-1 rounded text-xs ${
                    textAlign === 'left' ? 'text-emerald-400 bg-slate-800' : 'text-slate-400'
                  }`}
                  title="Left align"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleSetAlignment('center')}
                  className={`p-1 rounded text-xs ${
                    textAlign === 'center' ? 'text-emerald-400 bg-slate-800' : 'text-slate-400'
                  }`}
                  title="Center align"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleSetAlignment('right')}
                  className={`p-1 rounded text-xs ${
                    textAlign === 'right' ? 'text-emerald-400 bg-slate-800' : 'text-slate-400'
                  }`}
                  title="Right align"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={handleToggleMask}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${
                  isMasked
                    ? 'bg-white text-slate-950 border-white'
                    : 'bg-slate-950 text-slate-400 border-slate-700'
                }`}
                title="Whiteout background behind text"
              >
                {isMasked ? 'Mask: ON' : 'Mask: OFF'}
              </button>

              {onDeleteElement && (
                <button
                  onClick={() => onDeleteElement(textElement.id)}
                  className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/40 transition-colors"
                  title="Delete text element"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Table-specific actions */}
          {tableCell && onOpenFullTableEditor && (
            <div className="pt-1 flex items-center justify-between">
              <button
                onClick={() => onOpenFullTableEditor(tableCell.table)}
                className="w-full py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Open Full Table Spreadsheet Grid</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
