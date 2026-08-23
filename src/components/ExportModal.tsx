import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  FileSpreadsheet,
  FileText,
  Code2,
  Copy,
  Check,
  Download,
  X,
  Settings,
  Layers,
  Sparkles,
  Table as TableIcon
} from 'lucide-react';
import { SheetData } from '../types';
import {
  exportToExcel,
  exportToCsvFile,
  exportToJsonFile,
  exportToHtmlTable,
  copySheetToClipboard,
} from '../utils/excelExport';
import { consolidateSheets } from '../utils/pdfParser';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheets: SheetData[];
  activeSheetId: string;
  defaultFileName?: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  sheets,
  activeSheetId,
  defaultFileName = 'Converted_Document',
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'xlsx' | 'csv' | 'tsv' | 'json' | 'html'>(
    'xlsx'
  );
  const [fileName, setFileName] = useState(
    defaultFileName.replace(/\.pdf$/i, '') || 'TabulaPDF_Export'
  );
  const [excelScope, setExcelScope] = useState<'all_sheets' | 'active_only' | 'consolidated'>(
    'all_sheets'
  );
  const [csvDelimiter, setCsvDelimiter] = useState<string>(',');
  const [jsonFormat, setJsonFormat] = useState<'records' | 'matrix'>('records');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentSheet = sheets.find((s) => s.id === activeSheetId) || sheets[0];

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch (e) {}
  };

  const handleDownload = () => {
    const cleanFileName = fileName.trim() || 'TabulaPDF_Export';

    switch (selectedFormat) {
      case 'xlsx': {
        let sheetsToExport: SheetData[] = [];
        if (excelScope === 'all_sheets') {
          sheetsToExport = sheets;
        } else if (excelScope === 'active_only') {
          sheetsToExport = currentSheet ? [currentSheet] : sheets;
        } else {
          // Consolidated
          sheetsToExport = [consolidateSheets(sheets as any)];
        }
        exportToExcel(sheetsToExport, `${cleanFileName}.xlsx`);
        break;
      }
      case 'csv': {
        if (!currentSheet) return;
        exportToCsvFile(currentSheet, `${cleanFileName}.csv`, csvDelimiter);
        break;
      }
      case 'tsv': {
        if (!currentSheet) return;
        exportToCsvFile(currentSheet, `${cleanFileName}.tsv`, '\t');
        break;
      }
      case 'json': {
        if (!currentSheet) return;
        exportToJsonFile(currentSheet, `${cleanFileName}.json`, jsonFormat);
        break;
      }
      case 'html': {
        if (!currentSheet) return;
        const html = exportToHtmlTable(currentSheet);
        const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${cleanFileName}.html`;
        a.click();
        URL.revokeObjectURL(url);
        break;
      }
    }

    triggerConfetti();
    onClose();
  };

  const handleCopyClipboard = async () => {
    if (!currentSheet) return;
    const success = await copySheetToClipboard(currentSheet);
    if (success) {
      setCopied(true);
      triggerConfetti();
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Export Converted Spreadsheet</h2>
              <p className="text-[11px] text-slate-400">
                Choose format and customize structure for Excel, Google Sheets, or databases
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs text-slate-300">
          {/* Format Selector Grid */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-2">Export Format</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[
                { id: 'xlsx', label: 'Excel (.xlsx)', icon: FileSpreadsheet, badge: 'Recommended' },
                { id: 'csv', label: 'CSV (.csv)', icon: FileText, badge: 'Standard' },
                { id: 'tsv', label: 'TSV (.tsv)', icon: FileText, badge: 'Tabs' },
                { id: 'json', label: 'JSON (.json)', icon: Code2, badge: 'API' },
                { id: 'html', label: 'HTML Table', icon: TableIcon, badge: 'Web' },
              ].map((fmt) => {
                const Icon = fmt.icon;
                const isSelected = selectedFormat === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setSelectedFormat(fmt.id as any)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500 text-white font-bold shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`}
                    />
                    <span className="text-[11px]">{fmt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filename Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">File Name</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <span className="text-slate-500 font-mono text-xs">
                .{selectedFormat === 'tsv' ? 'tsv' : selectedFormat}
              </span>
            </div>
          </div>

          {/* Format Specific Configurations */}
          {selectedFormat === 'xlsx' && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-emerald-400" /> Excel Sheet Packaging
              </span>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="radio"
                    name="excelScope"
                    checked={excelScope === 'all_sheets'}
                    onChange={() => setExcelScope('all_sheets')}
                    className="text-emerald-500"
                  />
                  <span>
                    Multi-sheet Workbook ({sheets.length} worksheet{sheets.length > 1 ? 's' : ''})
                  </span>
                </label>
                {sheets.length > 1 && (
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="excelScope"
                      checked={excelScope === 'consolidated'}
                      onChange={() => setExcelScope('consolidated')}
                      className="text-emerald-500"
                    />
                    <span>Consolidate all pages into single master sheet</span>
                  </label>
                )}
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="radio"
                    name="excelScope"
                    checked={excelScope === 'active_only'}
                    onChange={() => setExcelScope('active_only')}
                    className="text-emerald-500"
                  />
                  <span>Active sheet only ({currentSheet?.name || 'Sheet 1'})</span>
                </label>
              </div>
            </div>
          )}

          {selectedFormat === 'csv' && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="font-semibold text-slate-300">Delimiter Format</span>
              <div className="flex gap-2">
                {[
                  { label: 'Comma (,)', value: ',' },
                  { label: 'Semicolon (;)', value: ';' },
                  { label: 'Pipe (|)', value: '|' },
                ].map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setCsvDelimiter(d.value)}
                    className={`px-3 py-1.5 rounded-lg border text-xs cursor-pointer ${
                      csvDelimiter === d.value
                        ? 'bg-emerald-950/40 border-emerald-500 text-white font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedFormat === 'json' && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="font-semibold text-slate-300">JSON Structure</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setJsonFormat('records')}
                  className={`px-3 py-1.5 rounded-lg border text-xs cursor-pointer ${
                    jsonFormat === 'records'
                      ? 'bg-emerald-950/40 border-emerald-500 text-white font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Array of Objects `[&#123; col: val &#125;]`
                </button>
                <button
                  type="button"
                  onClick={() => setJsonFormat('matrix')}
                  className={`px-3 py-1.5 rounded-lg border text-xs cursor-pointer ${
                    jsonFormat === 'matrix'
                      ? 'bg-emerald-950/40 border-emerald-500 text-white font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Headers & 2D Matrix
                </button>
              </div>
            </div>
          )}

          {/* Quick Copy to Clipboard Alternative */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Need to paste directly into Google Sheets or Excel?
            </span>
            <button
              onClick={handleCopyClipboard}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy TSV to Clipboard</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-950 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download {selectedFormat.toUpperCase()} File</span>
          </button>
        </div>
      </div>
    </div>
  );
};
