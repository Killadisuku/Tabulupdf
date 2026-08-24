import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  Table,
  FileSpreadsheet,
  Download,
  Plus,
  Trash2,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  RefreshCw,
  Search,
  Check,
  Zap,
  Sliders,
  Crop,
  ArrowRight
} from 'lucide-react';
import { SheetData, ExtractionOptions } from '../types';
import { SpreadsheetGrid } from './SpreadsheetGrid';
import { PdfViewer } from './PdfViewer';
import { SampleDoc } from '../utils/samplePdfs';
import { RegionBounds } from '../utils/pdfParser';

interface ExtractWorkspaceProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  sampleDoc: SampleDoc | null;
  fileName: string;
  totalPages: number;
  sheets: SheetData[];
  activeSheetId: string;
  onSelectSheet: (id: string) => void;
  onUpdateSheet: (sheet: SheetData) => void;
  onDeleteSheet: (id: string) => void;
  onAddSheet: () => void;
  onConsolidateAll: () => void;
  onOpenAiModal: () => void;
  onExtractRegion: (region: RegionBounds | null, pageNumber?: number) => void;
  onExportExcel: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  onBackToDecision: () => void;
  onNavigateToEdit: () => void;
  onNavigateToConvert: () => void;
  isProcessing: boolean;
}

export const ExtractWorkspace: React.FC<ExtractWorkspaceProps> = ({
  pdfDoc,
  sampleDoc,
  fileName,
  totalPages,
  sheets,
  activeSheetId,
  onSelectSheet,
  onUpdateSheet,
  onDeleteSheet,
  onAddSheet,
  onConsolidateAll,
  onOpenAiModal,
  onExtractRegion,
  onExportExcel,
  onExportCsv,
  onExportJson,
  onBackToDecision,
  onNavigateToEdit,
  onNavigateToConvert,
  isProcessing,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activePane, setActivePane] = useState<'both' | 'spreadsheet' | 'pdf'>('both');

  const currentSheet = sheets.find((s) => s.id === activeSheetId) || sheets[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* 1. Extraction Workspace Top Bar */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0">
        {/* Left: Title & Sheets Indicator */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold">
            <Table className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Table Extraction & Spreadsheet</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-teal-500/20 text-teal-300 border border-teal-500/30">
                {sheets.length} {sheets.length === 1 ? 'Table' : 'Tables'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono hidden sm:block truncate max-w-xs">
              {fileName}
            </p>
          </div>
        </div>

        {/* Center: View Layout Switcher (Both / Spreadsheet Only / PDF Only) */}
        <div className="hidden md:flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActivePane('both')}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
              activePane === 'both'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Split View (PDF + Table)
          </button>
          <button
            onClick={() => setActivePane('spreadsheet')}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
              activePane === 'spreadsheet'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Spreadsheet Only
          </button>
          <button
            onClick={() => setActivePane('pdf')}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
              activePane === 'pdf'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            PDF Only
          </button>
        </div>

        {/* Right: Instant Export Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAiModal}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI OCR Table</span>
          </button>

          <button
            onClick={onExportCsv}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-teal-300 border border-teal-500/30 transition-colors"
          >
            Export CSV
          </button>

          <button
            onClick={onExportExcel}
            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* 2. Main Content Split View */}
      <div className="flex-1 flex min-h-0 relative">
        {/* LEFT PANE: PDF Document Viewer & Manual Table Bounding Box Selector */}
        {(activePane === 'both' || activePane === 'pdf') && (
          <div
            className={`${
              activePane === 'both' ? 'w-full md:w-1/2 lg:w-5/12 border-r border-slate-800' : 'w-full'
            } flex flex-col h-full bg-slate-950 overflow-hidden relative`}
          >
            {/* PDF Pane Subheader */}
            <div className="p-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs px-3">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <Crop className="w-3.5 h-3.5 text-teal-400" />
                <span>Select & Crop Tables from PDF</span>
              </div>
              <span className="text-[10px] text-slate-500">
                Drag a box to extract custom table
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              <PdfViewer
                pdfDoc={pdfDoc}
                sampleDoc={sampleDoc}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(p) => setCurrentPage(p)}
                onExtractRegion={(reg) => onExtractRegion(reg, currentPage)}
                onOpenAiExtract={onOpenAiModal}
                isProcessing={isProcessing}
              />
            </div>
          </div>
        )}

        {/* RIGHT PANE: Lightweight Interactive Spreadsheet Grid */}
        {(activePane === 'both' || activePane === 'spreadsheet') && (
          <div
            className={`${
              activePane === 'both' ? 'w-full md:w-1/2 lg:w-7/12' : 'w-full'
            } flex flex-col h-full bg-slate-900 overflow-hidden`}
          >
            <SpreadsheetGrid
              sheets={sheets}
              activeSheetId={activeSheetId}
              onSelectSheet={onSelectSheet}
              onUpdateSheet={onUpdateSheet}
              onDeleteSheet={onDeleteSheet}
              onAddSheet={onAddSheet}
              onConsolidateAll={onConsolidateAll}
              onOpenAiModal={onOpenAiModal}
            />
          </div>
        )}
      </div>
    </div>
  );
};
