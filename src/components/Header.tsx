import React from 'react';
import { 
  FileSpreadsheet, 
  Sparkles, 
  Download, 
  Layers, 
  FolderOpen, 
  Share2, 
  FileText, 
  Lock,
  ChevronRight,
  Files,
  Zap,
  History,
  Grid,
  ShieldCheck,
  Plus
} from 'lucide-react';

interface HeaderProps {
  hasDocument: boolean;
  fileName?: string;
  pageCount?: number;
  onExportClick?: () => void;
  onOpenNew: () => void;
  activeTab: 'converter' | 'tools' | 'batch' | 'history';
  setActiveTab: (tab: 'converter' | 'tools' | 'batch' | 'history') => void;
  onOpenVault?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  hasDocument,
  fileName,
  pageCount,
  onExportClick,
  onOpenNew,
  activeTab,
  setActiveTab,
  onOpenVault
}) => {
  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Nav */}
        <div className="flex items-center space-x-6">
          <div 
            className="flex items-center space-x-2.5 cursor-pointer group"
            onClick={() => setActiveTab('converter')}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <FileSpreadsheet className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                Tabula<span className="text-emerald-400">PDF</span>
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('converter')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'converter'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Converter
            </button>

            <button
              onClick={() => setActiveTab('tools')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'tools'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              All PDF Tools
            </button>

            <button
              onClick={() => setActiveTab('batch')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'batch'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Files className="w-3.5 h-3.5" />
              Batch Queue
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              History
            </button>
          </nav>
        </div>

        {/* Middle: Active Document Badge (if loaded) */}
        {hasDocument && fileName && (
          <div className="hidden lg:flex items-center space-x-2 bg-slate-950/80 px-3 py-1.5 rounded-full border border-slate-800 max-w-sm">
            <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-xs text-slate-300 truncate font-medium">{fileName}</span>
            {pageCount !== undefined && (
              <span className="text-[10px] text-slate-500 shrink-0">({pageCount} pgs)</span>
            )}
          </div>
        )}

        {/* Right Action buttons */}
        <div className="flex items-center space-x-2.5">
          {hasDocument ? (
            <button
              onClick={onOpenNew}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Upload New</span>
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>100% In-Browser Privacy</span>
            </div>
          )}

          {/* Mobile menu icon toggles if needed */}
          <div className="flex md:hidden items-center gap-1">
            <button
              onClick={() => setActiveTab('tools')}
              className={`p-2 rounded-xl text-xs font-semibold ${activeTab === 'tools' ? 'text-emerald-400 bg-slate-800' : 'text-slate-400'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`p-2 rounded-xl text-xs font-semibold ${activeTab === 'history' ? 'text-emerald-400 bg-slate-800' : 'text-slate-400'}`}
            >
              <History className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
