import React from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Image,
  Layers,
  ArrowRight,
  Eye,
  RefreshCw,
  Sparkles,
  Loader2,
  X,
  Share2,
  Check
} from 'lucide-react';

export type ConversionStep = 'analyzing' | 'extracting' | 'formatting' | 'packaging' | 'done' | 'error';

interface ConversionProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  targetFormat: string;
  outputFileName: string;
  currentStep: ConversionStep;
  progressPercent: number; // 0 to 100
  stepMessage: string;
  error?: string;
  onDownload: () => void;
  onPreview?: () => void;
  onConvertAnother: () => void;
}

export const ConversionProgressModal: React.FC<ConversionProgressModalProps> = ({
  isOpen,
  onClose,
  fileName,
  targetFormat,
  outputFileName,
  currentStep,
  progressPercent,
  stepMessage,
  error,
  onDownload,
  onPreview,
  onConvertAnother,
}) => {
  if (!isOpen) return null;

  const isDone = currentStep === 'done';
  const isError = currentStep === 'error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative text-slate-100 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-emerald-500/15 blur-3xl pointer-events-none rounded-full" />

        {/* Close Button (if done or error) */}
        {(isDone || isError) && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {!isDone && !isError && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-5 relative">
              <Loader2 className="w-8 h-8 animate-spin" />
              <div className="absolute inset-0 rounded-2xl border-2 border-emerald-400/30 animate-ping opacity-25" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1.5">
              Converting to {targetFormat.toUpperCase()}
            </h3>
            <p className="text-xs text-slate-400 mb-6 font-mono">
              {fileName}
            </p>

            {/* Progress bar */}
            <div className="w-full bg-slate-950 rounded-full h-2.5 p-0.5 border border-slate-800 mb-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.max(8, progressPercent)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-4 font-mono">
              <span className="truncate max-w-[240px] text-left text-slate-300">{stepMessage}</span>
              <span className="font-bold text-emerald-400 shrink-0 ml-2">{Math.round(progressPercent)}%</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>100% private in-browser WebAssembly processing</span>
            </div>
          </div>
        )}

        {isDone && (
          <div className="text-center py-2">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-9 h-9 text-emerald-400" />
            </div>

            <h3 className="text-xl font-black text-white mb-1">
              Conversion Complete!
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Your document has been converted and is ready for download.
            </p>

            {/* File Transformation Badge */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 mb-6 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 truncate text-left">
                <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="text-slate-300 font-medium truncate max-w-[120px]">{fileName}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />
              <div className="flex items-center gap-2.5 truncate text-left">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-emerald-300 font-bold truncate max-w-[130px]">{outputFileName}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <button
                onClick={onDownload}
                className="w-full py-3.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-500/20 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download {targetFormat.toUpperCase()}
              </button>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {onPreview && (
                  <button
                    onClick={onPreview}
                    className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    Inspect Data
                  </button>
                )}
                <button
                  onClick={onConvertAnother}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  Convert Another
                </button>
              </div>
            </div>
          </div>
        )}

        {isError && (
          <div className="text-center py-2">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-rose-400" />
            </div>

            <h3 className="text-lg font-bold text-white mb-2">
              Conversion Failed
            </h3>
            <p className="text-xs text-rose-300/90 mb-6 bg-rose-950/30 p-3 rounded-xl border border-rose-900/40">
              {error || 'Unable to process this file. Please try another PDF or use AI OCR.'}
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all"
              >
                Close
              </button>
              <button
                onClick={onConvertAnother}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all cursor-pointer"
              >
                Try Another PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
