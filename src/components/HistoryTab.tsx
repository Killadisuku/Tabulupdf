import React from 'react';
import {
  History,
  Trash2,
  Download,
  FileSpreadsheet,
  FileText,
  Image,
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { HistoryItem, clearConversionHistory, removeHistoryItem } from '../utils/historyStorage';

interface HistoryTabProps {
  history: HistoryItem[];
  onRefreshHistory: () => void;
  onUploadNew: () => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  history,
  onRefreshHistory,
  onUploadNew,
}) => {
  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear your local conversion history?')) {
      clearConversionHistory();
      onRefreshHistory();
    }
  };

  const handleDeleteItem = (id: string) => {
    removeHistoryItem(id);
    onRefreshHistory();
  };

  const getFormatIcon = (fmt: string) => {
    switch (fmt) {
      case 'xlsx':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
      case 'docx':
        return <FileText className="w-5 h-5 text-blue-400" />;
      case 'csv':
        return <FileSpreadsheet className="w-5 h-5 text-teal-400" />;
      case 'images':
        return <Image className="w-5 h-5 text-purple-400" />;
      default:
        return <Layers className="w-5 h-5 text-amber-400" />;
    }
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <History className="w-6 h-6 text-emerald-400" />
            Conversion History
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Review your recent document extractions and exports.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear History
          </button>
        )}
      </div>

      {/* Privacy Banner */}
      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-3 mb-6">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
        <div>
          <span className="font-bold text-white">Client-Side Privacy Guarantee:</span>{' '}
          Your actual document contents and files are never stored on any server. This log is stored strictly in your local browser storage for convenience.
        </div>
      </div>

      {/* History Items List */}
      {history.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-300 mb-1">No conversions yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Once you convert a PDF into Excel, Word, CSV, or images, your activity will appear here.
            </p>
          </div>
          <button
            onClick={onUploadNew}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Convert a Document
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  {getFormatIcon(item.outputFormat)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                      {item.fileName}
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-emerald-300 border border-slate-700 shrink-0">
                      .{item.outputFormat}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-600" />
                      {formatTimestamp(item.timestamp)}
                    </span>
                    <span>•</span>
                    <span>{formatBytes(item.originalSize)}</span>
                    {item.tableCount !== undefined && item.tableCount > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-slate-400">{item.tableCount} table(s)</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 self-end sm:self-auto shrink-0">
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  title="Remove from history"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
