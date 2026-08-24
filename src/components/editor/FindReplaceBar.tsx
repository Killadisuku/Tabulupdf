import React from 'react';
import { Search, Replace, X, ChevronDown, ChevronUp, Check } from 'lucide-react';

interface FindReplaceBarProps {
  isOpen: boolean;
  onClose: () => void;
  findQuery: string;
  setFindQuery: (q: string) => void;
  replaceQuery: string;
  setReplaceQuery: (q: string) => void;
  onReplaceCurrent: () => void;
  onReplaceAll: () => void;
  matchCount: number;
}

export const FindReplaceBar: React.FC<FindReplaceBarProps> = ({
  isOpen,
  onClose,
  findQuery,
  setFindQuery,
  replaceQuery,
  setReplaceQuery,
  onReplaceCurrent,
  onReplaceAll,
  matchCount,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute top-14 right-6 z-40 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-3 w-80 space-y-2 animate-in fade-in slide-in-from-top-2 select-none">
      {/* Header */}
      <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
        <div className="flex items-center gap-1.5 font-semibold text-slate-200">
          <Search className="w-3.5 h-3.5 text-emerald-400" />
          <span>Find & Replace on PDF</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Find Input */}
      <div className="relative">
        <input
          type="text"
          value={findQuery}
          onChange={(e) => setFindQuery(e.target.value)}
          placeholder="Find text in document..."
          className="w-full pl-8 pr-16 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
          autoFocus
        />
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
        {findQuery && (
          <span className="text-[10px] text-slate-400 absolute right-2.5 top-2 font-mono">
            {matchCount} found
          </span>
        )}
      </div>

      {/* Replace Input */}
      <div className="relative">
        <input
          type="text"
          value={replaceQuery}
          onChange={(e) => setReplaceQuery(e.target.value)}
          placeholder="Replace with..."
          className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
        />
        <Replace className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          onClick={onReplaceCurrent}
          disabled={!findQuery.trim() || matchCount === 0}
          className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Replace
        </button>
        <button
          onClick={onReplaceAll}
          disabled={!findQuery.trim() || matchCount === 0}
          className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          Replace All
        </button>
      </div>
    </div>
  );
};
