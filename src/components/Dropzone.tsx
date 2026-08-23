import React, { useRef, useState } from 'react';
import {
  Upload,
  FileText,
  Sparkles,
  Shield,
  Zap,
  CheckCircle2,
  Table,
  Layers,
  ArrowRight,
  TrendingUp,
  CreditCard,
  PackageCheck,
  ReceiptText
} from 'lucide-react';
import { ExtractionOptions, TablePreset } from '../types';
import { SAMPLE_DOCUMENTS, SampleDoc } from '../utils/samplePdfs';

interface DropzoneProps {
  onFileSelect: (files: FileList | File[]) => void;
  onSelectSample: (sample: SampleDoc) => void;
  options: ExtractionOptions;
  setOptions: React.Dispatch<React.SetStateAction<ExtractionOptions>>;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  onFileSelect,
  onSelectSample,
  options,
  setOptions,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Hero Headline */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
          <Zap className="w-3.5 h-3.5" />
          Ultra-Fast PDF Table Extraction Engine
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Convert PDF Tables to Clean <span className="text-emerald-400">Excel & CSV</span>
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto mt-2.5">
          Extract structured spreadsheets from invoices, bank statements, financial audits, and multi-page reports with cell precision and AI-powered OCR.
        </p>
      </div>

      {/* Main Upload Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-emerald-400 bg-emerald-950/20 scale-[1.005]'
            : 'border-slate-700 bg-slate-900/60 hover:border-slate-500 hover:bg-slate-900/90'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4 text-emerald-400 shadow-inner">
            <Upload className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-bold text-white mb-1">
            Drag and drop your PDF here
          </h3>
          <p className="text-xs text-slate-400 mb-5">
            or <span className="text-emerald-400 font-semibold underline underline-offset-4">browse files</span> from your computer. Supports multi-page & scanned PDFs.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
              <Shield className="w-3 h-3 text-emerald-400" /> 100% Client-Side Privacy
            </span>
            <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
              <Sparkles className="w-3 h-3 text-purple-400" /> Gemini Vision AI Engine
            </span>
            <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
              <FileText className="w-3 h-3 text-blue-400" /> .XLSX, .CSV, .TSV, .JSON
            </span>
          </div>
        </div>
      </div>

      {/* Quick Test Samples */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            Instant Demo Datasets (Click to Load)
          </span>
          <span className="text-[11px] text-slate-500">No upload required</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SAMPLE_DOCUMENTS.map((sample) => {
            const getIcon = () => {
              switch (sample.id) {
                case 'bank-statement':
                  return <CreditCard className="w-4 h-4 text-emerald-400" />;
                case 'sales-report':
                  return <TrendingUp className="w-4 h-4 text-blue-400" />;
                case 'inventory-logistics':
                  return <PackageCheck className="w-4 h-4 text-amber-400" />;
                case 'commercial-invoice':
                  return <ReceiptText className="w-4 h-4 text-purple-400" />;
                default:
                  return <Table className="w-4 h-4 text-slate-400" />;
              }
            };

            return (
              <button
                key={sample.id}
                onClick={() => onSelectSample(sample)}
                className="group text-left p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
                      {getIcon()}
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {sample.badge}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                    {sample.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {sample.description}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                  <span>{sample.pageCount} page(s)</span>
                  <span className="font-semibold text-emerald-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Try Demo <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Extraction Options Bar */}
      <div className="mt-8 p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-xs">
        <div className="font-semibold text-slate-300 mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Table className="w-4 h-4 text-emerald-400" /> Default Parsing Rules
          </span>
          <span className="text-[11px] text-slate-500 font-normal">Customizable anytime in workbench</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer bg-slate-950/40 p-2.5 rounded-lg border border-slate-800 hover:border-slate-700">
            <input
              type="checkbox"
              checked={options.firstRowIsHeader}
              onChange={(e) =>
                setOptions((prev) => ({ ...prev, firstRowIsHeader: e.target.checked }))
              }
              className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
            />
            <span>Auto-detect First Row as Header</span>
          </label>

          <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer bg-slate-950/40 p-2.5 rounded-lg border border-slate-800 hover:border-slate-700">
            <input
              type="checkbox"
              checked={options.detectDataTypes}
              onChange={(e) =>
                setOptions((prev) => ({ ...prev, detectDataTypes: e.target.checked }))
              }
              className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
            />
            <span>Infer Numbers, Dates & Currencies</span>
          </label>

          <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer bg-slate-950/40 p-2.5 rounded-lg border border-slate-800 hover:border-slate-700">
            <input
              type="checkbox"
              checked={options.trimWhitespace}
              onChange={(e) =>
                setOptions((prev) => ({ ...prev, trimWhitespace: e.target.checked }))
              }
              className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
            />
            <span>Trim Whitespace & Clean Cells</span>
          </label>
        </div>
      </div>
    </div>
  );
};
