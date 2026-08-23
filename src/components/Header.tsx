import React from 'react';
import { FileSpreadsheet, Download, Plus, Sparkles, FolderUp, Layers, Globe } from 'lucide-react';
import { SheetData } from '../types';

interface HeaderProps {
  activeTab: 'converter' | 'batch' | 'samples';
  setActiveTab: (tab: 'converter' | 'batch' | 'samples') => void;
  sheets: SheetData[];
  onOpenExport: () => void;
  onNewDocument: () => void;
  hasDocument: boolean;
  onOpenAiModal: () => void;
  onOpenShare?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  sheets,
  onOpenExport,
  onNewDocument,
  hasDocument,
  onOpenAiModal,
  onOpenShare,
}) => {
  const totalRows = sheets.reduce((sum, s) => sum + s.rows.length, 0);

  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-inner font-bold text-xl tracking-tight">
            <FileSpreadsheet className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Tabula<span className="text-emerald-400">PDF</span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                v2.6 Pro
              </span>
            </span>
          </div>
        </div>

        {/* Navigation Zone (Top Bar Contract) */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('converter')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all whitespace-nowrap ${
              activeTab === 'converter'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            PDF Workbench
          </button>
          <button
            onClick={() => setActiveTab('batch')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'batch'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderUp className="w-3.5 h-3.5" />
            Batch Queue
          </button>
          <button
            onClick={() => setActiveTab('samples')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'samples'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            Sample Vault
          </button>
        </nav>

        {/* Action Zone */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenShare && (
            <button
              onClick={onOpenShare}
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-lg border border-slate-800 hover:bg-slate-800 transition-all flex items-center gap-1.5"
              title="Share or open on mobile"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Share</span>
            </button>
          )}

          {hasDocument && (
            <button
              onClick={onOpenAiModal}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold bg-gradient-to-r from-purple-600/30 to-indigo-600/30 border border-purple-500/40 text-purple-200 hover:bg-purple-600/40 px-3 py-2 rounded-lg transition-all"
              title="Enhance with AI Vision OCR"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              AI Extract
            </button>
          )}

          {hasDocument && (
            <button
              onClick={onNewDocument}
              className="text-xs font-medium text-slate-400 hover:text-white px-3 py-2 rounded-lg border border-slate-800 hover:bg-slate-800 transition-all flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              New File
            </button>
          )}

          <button
            onClick={onOpenExport}
            disabled={sheets.length === 0 || totalRows === 0}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              sheets.length > 0 && totalRows > 0
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
            {totalRows > 0 && (
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-emerald-700/60 text-[10px]">
                {totalRows} rows
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
