import React, { useState } from 'react';
import {
  FolderUp,
  FileSpreadsheet,
  Download,
  Trash2,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Archive,
  Layers,
  FileText,
  Plus
} from 'lucide-react';
import { BatchItem, SheetData } from '../types';
import { loadPdfDocument, extractTablesFromPdf } from '../utils/pdfParser';
import { exportBatchZip, exportToExcel } from '../utils/excelExport';

interface BatchConverterProps {
  batchItems: BatchItem[];
  setBatchItems: React.Dispatch<React.SetStateAction<BatchItem[]>>;
  onOpenItemInWorkbench: (item: BatchItem) => void;
}

export const BatchConverter: React.FC<BatchConverterProps> = ({
  batchItems,
  setBatchItems,
  onOpenItemInWorkbench,
}) => {
  const [isProcessingAll, setIsProcessingAll] = useState(false);

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files) as File[];
    const newItems: BatchItem[] = files.map((file: File) => ({
      id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      name: file.name,
      size: file.size,
      status: 'queued',
      progress: 0,
    }));
    setBatchItems((prev) => [...prev, ...newItems]);
  };

  const handleRemoveItem = (id: string) => {
    setBatchItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAll = () => {
    setBatchItems([]);
  };

  const processItem = async (item: BatchItem): Promise<BatchItem> => {
    try {
      const buffer = await item.file.arrayBuffer();
      const pdfDoc = await loadPdfDocument(buffer);
      const totalPages = pdfDoc.numPages;

      const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
      const sheets = await extractTablesFromPdf(pdfDoc, pageNumbers, {
        firstRowIsHeader: true,
        trimWhitespace: true,
      });

      return {
        ...item,
        status: 'done',
        progress: 100,
        totalPages,
        sheets,
      };
    } catch (err: any) {
      return {
        ...item,
        status: 'error',
        progress: 0,
        error: err.message || 'Failed to parse PDF',
      };
    }
  };

  const handleProcessAll = async () => {
    setIsProcessingAll(true);

    for (let i = 0; i < batchItems.length; i++) {
      const current = batchItems[i];
      if (current.status === 'done') continue;

      // Update to processing
      setBatchItems((prev) =>
        prev.map((it) => (it.id === current.id ? { ...it, status: 'processing', progress: 30 } : it))
      );

      const processed = await processItem(current);

      setBatchItems((prev) =>
        prev.map((it) => (it.id === current.id ? processed : it))
      );
    }

    setIsProcessingAll(false);
  };

  const handleDownloadZip = async () => {
    const completed = batchItems.filter((it) => it.status === 'done' && it.sheets);
    if (completed.length === 0) return;
    await exportBatchZip(completed, 'TabulaPDF_Batch_Export.zip');
  };

  const handleDownloadCombinedExcel = () => {
    const allSheets: SheetData[] = [];

    batchItems.forEach((item) => {
      if (item.status === 'done' && item.sheets) {
        item.sheets.forEach((sheet, idx) => {
          const prefix = item.name.replace(/\.pdf$/i, '').slice(0, 15);
          allSheets.push({
            ...sheet,
            name: `${prefix}_P${sheet.pageNumber}`,
          });
        });
      }
    });

    if (allSheets.length === 0) return;
    exportToExcel(allSheets, 'Consolidated_Batch_Workbook.xlsx');
  };

  const doneCount = batchItems.filter((it) => it.status === 'done').length;
  const totalExtractedRows = batchItems.reduce(
    (sum, it) => sum + (it.sheets?.reduce((s, sh) => s + sh.rows.length, 0) || 0),
    0
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Batch Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FolderUp className="w-5 h-5 text-emerald-400" />
            Batch PDF Table Converter
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Convert dozens of PDF documents into Excel workbooks simultaneously
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all">
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add More PDFs</span>
            <input
              type="file"
              accept=".pdf,application/pdf"
              multiple
              onChange={handleAddFiles}
              className="hidden"
            />
          </label>

          {batchItems.length > 0 && (
            <button
              onClick={handleProcessAll}
              disabled={isProcessingAll || doneCount === batchItems.length}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isProcessingAll ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Converting Batch...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Convert All ({batchItems.length})</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Batch Queue Card */}
      {batchItems.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 border-dashed">
          <FolderUp className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white mb-1">Your Batch Queue is Empty</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            Upload multiple bank statements, invoices, or annual reports to convert them into Excel files in one click.
          </p>
          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-emerald-950 transition-all">
            <FolderUp className="w-4 h-4" />
            <span>Select PDF Files</span>
            <input
              type="file"
              accept=".pdf,application/pdf"
              multiple
              onChange={handleAddFiles}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {/* Summary Stats bar */}
          <div className="px-6 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <span>
                Total Files: <strong className="text-white">{batchItems.length}</strong>
              </span>
              <span>
                Completed: <strong className="text-emerald-400">{doneCount}</strong> /{' '}
                {batchItems.length}
              </span>
              {totalExtractedRows > 0 && (
                <span>
                  Total Extracted Rows: <strong className="text-white">{totalExtractedRows}</strong>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {doneCount > 0 && (
                <>
                  <button
                    onClick={handleDownloadCombinedExcel}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                    title="Export all into single multi-sheet Excel file"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Combined Excel</span>
                  </button>

                  <button
                    onClick={handleDownloadZip}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                    title="Download ZIP archive with individual Excel files"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Download ZIP ({doneCount})</span>
                  </button>
                </>
              )}

              <button
                onClick={handleClearAll}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-red-400 transition-colors"
                title="Clear all from queue"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Items List */}
          <div className="divide-y divide-slate-800">
            {batchItems.map((item) => {
              const rowCount =
                item.sheets?.reduce((sum, s) => sum + s.rows.length, 0) || 0;

              return (
                <div
                  key={item.id}
                  className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-850/50 transition-colors text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                      <FileText className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-white text-xs truncate">{item.name}</h4>
                      <p className="text-[11px] text-slate-400">
                        {(item.size / (1024 * 1024)).toFixed(2)} MB
                        {item.totalPages ? ` • ${item.totalPages} page(s)` : ''}
                        {rowCount > 0 ? ` • ${rowCount} rows extracted` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Status Badge */}
                    {item.status === 'queued' && (
                      <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-400 font-medium">
                        Queued
                      </span>
                    )}

                    {item.status === 'processing' && (
                      <span className="px-2.5 py-1 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 flex items-center gap-1.5 font-medium">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Extracting...
                      </span>
                    )}

                    {item.status === 'done' && (
                      <span className="px-2.5 py-1 rounded-md bg-emerald-950/60 text-emerald-300 border border-emerald-700/50 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Ready ({item.sheets?.length} sheets)
                      </span>
                    )}

                    {item.status === 'error' && (
                      <span className="px-2.5 py-1 rounded-md bg-red-950/60 text-red-300 border border-red-800/50 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                        Error
                      </span>
                    )}

                    {/* Open in workbench */}
                    {item.status === 'done' && (
                      <button
                        onClick={() => onOpenItemInWorkbench(item)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
                      >
                        Open Editor
                      </button>
                    )}

                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-red-400 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
