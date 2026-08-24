import React from 'react';
import {
  Sparkles,
  FileSpreadsheet,
  FileText,
  Table,
  Wrench,
  ArrowRight,
  ShieldCheck,
  Zap,
  Layers,
  FileCheck,
  RefreshCw,
  FolderOpen,
  Trash2
} from 'lucide-react';
import { SheetData } from '../types';

interface DecisionHubProps {
  fileName: string;
  fileSize: number;
  totalPages: number;
  detectedTableCount: number;
  isScannedDetected: boolean;
  sheets: SheetData[];
  thumbnailUrl?: string;
  onNavigate: (tab: 'edit' | 'convert' | 'extract' | 'tools') => void;
  onRemoveFile: () => void;
  onOpenSampleVault?: () => void;
}

export const DecisionHub: React.FC<DecisionHubProps> = ({
  fileName,
  fileSize,
  totalPages,
  detectedTableCount,
  isScannedDetected,
  thumbnailUrl,
  onNavigate,
  onRemoveFile,
}) => {
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const decisionOptions = [
    {
      id: 'edit' as const,
      title: 'Edit PDF',
      badge: 'In-Place Editor',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      tagline: 'Edit text, tables, images, arrows, signatures and more.',
      description:
        'Click directly on phone numbers, addresses, table cells, or text to edit in real time on this PDF, add whiteout, annotations & shapes, then download the modified PDF.',
      icon: <Sparkles className="w-7 h-7 text-emerald-400" />,
      buttonText: 'Open PDF Editor',
      buttonClass: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20',
      borderHover: 'hover:border-emerald-500/60 hover:shadow-emerald-500/10',
      accentGlow: 'from-emerald-500/10 via-transparent to-transparent',
    },
    {
      id: 'convert' as const,
      title: 'Convert PDF',
      badge: 'Multi-Format',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      tagline: 'Convert your PDF to Excel, Word, CSV, images and other formats.',
      description:
        'Export high-fidelity Excel (.xlsx), Microsoft Word (.docx), PowerPoint (.pptx), high-res JPG/PNG images, clean CSV, Text, HTML, or JSON with intelligent formatting preservation.',
      icon: <RefreshCw className="w-7 h-7 text-blue-400" />,
      buttonText: 'Convert PDF',
      buttonClass: 'bg-blue-500 hover:bg-blue-400 text-slate-950 shadow-blue-500/20',
      borderHover: 'hover:border-blue-500/60 hover:shadow-blue-500/10',
      accentGlow: 'from-blue-500/10 via-transparent to-transparent',
    },
    {
      id: 'extract' as const,
      title: 'Extract Tables',
      badge: 'Spreadsheet Hub',
      badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      tagline: 'Extract tables into editable Excel or CSV.',
      description:
        'Detects tabular regions across all pages automatically. Edit rows, columns, formulas, currencies, and headers in an interactive spreadsheet before exporting.',
      icon: <Table className="w-7 h-7 text-teal-400" />,
      buttonText: 'Extract Tables',
      buttonClass: 'bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-teal-500/20',
      borderHover: 'hover:border-teal-500/60 hover:shadow-teal-500/10',
      accentGlow: 'from-teal-500/10 via-transparent to-transparent',
    },
    {
      id: 'tools' as const,
      title: 'PDF Tools',
      badge: 'Page Operations',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      tagline: 'Merge, split, compress, rotate and manage PDF pages.',
      description:
        'Organize and manipulate PDF documents: merge multiple files, split pages, compress file size, rotate orientations, protect with passwords, watermark, and reorder.',
      icon: <Wrench className="w-7 h-7 text-purple-400" />,
      buttonText: 'Explore PDF Tools',
      buttonClass: 'bg-purple-500 hover:bg-purple-400 text-white shadow-purple-500/20',
      borderHover: 'hover:border-purple-500/60 hover:shadow-purple-500/10',
      accentGlow: 'from-purple-500/10 via-transparent to-transparent',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-8 animate-in fade-in duration-300">
      {/* 1. Active Document Summary Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-16 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden shadow-inner relative">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt="Document thumbnail"
                className="w-full h-full object-contain"
              />
            ) : (
              <FileText className="w-7 h-7 text-emerald-400" />
            )}
            <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 text-[9px] font-bold text-center text-slate-400 py-0.5 border-t border-slate-800">
              PDF
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white truncate max-w-xs sm:max-w-md">
                {fileName}
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                Ready
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-400 font-mono">
              <span>{formatBytes(fileSize)}</span>
              <span>•</span>
              <span>{totalPages} {totalPages === 1 ? 'page' : 'pages'}</span>
              {detectedTableCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-teal-400 font-sans font-semibold flex items-center gap-1">
                    <Table className="w-3.5 h-3.5" />
                    {detectedTableCount} {detectedTableCount === 1 ? 'table' : 'tables'} detected
                  </span>
                </>
              )}
              {isScannedDetected && (
                <>
                  <span>•</span>
                  <span className="text-amber-400 font-sans font-semibold">
                    Scanned Document (OCR Ready)
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={onRemoveFile}
            className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl border border-slate-800 hover:border-rose-900/50 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Upload a different document"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Switch PDF</span>
          </button>
        </div>
      </div>

      {/* 2. Main Question Section */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
          What would you like to do with this PDF?
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
          Choose a dedicated workspace below. You can easily switch between workflows at any time.
        </p>
      </div>

      {/* 3. 4 Large Decision Workspace Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {decisionOptions.map((opt) => (
          <div
            key={opt.id}
            onClick={() => onNavigate(opt.id)}
            className={`group bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-lg hover:shadow-2xl relative overflow-hidden bg-gradient-to-b ${opt.accentGlow} ${opt.borderHover} hover:-translate-y-0.5`}
          >
            {/* Card Content */}
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                  {opt.icon}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${opt.badgeColor}`}>
                  {opt.badge}
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center gap-2">
                  <span>{opt.title}</span>
                </h3>
                <p className="text-sm font-semibold text-slate-300 mt-1">
                  {opt.tagline}
                </p>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {opt.description}
                </p>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-6 mt-4 border-t border-slate-800/80 flex items-center justify-between relative z-10">
              <span className="text-xs font-medium text-slate-500 group-hover:text-slate-400 transition-colors">
                Dedicated workspace
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(opt.id);
                }}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md group-hover:gap-3 cursor-pointer ${opt.buttonClass}`}
              >
                <span>{opt.buttonText}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Privacy & Performance Assurance Footer */}
      <div className="pt-4 border-t border-slate-800/60 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
        <div className="flex items-center gap-1.5 text-slate-400 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>100% Client-Side Privacy: Documents never leave your browser</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 font-medium">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Instant Processing with WebAssembly & Local PDF Engines</span>
        </div>
      </div>
    </div>
  );
};
