import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Check,
  AlertCircle,
  Loader2,
  Table,
  CreditCard,
  ReceiptText,
  TrendingUp,
  PackageCheck,
  Wand2,
  HelpCircle,
  FileCheck
} from 'lucide-react';
import { SheetData, TablePreset, TableRow } from '../types';

interface AiExtractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPageNumber: number;
  initialImageBase64?: string;
  onApplyExtraction: (newSheet: SheetData, mode: 'replace' | 'new_sheet') => void;
}

export const AiExtractionModal: React.FC<AiExtractionModalProps> = ({
  isOpen,
  onClose,
  currentPageNumber,
  initialImageBase64,
  onApplyExtraction,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<TablePreset>('general');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedResult, setExtractedResult] = useState<{
    tableName: string;
    headers: string[];
    rows: TableRow[];
    summary?: string;
    confidence?: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleRunAiExtraction = async () => {
    setIsLoading(true);
    setError(null);
    setExtractedResult(null);

    try {
      const payload: any = {
        pageNumber: currentPageNumber,
        preset: selectedPreset,
        customPrompt: customPrompt.trim(),
      };

      if (initialImageBase64) {
        payload.imageBase64 = initialImageBase64;
      }

      const res = await fetch('/api/ai-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'AI Extraction returned an error.');
      }

      setExtractedResult({
        tableName: data.tableName || `Page ${currentPageNumber} (AI Extracted)`,
        headers: data.headers || [],
        rows: data.rows || [],
        summary: data.summary,
        confidence: data.confidence,
      });
    } catch (err: any) {
      console.error('AI Extraction error:', err);
      setError(err.message || 'Failed to extract table. Please ensure image or text is valid.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (mode: 'replace' | 'new_sheet') => {
    if (!extractedResult) return;

    const newSheet: SheetData = {
      id: `sheet-ai-${Date.now()}`,
      name: extractedResult.tableName || `Page ${currentPageNumber} AI`,
      pageNumber: currentPageNumber,
      headers: extractedResult.headers.length > 0 ? extractedResult.headers : ['Column 1'],
      rows: extractedResult.rows,
      extractedAt: Date.now(),
      isAiExtracted: true,
      confidence: extractedResult.confidence,
    };

    onApplyExtraction(newSheet, mode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Gemini Vision AI Document Table Extraction
              </h2>
              <p className="text-[11px] text-slate-400">
                Extract complex, scanned, or multi-level header tables with deep AI vision
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* Preset Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-2">
              Select Document Structure Preset
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { id: 'general', label: 'General Table', icon: Table, desc: 'Auto detect all columns' },
                { id: 'bank_statement', label: 'Bank Statement', icon: CreditCard, desc: 'Ledgers, debits & credits' },
                { id: 'invoice', label: 'Invoice / Receipt', icon: ReceiptText, desc: 'Items, rates, subtotals & tax' },
                { id: 'sales_report', label: 'Sales / Financial', icon: TrendingUp, desc: 'Revenues, margins, dates' },
                { id: 'inventory', label: 'Inventory / SKU', icon: PackageCheck, desc: 'SKU, quantities, locations' },
              ].map((p) => {
                const Icon = p.icon;
                const isSelected = selectedPreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPreset(p.id as TablePreset)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500/60 text-white shadow-sm'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-purple-400' : 'text-slate-500'}`} />
                      <span className="font-bold text-xs">{p.label}</span>
                    </div>
                    <p className="text-[10px] text-slate-500">{p.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Extraction Rules / Prompt */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
              <span>Custom Extraction Instructions (Optional)</span>
              <span className="text-[10px] text-slate-500 font-normal">e.g. &quot;Split full name&quot; or &quot;Omit subtotal rows&quot;</span>
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g. Standardize date format to YYYY-MM-DD, clean negative signs to -XX.XX, separate shipping fee from line items..."
              rows={2}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Action Button */}
          <div>
            <button
              onClick={handleRunAiExtraction}
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-950/50 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-purple-200" />
                  <span>Analyzing Document with Gemini Vision AI...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Extract Table with AI Vision</span>
                </>
              )}
            </button>
          </div>

          {/* Error View */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-800/50 text-red-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-xs">Extraction Failed</p>
                <p className="text-[11px] text-red-400/90 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Extracted Result Preview */}
          {extractedResult && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white text-xs">
                    {extractedResult.tableName || 'Extracted Table'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                    {extractedResult.rows.length} rows × {extractedResult.headers.length} cols
                  </span>
                </div>
                {extractedResult.confidence && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    Accuracy: {Math.round(extractedResult.confidence * 100)}%
                  </span>
                )}
              </div>

              {/* Preview Table */}
              <div className="max-h-48 overflow-auto border border-slate-800 rounded-lg">
                <table className="w-full text-[11px] text-left border-collapse">
                  <thead className="bg-slate-900 text-slate-300 sticky top-0">
                    <tr>
                      {extractedResult.headers.map((h, i) => (
                        <th key={i} className="px-2.5 py-1.5 border-b border-slate-800 font-bold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {extractedResult.rows.slice(0, 5).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-900/50">
                        {extractedResult.headers.map((_, cIdx) => (
                          <td key={cIdx} className="px-2.5 py-1 text-slate-300 truncate max-w-[150px]">
                            {row[cIdx] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {extractedResult.rows.length > 5 && (
                <p className="text-[10px] text-slate-500 text-center">
                  + {extractedResult.rows.length - 5} more rows extracted
                </p>
              )}

              {/* Apply Controls */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => handleApply('new_sheet')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
                >
                  Add as New Worksheet
                </button>
                <button
                  onClick={() => handleApply('replace')}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-950"
                >
                  <Check className="w-3.5 h-3.5" />
                  Replace Active Sheet
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
