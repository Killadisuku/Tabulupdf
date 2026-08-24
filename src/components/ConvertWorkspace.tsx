import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  FileSpreadsheet,
  FileText,
  Table,
  Presentation,
  Image as ImageIcon,
  Code2,
  Sparkles,
  Sliders,
  Check,
  Download,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
  CheckCircle2,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { SheetData, ExtractionOptions } from '../types';
import { ActionTarget } from './ActionSelectionGrid';

interface ConvertWorkspaceProps {
  fileName: string;
  fileSize: number;
  totalPages: number;
  sheets: SheetData[];
  isScannedDetected: boolean;
  onExecuteAction: (target: ActionTarget, actionOptions?: any) => void;
  onOpenAiOcr: () => void;
  onBackToDecision: () => void;
  onNavigateToEdit: () => void;
  onNavigateToExtract: () => void;
}

export const ConvertWorkspace: React.FC<ConvertWorkspaceProps> = ({
  fileName,
  fileSize,
  totalPages,
  sheets,
  isScannedDetected,
  onExecuteAction,
  onOpenAiOcr,
  onBackToDecision,
  onNavigateToEdit,
  onNavigateToExtract,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ActionTarget>('excel');
  const [pageScope, setPageScope] = useState<'all' | 'custom'>('all');
  const [customPageRange, setCustomPageRange] = useState(`1-${totalPages}`);
  
  // Format-specific settings
  const [excelScope, setExcelScope] = useState<'all' | 'consolidated'>('all');
  const [excelFormatting, setExcelFormatting] = useState(true);
  const [csvDelimiter, setCsvDelimiter] = useState<string>(',');
  const [imageDpi, setImageDpi] = useState<number>(2); // 2 = ~150-200dpi
  const [imageFormat, setImageFormat] = useState<'png' | 'jpeg'>('png');
  const [wordIncludeTables, setWordIncludeTables] = useState(true);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formats = [
    {
      id: 'excel' as ActionTarget,
      title: 'Excel Spreadsheet',
      extension: '.xlsx',
      desc: 'High-fidelity multi-sheet workbook with numbers, currencies, dates, and column alignment.',
      icon: <FileSpreadsheet className="w-6 h-6 text-emerald-400" />,
      accent: 'border-emerald-500 bg-emerald-500/10 text-emerald-400',
      category: 'Spreadsheet',
    },
    {
      id: 'csv' as ActionTarget,
      title: 'CSV Table',
      extension: '.csv',
      desc: 'Clean comma-separated values compatible with Excel, SQL databases, Python, and pandas.',
      icon: <Table className="w-6 h-6 text-teal-400" />,
      accent: 'border-teal-500 bg-teal-500/10 text-teal-400',
      category: 'Spreadsheet',
    },
    {
      id: 'word' as ActionTarget,
      title: 'Microsoft Word',
      extension: '.docx',
      desc: 'Editable document with structured paragraphs, headings, typography, and embedded tables.',
      icon: <FileText className="w-6 h-6 text-blue-400" />,
      accent: 'border-blue-500 bg-blue-500/10 text-blue-400',
      category: 'Document',
    },
    {
      id: 'images' as ActionTarget,
      title: 'Image Archive',
      extension: '.zip (JPG / PNG)',
      desc: 'Extract every page as high-resolution raster images (up to 300 DPI) in a single ZIP.',
      icon: <ImageIcon className="w-6 h-6 text-purple-400" />,
      accent: 'border-purple-500 bg-purple-500/10 text-purple-400',
      category: 'Images',
    },
    {
      id: 'text' as ActionTarget,
      title: 'Plain Text',
      extension: '.txt',
      desc: 'Extracted clean plain text stripped of binary layout noise, perfect for LLMs and indexing.',
      icon: <FileText className="w-6 h-6 text-amber-400" />,
      accent: 'border-amber-500 bg-amber-500/10 text-amber-400',
      category: 'Text & Code',
    },
    {
      id: 'html' as ActionTarget,
      title: 'HTML Web Page',
      extension: '.html',
      desc: 'Responsive web document with structured semantic tags, CSS styling, and table markup.',
      icon: <Code2 className="w-6 h-6 text-cyan-400" />,
      accent: 'border-cyan-500 bg-cyan-500/10 text-cyan-400',
      category: 'Text & Code',
    },
    {
      id: 'json' as ActionTarget,
      title: 'JSON Data',
      extension: '.json',
      desc: 'Structured JSON objects with metadata, extracted page text, and tabular records.',
      icon: <Code2 className="w-6 h-6 text-indigo-400" />,
      accent: 'border-indigo-500 bg-indigo-500/10 text-indigo-400',
      category: 'Text & Code',
    },
    {
      id: 'ocr' as ActionTarget,
      title: 'AI Scanned OCR',
      extension: 'AI Extracted',
      desc: 'Uses Gemini AI vision to extract high-accuracy text and tables from blurry scans or photos.',
      icon: <Sparkles className="w-6 h-6 text-emerald-400" />,
      accent: 'border-emerald-500 bg-emerald-500/10 text-emerald-400',
      category: 'AI Powered',
    },
  ];

  const activeFormatObj = formats.find((f) => f.id === selectedFormat) || formats[0];

  const handleConvert = () => {
    if (selectedFormat === 'ocr') {
      onOpenAiOcr();
      return;
    }

    onExecuteAction(selectedFormat, {
      excelScope,
      pageRangeInput: pageScope === 'all' ? `1-${totalPages}` : customPageRange,
      imageFormat,
      imageScale: imageDpi,
      imageQuality: 0.9,
      csvDelimiter,
      wordIncludeTables,
      excelFormatting,
    });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
        {/* Workspace Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Conversion Workspace
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {fileName} ({formatBytes(fileSize)})
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
              Convert your PDF
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Select your target output format and configure conversion parameters.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateToEdit}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Switch to PDF Editor</span>
            </button>
            <button
              onClick={onBackToDecision}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800 transition-colors"
            >
              Change Task
            </button>
          </div>
        </div>

        {/* 2-Column Conversion Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Format Selection Grid (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              1. Select Target Format
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {formats.map((fmt) => {
                const isSelected = selectedFormat === fmt.id;
                return (
                  <div
                    key={fmt.id}
                    onClick={() => setSelectedFormat(fmt.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                      isSelected
                        ? `${fmt.accent} shadow-lg ring-1 ring-emerald-500/50`
                        : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-center shadow-inner">
                          {fmt.icon}
                        </div>
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-950/70 border border-slate-800 text-slate-300">
                          {fmt.extension}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                          <span>{fmt.title}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </h3>
                        <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                          {fmt.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Settings & Execution Pane (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              2. Conversion Settings & Export
            </h2>

            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
              {/* Selected Target Header */}
              <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center">
                  {activeFormatObj.icon}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {activeFormatObj.title}
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    Output: {activeFormatObj.extension}
                  </span>
                </div>
              </div>

              {/* Page Range Options */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Page Scope
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPageScope('all')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium transition-colors ${
                      pageScope === 'all'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    All Pages (1-{totalPages})
                  </button>
                  <button
                    onClick={() => setPageScope('custom')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium transition-colors ${
                      pageScope === 'custom'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    Custom Pages
                  </button>
                </div>

                {pageScope === 'custom' && (
                  <div className="pt-1">
                    <input
                      type="text"
                      value={customPageRange}
                      onChange={(e) => setCustomPageRange(e.target.value)}
                      placeholder={`e.g. 1-2, 4`}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Enter page numbers separated by commas or ranges with hyphens.
                    </span>
                  </div>
                )}
              </div>

              {/* Format-Specific Customizations */}
              {selectedFormat === 'excel' && (
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <label className="block text-xs font-semibold text-slate-300">
                    Excel Sheet Layout
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="excelScope"
                        checked={excelScope === 'all'}
                        onChange={() => setExcelScope('all')}
                        className="accent-emerald-500"
                      />
                      <span>1 Sheet per PDF page</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="excelScope"
                        checked={excelScope === 'consolidated'}
                        onChange={() => setExcelScope('consolidated')}
                        className="accent-emerald-500"
                      />
                      <span>Consolidate all tables into a single sheet</span>
                    </label>
                  </div>
                </div>
              )}

              {selectedFormat === 'csv' && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <label className="block text-xs font-semibold text-slate-300">
                    CSV Delimiter
                  </label>
                  <select
                    value={csvDelimiter}
                    onChange={(e) => setCsvDelimiter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value=",">Comma (,)</option>
                    <option value=";">Semicolon (;)</option>
                    <option value="&#9;">Tab (\t)</option>
                    <option value="|">Pipe (|)</option>
                  </select>
                </div>
              )}

              {selectedFormat === 'images' && (
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Image Quality & DPI
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Standard (72 DPI)', scale: 1 },
                        { label: 'High (150 DPI)', scale: 2 },
                        { label: 'Print (300 DPI)', scale: 3 },
                      ].map((item) => (
                        <button
                          key={item.scale}
                          onClick={() => setImageDpi(item.scale)}
                          className={`py-1.5 px-2 rounded-lg border text-[11px] font-medium transition-colors ${
                            imageDpi === item.scale
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                              : 'bg-slate-950 text-slate-400 border-slate-800'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Format
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setImageFormat('png')}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-medium ${
                          imageFormat === 'png'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        PNG (Crisp Text)
                      </button>
                      <button
                        onClick={() => setImageFormat('jpeg')}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-medium ${
                          imageFormat === 'jpeg'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        JPG (Smaller File)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Scanned Document Notice */}
              {isScannedDetected && selectedFormat !== 'ocr' && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <span className="font-semibold block">Scanned PDF Detected</span>
                    <span className="text-amber-400/90 text-[11px]">
                      This document appears to contain scanned images. For best results, use the AI OCR mode.
                    </span>
                  </div>
                </div>
              )}

              {/* Convert Execution Button */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <button
                  onClick={handleConvert}
                  className="w-full py-3.5 px-4 rounded-2xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-500/20 cursor-pointer active:scale-[0.98]"
                >
                  <Download className="w-4 h-4 text-slate-950" />
                  <span>
                    {selectedFormat === 'ocr'
                      ? 'Launch AI OCR Extraction'
                      : `Convert to ${activeFormatObj.title} & Download`}
                  </span>
                </button>

                <p className="text-[11px] text-center text-slate-500">
                  Files are processed 100% locally in your browser. Nothing is uploaded to any server.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
