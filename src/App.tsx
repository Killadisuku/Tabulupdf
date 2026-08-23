/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Header } from './components/Header';
import { Dropzone } from './components/Dropzone';
import { PdfViewer } from './components/PdfViewer';
import { SpreadsheetGrid } from './components/SpreadsheetGrid';
import { TableCleanupBar } from './components/TableCleanupBar';
import { ExportModal } from './components/ExportModal';
import { AiExtractionModal } from './components/AiExtractionModal';
import { BatchConverter } from './components/BatchConverter';
import { SampleVault } from './components/SampleVault';
import { FindReplaceModal } from './components/FindReplaceModal';
import { ColumnSplitMergeModal } from './components/ColumnSplitMergeModal';
import { ShareModal } from './components/ShareModal';
import {
  ExtractionOptions,
  SheetData,
  BatchItem,
  TableRow
} from './types';
import {
  loadPdfDocument,
  extractTablesFromPdf,
  consolidateSheets,
  RegionBounds
} from './utils/pdfParser';
import { SampleDoc } from './utils/samplePdfs';
import { Loader2, FileText, Table as TableIcon, Columns, Sparkles } from 'lucide-react';

export default function App() {
  // Navigation & View Mode
  const [activeTab, setActiveTab] = useState<'converter' | 'batch' | 'samples'>('converter');
  const [mobilePane, setMobilePane] = useState<'pdf' | 'spreadsheet'>('spreadsheet');

  // Active Document State
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [sampleDoc, setSampleDoc] = useState<SampleDoc | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Sheets & Table Grid State
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheetId, setActiveSheetId] = useState<string>('');

  // Batch Processing State
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);

  // Extraction Options
  const [options, setOptions] = useState<ExtractionOptions>({
    mode: 'auto',
    selectedPages: 'all',
    customPageRange: '',
    combinePagesToOneSheet: false,
    firstRowIsHeader: true,
    detectDataTypes: true,
    trimWhitespace: true,
    removeEmptyRows: true,
  });

  // Modal States
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiInitialImage, setAiInitialImage] = useState<string | undefined>(undefined);
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [isSplitMergeOpen, setIsSplitMergeOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Active Sheet Helper
  const currentSheet = sheets.find((s) => s.id === activeSheetId) || sheets[0];

  // 1. File Drop / Upload Handler
  const handleFileSelect = async (files: FileList | File[]) => {
    const fileArray = Array.from(files) as File[];
    if (fileArray.length === 0) return;

    if (fileArray.length > 1) {
      // Multiple files -> Add to batch queue
      const newItems: BatchItem[] = fileArray.map((file: File) => ({
        id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        status: 'queued',
        progress: 0,
      }));
      setBatchItems((prev) => [...prev, ...newItems]);
      setActiveTab('batch');
      return;
    }

    // Single File -> Process & load into workbench
    const file = fileArray[0];
    setCurrentFileName(file.name);
    setSampleDoc(null);
    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      const doc = await loadPdfDocument(buffer);
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      setCurrentPage(1);

      // Extract tables across all pages
      const pageNumbers = Array.from({ length: doc.numPages }, (_, i) => i + 1);
      const extractedSheets = await extractTablesFromPdf(doc, pageNumbers, {
        firstRowIsHeader: options.firstRowIsHeader,
        trimWhitespace: options.trimWhitespace,
      });

      setSheets(extractedSheets);
      if (extractedSheets.length > 0) {
        setActiveSheetId(extractedSheets[0].id);
      }
      setActiveTab('converter');
    } catch (err) {
      console.error('Failed to load & parse PDF:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Select Sample Dataset
  const handleSelectSample = (sample: SampleDoc) => {
    setSampleDoc(sample);
    setPdfDoc(null);
    setCurrentFileName(`${sample.title}.pdf`);
    setTotalPages(sample.pageCount);
    setCurrentPage(1);
    setSheets(sample.sampleSheets);
    if (sample.sampleSheets.length > 0) {
      setActiveSheetId(sample.sampleSheets[0].id);
    }
    setActiveTab('converter');
  };

  // 3. Page Change
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // Find matching sheet if exists
    const matchingSheet = sheets.find((s) => s.pageNumber === newPage);
    if (matchingSheet) {
      setActiveSheetId(matchingSheet.id);
    }
  };

  // 4. Region Crop Extraction
  const handleExtractRegion = async (region: RegionBounds | null) => {
    if (!pdfDoc) return;
    setIsProcessing(true);

    try {
      const extracted = await extractTablesFromPdf(pdfDoc, [currentPage], {
        firstRowIsHeader: options.firstRowIsHeader,
        trimWhitespace: options.trimWhitespace,
        selectedRegion: region ? { [currentPage]: region } : undefined,
      });

      if (extracted.length > 0) {
        const newSheet = extracted[0];
        setSheets((prev) =>
          prev.map((s) => (s.pageNumber === currentPage ? { ...newSheet, id: s.id } : s))
        );
      }
    } catch (err) {
      console.error('Error extracting region:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. Open AI Vision Extraction
  const handleOpenAiExtract = (imageBase64?: string) => {
    setAiInitialImage(imageBase64);
    setIsAiModalOpen(true);
  };

  // 6. Apply AI Extraction Result
  const handleApplyAiExtraction = (newSheet: SheetData, mode: 'replace' | 'new_sheet') => {
    if (mode === 'replace' && currentSheet) {
      setSheets((prev) =>
        prev.map((s) => (s.id === currentSheet.id ? { ...newSheet, id: currentSheet.id } : s))
      );
    } else {
      setSheets((prev) => [...prev, newSheet]);
      setActiveSheetId(newSheet.id);
    }
  };

  // 7. Consolidate All Pages
  const handleConsolidateAll = () => {
    if (sheets.length <= 1) return;
    const consolidated = consolidateSheets(sheets);
    setSheets((prev) => [...prev, consolidated]);
    setActiveSheetId(consolidated.id);
  };

  // 8. Sheet Updates
  const handleUpdateSheet = (updated: SheetData) => {
    setSheets((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleDeleteSheet = (id: string) => {
    if (sheets.length <= 1) return;
    const remaining = sheets.filter((s) => s.id !== id);
    setSheets(remaining);
    if (activeSheetId === id && remaining.length > 0) {
      setActiveSheetId(remaining[0].id);
    }
  };

  const handleAddSheet = () => {
    const newSheet: SheetData = {
      id: `custom-sheet-${Date.now()}`,
      name: `Sheet ${sheets.length + 1}`,
      pageNumber: currentPage,
      headers: ['Column 1', 'Column 2', 'Column 3'],
      rows: [['', '', '']],
      extractedAt: Date.now(),
    };
    setSheets((prev) => [...prev, newSheet]);
    setActiveSheetId(newSheet.id);
  };

  // 9. Open item from batch queue into workbench
  const handleOpenBatchItemInWorkbench = (item: BatchItem) => {
    if (!item.sheets || item.sheets.length === 0) return;
    setCurrentFileName(item.name);
    setSheets(item.sheets);
    setActiveSheetId(item.sheets[0].id);
    setTotalPages(item.totalPages || 1);
    setCurrentPage(1);
    setActiveTab('converter');
  };

  // 10. New Document
  const handleNewDocument = () => {
    setPdfDoc(null);
    setSampleDoc(null);
    setSheets([]);
    setActiveSheetId('');
    setCurrentFileName('');
  };

  const hasActiveDocument = (pdfDoc !== null || sampleDoc !== null) && sheets.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sheets={sheets}
        onOpenExport={() => setIsExportModalOpen(true)}
        onNewDocument={handleNewDocument}
        hasDocument={hasActiveDocument}
        onOpenAiModal={() => handleOpenAiExtract()}
        onOpenShare={() => setIsShareModalOpen(true)}
      />

      {/* Processing Banner */}
      {isProcessing && (
        <div className="bg-emerald-950/80 border-b border-emerald-800/60 px-4 py-2 text-xs text-emerald-300 flex items-center justify-center gap-2 animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Parsing PDF tables and structuring spreadsheet columns...</span>
        </div>
      )}

      {/* Main Content Areas */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* TAB 1: CONVERTER WORKBENCH */}
        {activeTab === 'converter' && (
          <>
            {!hasActiveDocument ? (
              <Dropzone
                onFileSelect={handleFileSelect}
                onSelectSample={handleSelectSample}
                options={options}
                setOptions={setOptions}
              />
            ) : (
              <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
                {/* Mobile View Switcher */}
                <div className="md:hidden flex border-b border-slate-800 bg-slate-900 text-xs">
                  <button
                    onClick={() => setMobilePane('pdf')}
                    className={`flex-1 py-2 font-semibold flex items-center justify-center gap-1.5 ${
                      mobilePane === 'pdf'
                        ? 'text-emerald-400 border-b-2 border-emerald-500 bg-slate-850'
                        : 'text-slate-400'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" /> PDF View
                  </button>
                  <button
                    onClick={() => setMobilePane('spreadsheet')}
                    className={`flex-1 py-2 font-semibold flex items-center justify-center gap-1.5 ${
                      mobilePane === 'spreadsheet'
                        ? 'text-emerald-400 border-b-2 border-emerald-500 bg-slate-850'
                        : 'text-slate-400'
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5" /> Excel Table ({sheets.length})
                  </button>
                </div>

                {/* Dual Pane Workbench Layout */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                  {/* Left Pane: PDF Viewer & Region Selector */}
                  <div
                    className={`w-full md:w-5/12 lg:w-4/12 h-full flex flex-col ${
                      mobilePane === 'pdf' ? 'flex' : 'hidden md:flex'
                    }`}
                  >
                    <PdfViewer
                      pdfDoc={pdfDoc}
                      sampleDoc={sampleDoc}
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                      onExtractRegion={handleExtractRegion}
                      onOpenAiExtract={handleOpenAiExtract}
                      isProcessing={isProcessing}
                    />
                  </div>

                  {/* Right Pane: Interactive Spreadsheet Grid & Cleanup Tools */}
                  <div
                    className={`w-full md:w-7/12 lg:w-8/12 h-full flex flex-col ${
                      mobilePane === 'spreadsheet' ? 'flex' : 'hidden md:flex'
                    }`}
                  >
                    <SpreadsheetGrid
                      sheets={sheets}
                      activeSheetId={activeSheetId}
                      onSelectSheet={setActiveSheetId}
                      onUpdateSheet={handleUpdateSheet}
                      onDeleteSheet={handleDeleteSheet}
                      onAddSheet={handleAddSheet}
                      onConsolidateAll={handleConsolidateAll}
                      onOpenAiModal={() => handleOpenAiExtract()}
                    />

                    {currentSheet && (
                      <TableCleanupBar
                        currentSheet={currentSheet}
                        onUpdateSheet={handleUpdateSheet}
                        onOpenFindReplace={() => setIsFindReplaceOpen(true)}
                        onOpenSplitMerge={() => setIsSplitMergeOpen(true)}
                        onOpenAiModal={() => handleOpenAiExtract()}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: BATCH QUEUE */}
        {activeTab === 'batch' && (
          <BatchConverter
            batchItems={batchItems}
            setBatchItems={setBatchItems}
            onOpenItemInWorkbench={handleOpenBatchItemInWorkbench}
          />
        )}

        {/* TAB 3: SAMPLE VAULT */}
        {activeTab === 'samples' && (
          <SampleVault onSelectSample={handleSelectSample} />
        )}
      </main>

      {/* Modals & Dialogs */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        sheets={sheets}
        activeSheetId={activeSheetId}
        defaultFileName={currentFileName}
      />

      <AiExtractionModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        currentPageNumber={currentPage}
        initialImageBase64={aiInitialImage}
        onApplyExtraction={handleApplyAiExtraction}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {currentSheet && (
        <>
          <FindReplaceModal
            isOpen={isFindReplaceOpen}
            onClose={() => setIsFindReplaceOpen(false)}
            currentSheet={currentSheet}
            onUpdateSheet={handleUpdateSheet}
          />

          <ColumnSplitMergeModal
            isOpen={isSplitMergeOpen}
            onClose={() => setIsSplitMergeOpen(false)}
            currentSheet={currentSheet}
            onUpdateSheet={handleUpdateSheet}
          />
        </>
      )}
    </div>
  );
}
