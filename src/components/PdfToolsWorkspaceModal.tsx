import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  Layers,
  Scissors,
  RotateCw,
  Minimize2,
  Trash2,
  ArrowUpDown,
  Download,
  X,
  Plus,
  Check,
  Sparkles,
  AlertCircle,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  extractPdfPages,
  rotatePdfPages,
  reorderAndDeletePdfPages,
  compressPdf,
  downloadPdfBlob,
  mergePdfFiles,
  parsePageRangeString
} from '../utils/pdfTools';

export type PdfToolMode = 'split' | 'rotate' | 'reorder_delete' | 'compress' | 'merge';

interface PdfToolsWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode: PdfToolMode;
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  rawArrayBuffer: ArrayBuffer | null;
  fileName: string;
}

export const PdfToolsWorkspaceModal: React.FC<PdfToolsWorkspaceModalProps> = ({
  isOpen,
  onClose,
  initialMode,
  pdfDoc,
  rawArrayBuffer,
  fileName,
}) => {
  const [activeTool, setActiveTool] = useState<PdfToolMode>(initialMode);
  const [isWorking, setIsWorking] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [pageThumbnails, setPageThumbnails] = useState<string[]>([]);
  
  // Split State
  const [splitRange, setSplitRange] = useState('1');
  
  // Rotate State
  const [globalRotation, setGlobalRotation] = useState<number>(90);
  const [pageRotations, setPageRotations] = useState<{ [pageIdx: number]: number }>({});
  
  // Reorder & Delete State
  const [pageOrder, setPageOrder] = useState<number[]>([]);
  
  // Compress State
  const [compressionResult, setCompressionResult] = useState<{
    originalSize: number;
    newSize: number;
    savedPercentage: number;
    data: Uint8Array;
  } | null>(null);

  // Merge State
  const [mergeFiles, setMergeFiles] = useState<{ name: string; buffer: ArrayBuffer }[]>([]);

  useEffect(() => {
    setActiveTool(initialMode);
  }, [initialMode]);

  // Generate page thumbnails
  useEffect(() => {
    if (!isOpen || !pdfDoc) return;

    let isCancelled = false;
    const totalPages = pdfDoc.numPages;
    setPageOrder(Array.from({ length: totalPages }, (_, i) => i));

    const loadThumbnails = async () => {
      const thumbs: string[] = [];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      for (let i = 1; i <= totalPages; i++) {
        if (isCancelled) return;
        try {
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: 0.3 });
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            await page.render({ canvasContext: ctx, viewport }).promise;
            thumbs.push(canvas.toDataURL('image/jpeg', 0.8));
          }
        } catch (e) {
          thumbs.push('');
        }
      }

      if (!isCancelled) {
        setPageThumbnails(thumbs);
      }
    };

    loadThumbnails();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, pdfDoc]);

  if (!isOpen) return null;

  const totalPages = pdfDoc?.numPages || 1;
  const cleanBaseName = fileName.replace(/\.pdf$/i, '');

  // 1. Handle Split
  const handleExecuteSplit = async () => {
    if (!rawArrayBuffer) return;
    setIsWorking(true);
    setStatusMessage('Extracting selected pages...');

    try {
      const targetIndices = parsePageRangeString(splitRange, totalPages);
      if (targetIndices.length === 0) {
        alert('Please specify a valid page range (e.g. 1-3, 5)');
        return;
      }

      const newPdfBytes = await extractPdfPages(rawArrayBuffer, targetIndices);
      downloadPdfBlob(newPdfBytes, `${cleanBaseName}_pages_${splitRange.replace(/[^0-9-]/g, '_')}.pdf`);
      onClose();
    } catch (err: any) {
      alert(`Split failed: ${err?.message || 'Error extracting pages'}`);
    } finally {
      setIsWorking(false);
      setStatusMessage('');
    }
  };

  // 2. Handle Rotate
  const handleExecuteRotate = async () => {
    if (!rawArrayBuffer) return;
    setIsWorking(true);
    setStatusMessage('Rotating pages...');

    try {
      const newPdfBytes = await rotatePdfPages(rawArrayBuffer, globalRotation);
      downloadPdfBlob(newPdfBytes, `${cleanBaseName}_rotated.pdf`);
      onClose();
    } catch (err: any) {
      alert(`Rotation failed: ${err?.message || 'Error rotating pages'}`);
    } finally {
      setIsWorking(false);
      setStatusMessage('');
    }
  };

  // 3. Handle Reorder & Delete
  const handleMovePage = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= pageOrder.length) return;
    const newOrder = [...pageOrder];
    const item = newOrder.splice(fromIdx, 1)[0];
    newOrder.splice(toIdx, 0, item);
    setPageOrder(newOrder);
  };

  const handleDeletePage = (pageIndexToDelete: number) => {
    if (pageOrder.length <= 1) {
      alert('Cannot delete all pages. At least one page must remain.');
      return;
    }
    setPageOrder(pageOrder.filter((idx) => idx !== pageIndexToDelete));
  };

  const handleExecuteReorder = async () => {
    if (!rawArrayBuffer) return;
    setIsWorking(true);
    setStatusMessage('Rebuilding document...');

    try {
      const newPdfBytes = await reorderAndDeletePdfPages(rawArrayBuffer, pageOrder);
      downloadPdfBlob(newPdfBytes, `${cleanBaseName}_reordered.pdf`);
      onClose();
    } catch (err: any) {
      alert(`Reorder failed: ${err?.message || 'Error updating pages'}`);
    } finally {
      setIsWorking(false);
      setStatusMessage('');
    }
  };

  // 4. Handle Compress
  const handleExecuteCompress = async () => {
    if (!rawArrayBuffer) return;
    setIsWorking(true);
    setStatusMessage('Optimizing and compressing PDF streams...');

    try {
      const result = await compressPdf(rawArrayBuffer);
      setCompressionResult(result);
    } catch (err: any) {
      alert(`Compression failed: ${err?.message || 'Error compressing PDF'}`);
    } finally {
      setIsWorking(false);
      setStatusMessage('');
    }
  };

  // 5. Handle Merge
  const handleAddMergeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newEntries: { name: string; buffer: ArrayBuffer }[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          const buffer = await file.arrayBuffer();
          newEntries.push({ name: file.name, buffer });
        }
      }
      setMergeFiles((prev) => [...prev, ...newEntries]);
    }
  };

  const handleExecuteMerge = async () => {
    const allFilesToMerge: { name: string; buffer: ArrayBuffer }[] = [];
    if (rawArrayBuffer) {
      allFilesToMerge.push({ name: fileName, buffer: rawArrayBuffer });
    }
    allFilesToMerge.push(...mergeFiles);

    if (allFilesToMerge.length < 2) {
      alert('Please add at least 2 PDF files to merge.');
      return;
    }

    setIsWorking(true);
    setStatusMessage('Merging PDF documents...');

    try {
      const mergedBytes = await mergePdfFiles(allFilesToMerge);
      downloadPdfBlob(mergedBytes, `Merged_${cleanBaseName}.pdf`);
      onClose();
    } catch (err: any) {
      alert(`Merge failed: ${err?.message || 'Error merging documents'}`);
    } finally {
      setIsWorking(false);
      setStatusMessage('');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl relative text-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">PDF Management Tools</h3>
              <p className="text-xs text-slate-400 font-mono truncate max-w-md">{fileName} ({totalPages} pages)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tool Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 py-2 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTool('split')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTool === 'split'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            Split / Extract Pages
          </button>

          <button
            onClick={() => setActiveTool('rotate')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTool === 'rotate'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            Rotate Pages
          </button>

          <button
            onClick={() => setActiveTool('reorder_delete')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTool === 'reorder_delete'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            Reorder & Delete
          </button>

          <button
            onClick={() => setActiveTool('compress')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTool === 'compress'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Minimize2 className="w-3.5 h-3.5" />
            Compress PDF
          </button>

          <button
            onClick={() => setActiveTool('merge')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTool === 'merge'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Merge PDFs
          </button>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 1. SPLIT TOOL */}
          {activeTool === 'split' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Extract Specific Pages</h4>
                <p className="text-xs text-slate-400">
                  Select which pages to extract into a brand new PDF document.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <label className="block text-xs font-semibold text-slate-300">
                  Page Range (e.g. "1-3, 5, 8-10")
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={splitRange}
                    onChange={(e) => setSplitRange(e.target.value)}
                    placeholder={`1-${totalPages}`}
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => setSplitRange(`1-${totalPages}`)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700"
                  >
                    All Pages
                  </button>
                </div>
              </div>

              {/* Page Thumbnails Preview */}
              <div>
                <span className="text-xs font-semibold text-slate-400 mb-2 block">
                  Click to select pages:
                </span>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 max-h-56 overflow-y-auto p-2 bg-slate-950/60 rounded-2xl border border-slate-800">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => {
                    const isIncluded = parsePageRangeString(splitRange, totalPages).includes(pNum - 1);
                    return (
                      <div
                        key={pNum}
                        onClick={() => {
                          const current = parsePageRangeString(splitRange, totalPages);
                          let next: number[] = [];
                          if (current.includes(pNum - 1)) {
                            next = current.filter((x) => x !== pNum - 1);
                          } else {
                            next = [...current, pNum - 1].sort((a, b) => a - b);
                          }
                          setSplitRange(next.map((x) => x + 1).join(', ') || '1');
                        }}
                        className={`p-2 rounded-xl border text-center cursor-pointer transition-all ${
                          isIncluded
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30'
                            : 'bg-slate-900 border-slate-800 text-slate-400 opacity-60 hover:opacity-100'
                        }`}
                      >
                        {pageThumbnails[pNum - 1] ? (
                          <img
                            src={pageThumbnails[pNum - 1]}
                            alt={`Page ${pNum}`}
                            className="w-full h-16 object-cover rounded mb-1 bg-white"
                          />
                        ) : (
                          <div className="w-full h-16 bg-slate-800 rounded mb-1 flex items-center justify-center text-[10px]">
                            P.{pNum}
                          </div>
                        )}
                        <span className="text-[10px] font-bold">Page {pNum}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 2. ROTATE TOOL */}
          {activeTool === 'rotate' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Rotate PDF Pages</h4>
                <p className="text-xs text-slate-400">
                  Rotate all pages clockwise by 90°, 180°, or 270° degrees.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[90, 180, 270].map((deg) => (
                  <button
                    key={deg}
                    onClick={() => setGlobalRotation(deg)}
                    className={`p-4 rounded-2xl border text-center transition-all ${
                      globalRotation === deg
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <RotateCw
                      className="w-6 h-6 mx-auto mb-2 text-emerald-400"
                      style={{ transform: `rotate(${deg}deg)` }}
                    />
                    <div className="text-sm font-bold">{deg}° Clockwise</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. REORDER & DELETE TOOL */}
          {activeTool === 'reorder_delete' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white mb-0.5">Reorder & Delete Pages</h4>
                  <p className="text-xs text-slate-400">
                    Use left/right arrows to rearrange pages or click the trash icon to remove.
                  </p>
                </div>
                <button
                  onClick={() => setPageOrder(Array.from({ length: totalPages }, (_, i) => i))}
                  className="text-xs text-slate-400 hover:text-slate-200 underline"
                >
                  Reset Order
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-72 overflow-y-auto p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                {pageOrder.map((pageIdx, orderPos) => (
                  <div
                    key={pageIdx}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 relative group text-center"
                  >
                    <button
                      onClick={() => handleDeletePage(pageIdx)}
                      className="absolute top-1.5 right-1.5 p-1 rounded bg-rose-500/80 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete Page"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>

                    {pageThumbnails[pageIdx] ? (
                      <img
                        src={pageThumbnails[pageIdx]}
                        alt={`Page ${pageIdx + 1}`}
                        className="w-full h-20 object-cover rounded mb-1.5 bg-white"
                      />
                    ) : (
                      <div className="w-full h-20 bg-slate-800 rounded mb-1.5 flex items-center justify-center text-xs">
                        Page {pageIdx + 1}
                      </div>
                    )}

                    <div className="text-[11px] font-bold text-slate-200 mb-1.5">
                      Page {pageIdx + 1}
                    </div>

                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleMovePage(orderPos, orderPos - 1)}
                        disabled={orderPos === 0}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
                        title="Move Left"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      <span className="text-[10px] text-slate-500 font-mono">#{orderPos + 1}</span>
                      <button
                        onClick={() => handleMovePage(orderPos, orderPos + 1)}
                        disabled={orderPos === pageOrder.length - 1}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
                        title="Move Right"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. COMPRESS TOOL */}
          {activeTool === 'compress' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Compress & Optimize PDF</h4>
                <p className="text-xs text-slate-400">
                  Reduce PDF file size by rebuilding object streams and cleaning redundant structures.
                </p>
              </div>

              {!compressionResult ? (
                <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                  <Minimize2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                  <h5 className="text-sm font-bold text-white mb-1">Ready to Compress</h5>
                  <p className="text-xs text-slate-400 mb-4">
                    Current file size: <span className="font-semibold text-slate-200">{formatBytes(rawArrayBuffer?.byteLength || 0)}</span>
                  </p>
                  <button
                    onClick={handleExecuteCompress}
                    disabled={isWorking}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    Analyze & Compress
                  </button>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-4">
                  <Sparkles className="w-8 h-8 text-emerald-400 mx-auto" />
                  <h5 className="text-base font-bold text-white">Compression Complete!</h5>
                  <div className="grid grid-cols-3 gap-3 text-left bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div>
                      <div className="text-[10px] text-slate-400">Original</div>
                      <div className="text-xs font-bold text-slate-200">{formatBytes(compressionResult.originalSize)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Compressed</div>
                      <div className="text-xs font-bold text-emerald-400">{formatBytes(compressionResult.newSize)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Savings</div>
                      <div className="text-xs font-bold text-emerald-300">-{compressionResult.savedPercentage}%</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      downloadPdfBlob(compressionResult.data, `${cleanBaseName}_compressed.pdf`);
                      onClose();
                    }}
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Download Compressed PDF
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 5. MERGE TOOL */}
          {activeTool === 'merge' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Merge Multiple PDFs</h4>
                <p className="text-xs text-slate-400">
                  Combine this PDF with other documents into a single master PDF.
                </p>
              </div>

              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-white">{fileName} (Primary)</span>
                  </div>
                  <span className="text-slate-500 font-mono">{totalPages} pages</span>
                </div>

                {mergeFiles.map((f, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-400" />
                      <span className="font-semibold text-slate-200">{f.name}</span>
                    </div>
                    <button
                      onClick={() => setMergeFiles(mergeFiles.filter((_, idx) => idx !== i))}
                      className="text-rose-400 hover:text-rose-300 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <label className="flex-1 py-3 px-4 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500 bg-slate-950/60 text-center cursor-pointer transition-colors block">
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    multiple
                    onChange={handleAddMergeFile}
                    className="hidden"
                  />
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-300">
                    <Plus className="w-4 h-4 text-emerald-400" />
                    Add More PDFs to Merge
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="text-xs text-slate-400 font-mono">
            {statusMessage && (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {statusMessage}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>

            {activeTool === 'split' && (
              <button
                onClick={handleExecuteSplit}
                disabled={isWorking}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download Split PDF
              </button>
            )}

            {activeTool === 'rotate' && (
              <button
                onClick={handleExecuteRotate}
                disabled={isWorking}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download Rotated PDF
              </button>
            )}

            {activeTool === 'reorder_delete' && (
              <button
                onClick={handleExecuteReorder}
                disabled={isWorking}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download Reordered PDF
              </button>
            )}

            {activeTool === 'merge' && (
              <button
                onClick={handleExecuteMerge}
                disabled={isWorking || mergeFiles.length === 0}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download Merged PDF
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
