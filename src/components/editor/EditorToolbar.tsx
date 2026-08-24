import React, { useState } from 'react';
import {
  MousePointer,
  Type,
  Grid,
  Image as ImageIcon,
  PenTool,
  ArrowRight,
  Minus,
  Square,
  Circle,
  Highlighter,
  FileSignature,
  Eraser,
  CheckSquare,
  Undo2,
  Redo2,
  Search,
  ZoomIn,
  ZoomOut,
  Download,
  Sparkles,
  ChevronDown,
  FileText,
  FileSpreadsheet,
  Layers,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  MoreVertical
} from 'lucide-react';
import { EditorTool } from '../../types/editor';

interface EditorToolbarProps {
  activeTool: EditorTool;
  setActiveTool: (tool: EditorTool) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  setZoom: (z: number | ((prev: number) => number)) => void;
  onFitWidth: () => void;
  onFitPage: () => void;
  isScannedDetected: boolean;
  onRunAiOcr: () => void;
  isOcrRunning: boolean;
  onOpenSignatureModal: () => void;
  onOpenImageUpload: () => void;
  onToggleFindReplace: () => void;
  isFindReplaceOpen: boolean;
  onToggleAiEdit: () => void;
  isAiEditOpen: boolean;
  onDownloadPdf: () => void;
  onExportWord: () => void;
  onExportExcel: () => void;
  onBackToHub: () => void;
  fileName: string;
  isSaving: boolean;
  // Page Navigation Props
  activePageNumber: number;
  totalPages: number;
  onOpenPageDrawer: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  // Whether an element is currently being edited (hides bottom dock so compact editor takes over)
  isEditingElement?: boolean;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  activeTool,
  setActiveTool,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoom,
  setZoom,
  onFitWidth,
  onFitPage,
  isScannedDetected,
  onRunAiOcr,
  isOcrRunning,
  onOpenSignatureModal,
  onOpenImageUpload,
  onToggleFindReplace,
  isFindReplaceOpen,
  onToggleAiEdit,
  isAiEditOpen,
  onDownloadPdf,
  onExportWord,
  onExportExcel,
  onBackToHub,
  fileName,
  isSaving,
  activePageNumber,
  totalPages,
  onOpenPageDrawer,
  onPrevPage,
  onNextPage,
  isEditingElement = false,
}) => {
  const [showShapesDropdown, setShowShapesDropdown] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const isShapeActive = [
    'rectangle',
    'circle',
    'arrow',
    'line',
    'callout',
    'checkbox',
    'checkmark',
    'crossmark',
  ].includes(activeTool);

  return (
    <>
      {/* 1. COMPACT TOP HEADER BAR */}
      <header className="bg-slate-900/95 backdrop-blur border-b border-slate-800 px-2.5 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-1.5 sm:gap-2 select-none relative z-30 shrink-0 h-12 sm:h-14">
        {/* LEFT: Back button & Title */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <button
            onClick={onBackToHub}
            className="p-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer shrink-0"
            title="Back to All Tools"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs sm:text-sm font-bold text-white tracking-tight hidden xs:inline shrink-0">
              Tabula<span className="text-emerald-400">PDF</span>
            </span>
            <span className="text-slate-600 hidden xs:inline">•</span>
            <span className="text-xs text-slate-300 font-medium truncate max-w-[90px] xs:max-w-[130px] sm:max-w-[200px] md:max-w-[280px]">
              {fileName || 'Document.pdf'}
            </span>
          </div>
        </div>

        {/* CENTER: Page Navigator Button with Drawer Trigger */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-950/80 p-0.5 sm:p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={onPrevPage}
            disabled={activePageNumber <= 1}
            className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onOpenPageDrawer}
            className="px-1.5 sm:px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/60 hover:border-emerald-500/50 transition-all flex items-center gap-1 text-[11px] sm:text-xs font-semibold cursor-pointer"
            title="Open Pages Drawer (View All Thumbnails)"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0 hidden xs:inline" />
            <span>
              Page <span className="text-emerald-400">{activePageNumber}</span>/{totalPages}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          <button
            onClick={onNextPage}
            disabled={activePageNumber >= totalPages}
            className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* RIGHT: Undo/Redo, Zoom & Primary Save Action */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Undo / Redo */}
          <div className="hidden sm:flex items-center gap-0.5 bg-slate-950/60 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="hidden md:flex items-center gap-0.5 bg-slate-950/60 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setZoom((prev) => Math.max(0.3, Number((prev - 0.15).toFixed(2))))}
              className="p-1 text-slate-400 hover:text-slate-200 rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-slate-300 px-1 w-9 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((prev) => Math.min(3.0, Number((prev + 0.15).toFixed(2))))}
              className="p-1 text-slate-400 hover:text-slate-200 rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onFitWidth}
              className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded font-medium"
              title="Fit to Width"
            >
              Fit
            </button>
          </div>

          {/* Top Bar AI Edit Button */}
          <button
            onClick={onToggleAiEdit}
            className={`hidden md:flex px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold items-center gap-1.5 transition-all cursor-pointer ${
              isAiEditOpen
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400'
                : 'bg-gradient-to-r from-emerald-500/20 to-violet-500/20 border border-emerald-500/40 text-emerald-300 hover:text-white hover:bg-emerald-500/30'
            }`}
            title="AI Natural Language PDF Edit (✨)"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>AI Edit</span>
          </button>

          {/* PRIMARY ACTION: Save & Download Modified PDF */}
          <button
            onClick={onDownloadPdf}
            disabled={isSaving}
            className="px-2.5 sm:px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50 active:scale-95"
            title="Save & Download Modified PDF"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden xs:inline">Save PDF</span>
            <span className="xs:hidden">Save</span>
          </button>

          {/* MORE MENU (Export Word, Excel, Find & Replace, AI OCR) */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title="More Actions & Formats"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 space-y-1 z-50 animate-in fade-in zoom-in-95">
                <button
                  onClick={() => {
                    onExportWord();
                    setShowMoreMenu(false);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>Download Word (.docx)</span>
                </button>
                <button
                  onClick={() => {
                    onExportExcel();
                    setShowMoreMenu(false);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download Excel (.xlsx)</span>
                </button>

                <div className="h-px bg-slate-800 my-1"></div>

                <button
                  onClick={() => {
                    onToggleAiEdit();
                    setShowMoreMenu(false);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 text-emerald-300 hover:bg-emerald-950/40 hover:text-emerald-200 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>✨ AI Natural Language Edit</span>
                </button>

                <button
                  onClick={() => {
                    onToggleFindReplace();
                    setShowMoreMenu(false);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5 text-amber-400" />
                  <span>Find & Replace Text</span>
                </button>

                {isScannedDetected && (
                  <button
                    onClick={() => {
                      onRunAiOcr();
                      setShowMoreMenu(false);
                    }}
                    disabled={isOcrRunning}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 text-violet-300 hover:bg-violet-950/40 hover:text-violet-200 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                    <span>Make Scanned Text Editable</span>
                  </button>
                )}

                <div className="h-px bg-slate-800 my-1 sm:hidden"></div>

                {/* Mobile Quick Undo / Redo in More menu */}
                <div className="flex items-center justify-between px-2.5 py-1 sm:hidden">
                  <button
                    onClick={onUndo}
                    disabled={!canUndo}
                    className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 flex items-center gap-1 text-xs"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>Undo</span>
                  </button>
                  <button
                    onClick={onRedo}
                    disabled={!canRedo}
                    className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 flex items-center gap-1 text-xs"
                  >
                    <Redo2 className="w-3.5 h-3.5" />
                    <span>Redo</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. FLOATING / BOTTOM RESPONSIVE EDITING TOOL DOCK (Hidden when editing element so compact editor takes over) */}
      {!isEditingElement && (
        <div className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-[96vw] overflow-x-auto no-scrollbar pointer-events-auto transition-all animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-1 bg-slate-900/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700/80 shadow-2xl shadow-slate-950/80">
            {/* Select Tool */}
            <button
              onClick={() => setActiveTool('select')}
              className={`px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTool === 'select'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
              title="Select & Edit Elements (V)"
            >
              <MousePointer className="w-4 h-4" />
              <span className="hidden xs:inline">Select</span>
            </button>

            {/* Text Tool */}
            <button
              onClick={() => setActiveTool('text')}
              className={`px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTool === 'text'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
              title="Add or Edit Text (T)"
            >
              <Type className="w-4 h-4" />
              <span className="hidden xs:inline">Text</span>
            </button>

            {/* Table Tool */}
            <button
              onClick={() => setActiveTool('table')}
              className={`px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTool === 'table'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
              title="Insert Spreadsheet Table"
            >
              <Grid className="w-4 h-4" />
              <span className="hidden sm:inline">Table</span>
            </button>

            {/* Whiteout / Erase Tool */}
            <button
              onClick={() => setActiveTool('whiteout')}
              className={`px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTool === 'whiteout'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
              title="Whiteout / Mask / Erase Area"
            >
              <Eraser className="w-4 h-4" />
              <span className="hidden sm:inline">Whiteout</span>
            </button>

            {/* Draw / Pen Tool */}
            <button
              onClick={() => setActiveTool('draw')}
              className={`px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTool === 'draw'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
              title="Freehand Draw / Pen"
            >
              <PenTool className="w-4 h-4" />
              <span className="hidden md:inline">Draw</span>
            </button>

            {/* Highlight Tool */}
            <button
              onClick={() => setActiveTool('highlight')}
              className={`px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTool === 'highlight'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
              title="Highlighter"
            >
              <Highlighter className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">Highlight</span>
            </button>

            {/* Shapes Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowShapesDropdown(!showShapesDropdown)}
                className={`px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  isShapeActive
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
                title="Shapes & Lines"
              >
                <Square className="w-4 h-4" />
                <ChevronDown className="w-3 h-3" />
              </button>

              {showShapesDropdown && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 space-y-1 z-50 animate-in fade-in zoom-in-95">
                  <button
                    onClick={() => {
                      setActiveTool('rectangle');
                      setShowShapesDropdown(false);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 text-slate-300 hover:bg-slate-800 hover:text-slate-100 cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Rectangle</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTool('circle');
                      setShowShapesDropdown(false);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 text-slate-300 hover:bg-slate-800 hover:text-slate-100 cursor-pointer"
                  >
                    <Circle className="w-3.5 h-3.5" />
                    <span>Circle</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTool('arrow');
                      setShowShapesDropdown(false);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 text-slate-300 hover:bg-slate-800 hover:text-slate-100 cursor-pointer"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>Arrow</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTool('line');
                      setShowShapesDropdown(false);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 text-slate-300 hover:bg-slate-800 hover:text-slate-100 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>Line</span>
                  </button>
                  <div className="h-px bg-slate-800 my-1"></div>
                  <button
                    onClick={() => {
                      setActiveTool('checkbox');
                      setShowShapesDropdown(false);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 text-slate-300 hover:bg-slate-800 hover:text-slate-100 cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Checkbox</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTool('checkmark');
                      setShowShapesDropdown(false);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 text-slate-300 hover:bg-slate-800 hover:text-slate-100 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Checkmark</span>
                  </button>
                </div>
              )}
            </div>

            {/* Signature Tool */}
            <button
              onClick={onOpenSignatureModal}
              className="px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer"
              title="Add Digital Signature"
            >
              <FileSignature className="w-4 h-4 text-emerald-400" />
              <span className="hidden lg:inline">Sign</span>
            </button>

            {/* Image Upload Tool */}
            <button
              onClick={onOpenImageUpload}
              className="px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer"
              title="Insert Image / Logo"
            >
              <ImageIcon className="w-4 h-4 text-sky-400" />
              <span className="hidden lg:inline">Image</span>
            </button>

            <div className="w-px h-5 bg-slate-700 mx-0.5" />

            {/* ✨ AI Edit Floating Dock Tool */}
            <button
              onClick={onToggleAiEdit}
              className={`px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isAiEditOpen
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400'
                  : 'bg-gradient-to-r from-emerald-500/20 to-violet-500/20 border border-emerald-500/40 text-emerald-300 hover:text-white hover:bg-emerald-500/30'
              }`}
              title="AI Natural Language PDF Edit (✨)"
            >
              <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>AI Edit</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
