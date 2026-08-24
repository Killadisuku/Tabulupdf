import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  Sparkles, 
  Lock, 
  Zap, 
  ShieldCheck, 
  FileSpreadsheet, 
  CheckCircle2, 
  Sliders, 
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Layers,
  FileCheck,
  ArrowRight,
  Database,
  Check,
  X,
  Plus
} from 'lucide-react';
import { ExtractionOptions } from '../types';
import { SAMPLE_DOCUMENTS, SampleDoc } from '../utils/samplePdfs';

interface DropzoneProps {
  onFileSelect: (files: FileList | File[]) => void;
  onSelectSample: (sample: SampleDoc) => void;
  options: ExtractionOptions;
  setOptions: React.Dispatch<React.SetStateAction<ExtractionOptions>>;
  onExploreToolsClick?: () => void;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  onFileSelect,
  onSelectSample,
  options,
  setOptions,
  onExploreToolsClick,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const validateAndProcessFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    setValidationError(null);

    if (fileArray.length === 0) return;

    // Validate type
    const nonPdf = fileArray.find(
      (f) => f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')
    );
    if (nonPdf) {
      setValidationError('Please select valid PDF documents (.pdf).');
      return;
    }

    // Validate size (< 100MB)
    const tooLarge = fileArray.find((f) => f.size > 100 * 1024 * 1024);
    if (tooLarge) {
      setValidationError(`"${tooLarge.name}" exceeds the 100MB limit.`);
      return;
    }

    onFileSelect(files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcessFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFiles(e.target.files);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:py-16 space-y-12">
      {/* 1. Hero Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>100% In-Browser Privacy • Zero Server Storage</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
          Edit PDFs in <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">Real Time</span> or convert
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Open PDFs directly to edit text, numbers, phone numbers, and tables in-place without converting. Or export directly to Excel, Word, and images.
        </p>

        {onExploreToolsClick && (
          <div className="pt-1 flex items-center justify-center gap-3">
            <button
              onClick={onExploreToolsClick}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Explore All PDF Tools</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 2. Primary Large Drag-and-Drop Area */}
      <div className="space-y-3">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-14 text-center cursor-pointer transition-all duration-200 group overflow-hidden ${
            isDragging
              ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01] shadow-2xl shadow-emerald-500/20'
              : 'border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-900/90 shadow-xl'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />

          <div className="relative z-10 flex flex-col items-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all duration-300 shadow-lg">
              <Upload className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {isDragging ? 'Drop your PDF here' : 'Drop your PDF here'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                or <span className="text-emerald-400 font-semibold underline decoration-emerald-500/50 group-hover:text-emerald-300">browse files</span> from your device
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-500">
              <span className="bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800">
                Supports PDF files up to 100MB
              </span>
              <span className="bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800">
                Multiple files supported
              </span>
            </div>
          </div>
        </div>

        {/* Validation Error */}
        {validationError && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-3 text-xs text-rose-300 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{validationError}</span>
            </div>
            <button onClick={() => setValidationError(null)} className="p-1 text-rose-400 hover:text-rose-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 3. Try Sample Documents Quick Vault */}
      <div className="p-5 rounded-3xl bg-slate-900/40 border border-slate-800/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-300">No PDF on hand? Try a demo dataset:</span>
          </div>
          <span className="text-[10px] text-slate-500">Instant 1-Click Load</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {SAMPLE_DOCUMENTS.map((sample) => (
            <button
              key={sample.id}
              onClick={() => onSelectSample(sample)}
              className="p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-left transition-all group flex items-center justify-between cursor-pointer"
            >
              <div className="min-w-0 pr-2">
                <div className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition-colors truncate">
                  {sample.title}
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                  {sample.description}
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                {sample.category}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Four Core Simple Benefits */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
            <Zap className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-white mb-1">Fast</h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Process your documents quickly with zero server queuing.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-white mb-1">Accurate</h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Preserve tables, numeric precision, and document structure.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-3">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-white mb-1">Simple</h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            No complicated software or Java plugins required.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
            <Lock className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-white mb-1">Private</h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Processed 100% locally in your client browser memory.
          </p>
        </div>
      </div>
    </div>
  );
};
