import React from 'react';
import {
  FileSpreadsheet,
  FileText,
  Image,
  Layers,
  Sparkles,
  Scissors,
  RotateCw,
  Minimize2,
  Files,
  Code2,
  Table,
  ArrowRight,
  ShieldCheck,
  Zap,
  HelpCircle
} from 'lucide-react';
import { PdfToolMode } from './PdfToolsWorkspaceModal';

interface AllToolsDirectoryProps {
  onSelectTool: (toolId: string) => void;
  onOpenPdfToolModal: (mode: PdfToolMode) => void;
  hasDocument: boolean;
}

export const AllToolsDirectory: React.FC<AllToolsDirectoryProps> = ({
  onSelectTool,
  onOpenPdfToolModal,
  hasDocument,
}) => {
  const tools = [
    {
      id: 'excel',
      category: 'Conversion',
      title: 'PDF to Excel',
      ext: '.xlsx',
      desc: 'Extract structured tables, numbers, currencies, and dates into editable Microsoft Excel spreadsheets.',
      icon: <FileSpreadsheet className="w-6 h-6 text-emerald-400" />,
      badge: 'Popular',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      id: 'word',
      category: 'Conversion',
      title: 'PDF to Word',
      ext: '.docx',
      desc: 'Convert PDF documents, reports, and resumes into editable Microsoft Word (.docx) documents.',
      icon: <FileText className="w-6 h-6 text-blue-400" />,
      badge: 'New',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
    {
      id: 'csv',
      category: 'Conversion',
      title: 'PDF to CSV / TSV',
      ext: '.csv',
      desc: 'Export tabular datasets into clean comma-separated values for Python, Pandas, and SQL databases.',
      icon: <Table className="w-6 h-6 text-teal-400" />,
    },
    {
      id: 'images',
      category: 'Conversion',
      title: 'PDF to Images',
      ext: 'JPG / PNG',
      desc: 'Extract high-resolution (up to 300 DPI) images or render entire pages as crisp PNGs or JPGs.',
      icon: <Image className="w-6 h-6 text-purple-400" />,
    },
    {
      id: 'ocr',
      category: 'AI & OCR',
      title: 'Scanned PDF to OCR',
      ext: 'AI Vision',
      desc: 'Recognize scanned paper documents, receipts, and photos using intelligent Gemini Vision OCR.',
      icon: <Sparkles className="w-6 h-6 text-amber-400" />,
      badge: 'AI Powered',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'text',
      category: 'Conversion',
      title: 'PDF to Plain Text',
      ext: '.txt',
      desc: 'Extract all textual content from PDF documents while maintaining line breaks and structure.',
      icon: <FileText className="w-6 h-6 text-slate-400" />,
    },
    {
      id: 'html',
      category: 'Conversion',
      title: 'PDF to Web HTML',
      ext: '.html',
      desc: 'Convert documents into responsive web pages with embedded tables and clean typography.',
      icon: <Code2 className="w-6 h-6 text-indigo-400" />,
    },
    {
      id: 'json_xml',
      category: 'Developer',
      title: 'PDF to JSON & XML',
      ext: '.json / .xml',
      desc: 'Extract machine-readable structured hierarchical objects for APIs and data pipelines.',
      icon: <Code2 className="w-6 h-6 text-sky-400" />,
    },
    {
      id: 'merge',
      category: 'PDF Tools',
      title: 'Merge PDFs',
      ext: 'PDF Utility',
      desc: 'Combine multiple PDF files in any order into a single unified master document.',
      icon: <Layers className="w-6 h-6 text-rose-400" />,
    },
    {
      id: 'split',
      category: 'PDF Tools',
      title: 'Split PDF',
      ext: 'PDF Utility',
      desc: 'Extract specific page ranges (e.g. 1-3, 5, 8-10) into a separate lightweight PDF file.',
      icon: <Scissors className="w-6 h-6 text-pink-400" />,
    },
    {
      id: 'compress',
      category: 'PDF Tools',
      title: 'Compress PDF',
      ext: 'PDF Utility',
      desc: 'Reduce PDF file size by rebuilding object streams while preserving visual fidelity.',
      icon: <Minimize2 className="w-6 h-6 text-cyan-400" />,
    },
    {
      id: 'rotate',
      category: 'PDF Tools',
      title: 'Rotate Pages',
      ext: 'PDF Utility',
      desc: 'Permanently rotate PDF pages clockwise by 90°, 180°, or 270° degrees.',
      icon: <RotateCw className="w-6 h-6 text-violet-400" />,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="text-center space-y-2 mb-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Complete PDF Tool Directory
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto">
          Choose any conversion or document manipulation tool. All operations run 100% privately in your browser.
        </p>
      </div>

      {/* Grid of Tools */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {tools.map((tool) => (
          <div
            key={tool.id}
            onClick={() => {
              if (['merge', 'split', 'compress', 'rotate'].includes(tool.id)) {
                onOpenPdfToolModal(tool.id as PdfToolMode);
              } else {
                onSelectTool(tool.id);
              }
            }}
            className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center group-hover:scale-105 transition-transform shadow-md">
                  {tool.icon}
                </div>
                {tool.badge && (
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${tool.badgeColor}`}>
                    {tool.badge}
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors mb-1.5 flex items-center justify-between">
                <span>{tool.title}</span>
                <span className="text-xs font-mono text-slate-500">{tool.ext}</span>
              </h3>

              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                {tool.desc}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-emerald-400 group-hover:translate-x-0.5 transition-transform">
              <span>{hasDocument ? 'Apply to current file' : 'Launch tool'}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
