import React, { useState } from 'react';
import {
  Layers,
  Scissors,
  Minimize2,
  RotateCw,
  Trash2,
  Copy,
  Lock,
  Stamp,
  FileCheck,
  ArrowRight,
  ShieldCheck,
  Zap,
  Wrench,
  Sparkles,
  FileText
} from 'lucide-react';
import { PdfToolMode } from './PdfToolsWorkspaceModal';

interface ToolsWorkspaceProps {
  fileName: string;
  fileSize: number;
  totalPages: number;
  onOpenPdfTool: (mode: PdfToolMode) => void;
  onBackToDecision: () => void;
  onNavigateToEdit: () => void;
  onNavigateToConvert: () => void;
}

export const ToolsWorkspace: React.FC<ToolsWorkspaceProps> = ({
  fileName,
  fileSize,
  totalPages,
  onOpenPdfTool,
  onBackToDecision,
  onNavigateToEdit,
  onNavigateToConvert,
}) => {
  const tools = [
    {
      id: 'merge' as PdfToolMode,
      title: 'Merge PDF',
      badge: 'Combine Files',
      desc: 'Combine multiple PDF documents, reports, or invoices into a single unified PDF with custom order.',
      icon: <Layers className="w-6 h-6 text-indigo-400" />,
      accent: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-400',
    },
    {
      id: 'split' as PdfToolMode,
      title: 'Split PDF',
      badge: 'Separate Pages',
      desc: 'Extract individual pages, split into separate documents by page ranges, or burst every page.',
      icon: <Scissors className="w-6 h-6 text-rose-400" />,
      accent: 'border-rose-500/40 bg-rose-500/10 text-rose-400',
    },
    {
      id: 'compress' as PdfToolMode,
      title: 'Compress PDF',
      badge: 'Reduce Size',
      desc: 'Optimize embedded streams and images to dramatically shrink PDF size for email & uploads.',
      icon: <Minimize2 className="w-6 h-6 text-amber-400" />,
      accent: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
    },
    {
      id: 'rotate' as PdfToolMode,
      title: 'Rotate Pages',
      badge: 'Orientation',
      desc: 'Fix sideways or upside-down scans by rotating specific pages or all pages 90°, 180°, or 270°.',
      icon: <RotateCw className="w-6 h-6 text-emerald-400" />,
      accent: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
    },
    {
      id: 'reorder' as PdfToolMode,
      title: 'Reorder & Organize',
      badge: 'Page Manager',
      desc: 'Drag and drop page thumbnails to resequence, duplicate, or re-arrange document structure.',
      icon: <Layers className="w-6 h-6 text-teal-400" />,
      accent: 'border-teal-500/40 bg-teal-500/10 text-teal-400',
    },
    {
      id: 'delete' as PdfToolMode,
      title: 'Delete Pages',
      badge: 'Remove',
      desc: 'Select and permanently remove blank, duplicate, or confidential pages from your document.',
      icon: <Trash2 className="w-6 h-6 text-red-400" />,
      accent: 'border-red-500/40 bg-red-500/10 text-red-400',
    },
    {
      id: 'protect' as PdfToolMode,
      title: 'Protect & Encrypt',
      badge: 'Security',
      desc: 'Add strong AES password encryption to prevent unauthorized viewing, copying, or printing.',
      icon: <Lock className="w-6 h-6 text-blue-400" />,
      accent: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
    },
    {
      id: 'watermark' as PdfToolMode,
      title: 'Watermark PDF',
      badge: 'Branding',
      desc: 'Stamp custom text ("CONFIDENTIAL", "DRAFT") or company logo across all pages with custom opacity.',
      icon: <Stamp className="w-6 h-6 text-purple-400" />,
      accent: 'border-purple-500/40 bg-purple-500/10 text-purple-400',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
        {/* Workspace Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                PDF Tools Hub
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {fileName} ({totalPages} {totalPages === 1 ? 'page' : 'pages'})
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
              Manage & Organize PDF
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Select a specialized tool to manipulate, organize, compress, or secure your PDF.
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

        {/* Tools Catalog Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tools.map((tool) => (
            <div
              key={tool.id}
              onClick={() => onOpenPdfTool(tool.id)}
              className="group bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-lg hover:shadow-purple-500/5 hover:-translate-y-0.5 select-none"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {tool.icon}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800">
                    {tool.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1 line-clamp-3">
                    {tool.desc}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-purple-400 group-hover:text-purple-300">
                <span>Launch Tool</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>

        {/* Privacy Note */}
        <div className="pt-6 border-t border-slate-800/60 flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>All PDF tools execute directly in your browser with WebAssembly. No files are uploaded to the cloud.</span>
        </div>
      </div>
    </div>
  );
};
