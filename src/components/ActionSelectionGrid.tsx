import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Layers,
  Scissors,
  RotateCw,
  Minimize2,
  Table,
  Code2,
  ChevronDown,
  ChevronUp,
  Settings2,
  Check,
  ArrowRight,
  AlertCircle,
  Eye,
  Sliders,
  Trash2,
  Download,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { SheetData, ExtractionOptions } from '../types';
import { PdfToolMode } from './PdfToolsWorkspaceModal';

export type ActionTarget =
  | 'excel'
  | 'word'
  | 'csv'
  | 'tsv'
  | 'images'
  | 'text'
  | 'html'
  | 'json'
  | 'xml'
  | 'ocr';

interface ActionSelectionGridProps {
  fileName: string;
  fileSize: number;
  totalPages: number;
  detectedTableCount: number;
  isScannedDetected: boolean;
  sheets: SheetData[];
  options: ExtractionOptions;
  setOptions: React.Dispatch<React.SetStateAction<ExtractionOptions>>;
  onExecuteAction: (target: ActionTarget, actionOptions?: any) => void;
  onOpenPdfTool: (mode: PdfToolMode) => void;
  onOpenAiOcr: () => void;
  onInspectTables: () => void;
  onRemoveFile: () => void;
  onOpenPdfEditor: () => void;
  thumbnailUrl?: string;
}

export const ActionSelectionGrid: React.FC<ActionSelectionGridProps> = ({
  fileName,
  fileSize,
  totalPages,
  detectedTableCount,
  isScannedDetected,
  sheets,
  options,
  setOptions,
  onExecuteAction,
  onOpenPdfTool,
  onOpenAiOcr,
  onInspectTables,
  onRemoveFile,
  onOpenPdfEditor,
  thumbnailUrl,
}) => {
  const [selectedAction, setSelectedAction] = useState<ActionTarget>('excel');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced settings state
  const [excelScope, setExcelScope] = useState<'all' | 'consolidated' | 'page_range'>('all');
  const [pageRangeInput, setPageRangeInput] = useState(`1-${totalPages}`);
  const [imageFormat, setImageFormat] = useState<'png' | 'jpeg'>('png');
  const [imageScale, setImageScale] = useState<number>(2); // 2 = 150-200dpi
  const [imageQuality, setImageQuality] = useState<number>(0.9);
  const [csvDelimiter, setCsvDelimiter] = useState<string>(',');

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleStartConversion = (target: ActionTarget) => {
    onExecuteAction(target, {
      excelScope,
      pageRangeInput,
      imageFormat,
      imageScale,
      imageQuality,
      csvDelimiter,
    });
  };

  const primaryActions = [
    {
      id: 'excel' as ActionTarget,
      title: 'Excel Spreadsheet',
      badge: '.xlsx',
      desc: 'Extract tables with preserved numbers, currencies, dates, and column alignment.',
      icon: <FileSpreadsheet className="w-6 h-6 text-emerald-400" />,
      accent: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
    },
    {
      id: 'word' as ActionTarget,
      title: 'Editable Word',
      badge: '.docx',
      desc: 'Convert document into Microsoft Word with preserved headings, paragraphs, and tables.',
      icon: <FileText className="w-6 h-6 text-blue-400" />,
      accent: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
    },
    {
      id: 'csv' as ActionTarget,
      title: 'CSV Table',
      badge: '.csv',
      desc: 'Clean comma-separated spreadsheet data for databases, Python, and analytics.',
      icon: <Table className="w-6 h-6 text-teal-400" />,
      accent: 'border-teal-500/40 bg-teal-500/10 text-teal-400',
    },
    {
      id: 'images' as ActionTarget,
      title: 'Images',
      badge: 'JPG / PNG',
      desc: 'Render high-resolution page images (up to 300 DPI) packaged as a clean ZIP.',
      icon: <ImageIcon className="w-6 h-6 text-purple-400" />,
      accent: 'border-purple-500/40 bg-purple-500/10 text-purple-400',
    },
    {
      id: 'text' as ActionTarget,
      title: 'Plain Text',
      badge: '.txt',
      desc: 'Extract cleanly formatted paragraphs and textual content.',
      icon: <FileText className="w-6 h-6 text-slate-400" />,
      accent: 'border-slate-700 bg-slate-800 text-slate-300',
    },
    {
      id: 'ocr' as ActionTarget,
      title: 'AI Vision OCR',
      badge: 'Gemini AI',
      desc: 'Extract tables and text from scanned paper documents, receipts, and photos.',
      icon: <Sparkles className="w-6 h-6 text-amber-400" />,
      accent: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* 1. Active File Preview Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="flex items-center gap-4 min-w-0">
          {/* Thumbnail / Icon */}
          <div className="w-14 h-18 sm:w-16 sm:h-20 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden shadow-inner relative group">
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt="Preview" className="w-full h-full object-cover bg-white" />
            ) : (
              <FileText className="w-8 h-8 text-emerald-400" />
            )}
            <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] font-bold text-white uppercase">P.1</span>
            </div>
          </div>

          {/* Details */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base sm:text-lg font-bold text-white truncate max-w-md">
                {fileName}
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                Ready
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-slate-400 font-mono">
              <span>{formatBytes(fileSize)}</span>
              <span>•</span>
              <span>{totalPages} {totalPages === 1 ? 'page' : 'pages'}</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">{detectedTableCount} {detectedTableCount === 1 ? 'table' : 'tables'} detected</span>
            </div>
          </div>
        </div>

        {/* Top actions: Inspect & Remove */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {detectedTableCount > 0 && (
            <button
              onClick={onInspectTables}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>Inspect Grid</span>
            </button>
          )}

          <button
            onClick={onRemoveFile}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-700/80 hover:border-rose-500/30 transition-all cursor-pointer"
            title="Remove and upload different file"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scanned PDF Banner (if detected) */}
      {isScannedDetected && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-300">Scanned Document Detected</h4>
              <p className="text-[11px] text-amber-200/80 mt-0.5">
                This PDF appears to contain photographed or scanned pages without a direct digital text layer. Use AI Vision OCR for maximum conversion accuracy.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenAiOcr}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Launch OCR Engine
          </button>
        </div>
      )}

      {/* 2. Real-Time PDF Editor Hero Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-teal-950/60 border-2 border-emerald-500/50 shadow-2xl relative overflow-hidden group">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Real-Time In-Place Editor</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Edit this PDF directly in your browser
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              No need to convert to Word or Excel. Click any text, phone number, address, table cell, or price to edit in real time on this PDF, add signatures, shapes & whiteout, then download the modified PDF.
            </p>
          </div>

          <button
            onClick={onOpenPdfEditor}
            className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>Open in PDF Editor</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. "Or Convert to Other Formats" Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-extrabold text-white tracking-tight">
              Or Convert & Export
            </h3>
            <p className="text-xs text-slate-400">
              Extract tabular data and document elements into other target formats.
            </p>
          </div>
        </div>

        {/* Conversion Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {primaryActions.map((action) => {
            const isSelected = selectedAction === action.id;
            return (
              <div
                key={action.id}
                onClick={() => {
                  setSelectedAction(action.id);
                  if (action.id === 'ocr') {
                    onOpenAiOcr();
                  }
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-900 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/50'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${action.accent}`}>
                      {action.icon}
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 font-mono">
                      {action.badge}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors mb-1">
                    {action.title}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    {action.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                  <span className={`font-semibold ${isSelected ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                    {isSelected ? 'Selected' : 'Select'}
                  </span>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                      isSelected
                        ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                        : 'border-slate-700 bg-slate-950 text-transparent'
                    }`}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Advanced Options (Progressive Disclosure) */}
      <div className="border border-slate-800 rounded-2xl bg-slate-900/50 overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Advanced Options & Page Range</span>
            <span className="text-[10px] font-normal text-slate-500">
              (Optional: customize sheets, image DPI, delimiters)
            </span>
          </span>
          {showAdvanced ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showAdvanced && (
          <div className="p-5 border-t border-slate-800 bg-slate-950/40 space-y-4 text-xs animate-in slide-in-from-top-2 duration-150">
            {/* Excel Specific Settings */}
            {selectedAction === 'excel' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">
                    Sheet Organization
                  </label>
                  <select
                    value={excelScope}
                    onChange={(e: any) => setExcelScope(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all">Separate sheet per page (Page 1, Page 2...)</option>
                    <option value="consolidated">Consolidate all pages into 1 master sheet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">
                    Table Heuristics
                  </label>
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={options.firstRowIsHeader}
                      onChange={(e) => setOptions({ ...options, firstRowIsHeader: e.target.checked })}
                      className="rounded accent-emerald-500"
                    />
                    <span>First row is header (format with styled header styling)</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={options.detectDataTypes}
                      onChange={(e) => setOptions({ ...options, detectDataTypes: e.target.checked })}
                      className="rounded accent-emerald-500"
                    />
                    <span>Detect numbers, currency & dates as native Excel types</span>
                  </label>
                </div>
              </div>
            )}

            {/* Images Specific Settings */}
            {selectedAction === 'images' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">
                    Image Format
                  </label>
                  <select
                    value={imageFormat}
                    onChange={(e: any) => setImageFormat(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="png">PNG (Lossless & crisp)</option>
                    <option value="jpeg">JPG / JPEG (Compact file size)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">
                    Resolution / Scale
                  </label>
                  <select
                    value={imageScale}
                    onChange={(e) => setImageScale(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="1.0">1.0x (Standard Web - 72 DPI)</option>
                    <option value="2.0">2.0x (High-Res Retina - 150 DPI)</option>
                    <option value="3.0">3.0x (Ultra High-Res Print - 300 DPI)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">
                    Page Range
                  </label>
                  <input
                    type="text"
                    value={pageRangeInput}
                    onChange={(e) => setPageRangeInput(e.target.value)}
                    placeholder={`1-${totalPages}`}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* CSV Specific Settings */}
            {selectedAction === 'csv' && (
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Delimiter
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="csvDelim"
                      checked={csvDelimiter === ','}
                      onChange={() => setCsvDelimiter(',')}
                      className="accent-emerald-500"
                    />
                    <span>Comma (,) - Standard CSV</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="csvDelim"
                      checked={csvDelimiter === ';'}
                      onChange={() => setCsvDelimiter(';')}
                      className="accent-emerald-500"
                    />
                    <span>Semicolon (;) - European Excel</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="csvDelim"
                      checked={csvDelimiter === '\t'}
                      onChange={() => setCsvDelimiter('\t')}
                      className="accent-emerald-500"
                    />
                    <span>Tab (\t) - TSV</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Main Conversion Trigger Bar */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              Convert to {selectedAction.toUpperCase()}
            </div>
            <div className="text-xs text-slate-400">
              Processed 100% locally in your browser memory.
            </div>
          </div>
        </div>

        <button
          onClick={() => handleStartConversion(selectedAction)}
          className="px-8 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-500/25 cursor-pointer"
        >
          <span>Convert Now</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* 5. PDF Page Tools Quick Bar */}
      <div className="pt-4 border-t border-slate-800/80">
        <span className="text-xs font-semibold text-slate-400 mb-3 block">
          Or manage PDF document pages:
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => onOpenPdfTool('split')}
            className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Scissors className="w-4 h-4 text-pink-400" />
            <span>Split / Extract</span>
          </button>

          <button
            onClick={() => onOpenPdfTool('rotate')}
            className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
          >
            <RotateCw className="w-4 h-4 text-violet-400" />
            <span>Rotate Pages</span>
          </button>

          <button
            onClick={() => onOpenPdfTool('compress')}
            className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Minimize2 className="w-4 h-4 text-cyan-400" />
            <span>Compress PDF</span>
          </button>

          <button
            onClick={() => onOpenPdfTool('merge')}
            className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Layers className="w-4 h-4 text-rose-400" />
            <span>Merge PDFs</span>
          </button>
        </div>
      </div>
    </div>
  );
};
