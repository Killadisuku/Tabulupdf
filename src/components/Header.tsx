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
  Plus,
  RefreshCw,
  Table,
  Wrench,
  Home
} from 'lucide-react';

export type WorkspaceTab = 'home' | 'edit' | 'convert' | 'extract' | 'tools' | 'history';

interface HeaderProps {
  hasDocument: boolean;
  fileName?: string;
  pageCount?: number;
  onExportClick?: () => void;
  onOpenNew: () => void;
  activeTab: WorkspaceTab;
  setActiveTab: (tab: WorkspaceTab) => void;
  onOpenVault?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  hasDocument,
  fileName,
  pageCount,
  onOpenNew,
  activeTab,
  setActiveTab,
  onOpenVault,
}) => {
  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Nav */}
        <div className="flex items-center space-x-6">
          <div 
            className="flex items-center space-x-2.5 cursor-pointer group"
            onClick={() => setActiveTab('home')}
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
              onClick={() => setActiveTab('home')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'home'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>

            <button
              onClick={() => setActiveTab('edit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'edit'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Edit PDF</span>
            </button>

            <button
              onClick={() => setActiveTab('convert')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'convert'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              <span>Convert</span>
            </button>

            <button
              onClick={() => setActiveTab('extract')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'extract'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Table className="w-3.5 h-3.5 text-teal-400" />
              <span>Extract Tables</span>
            </button>

            <button
              onClick={() => setActiveTab('tools')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'tools'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-purple-400" />
              <span>PDF Tools</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-slate-800 text-slate-200 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History</span>
            </button>
          </nav>
        </div>

        {/* Middle: Active Document Badge (if loaded) */}
        {hasDocument && fileName && (
          <div className="hidden lg:flex items-center space-x-2 bg-slate-950/80 px-3 py-1.5 rounded-full border border-slate-800 max-w-sm">
            <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-xs text-slate-300 truncate font-medium">{fileName}</span>
            {pageCount !== undefined && (
              <span className="text-[10px] text-slate-500 shrink-0">({pageCount} {pageCount === 1 ? 'pg' : 'pgs'})</span>
            )}
          </div>
        )}

        {/* Right Action buttons */}
        <div className="flex items-center space-x-2.5">
          {hasDocument ? (
            <button
              onClick={onOpenNew}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Document</span>
            </button>
          ) : (
            onOpenVault && (
              <button
                onClick={onOpenVault}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Sample Documents</span>
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
};
