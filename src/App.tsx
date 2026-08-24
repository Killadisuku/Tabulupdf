/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import confetti from 'canvas-confetti';
import { Header } from './components/Header';
import { Dropzone } from './components/Dropzone';
import { ActionSelectionGrid, ActionTarget } from './components/ActionSelectionGrid';
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
import { SeoContentSection } from './components/SeoContentSection';
import { TrafficBoosterBar } from './components/TrafficBoosterBar';
import { PasswordPromptModal } from './components/PasswordPromptModal';
import { ConversionProgressModal, ConversionStep } from './components/ConversionProgressModal';
import { PdfToolsWorkspaceModal, PdfToolMode } from './components/PdfToolsWorkspaceModal';
import { HistoryTab } from './components/HistoryTab';
import { AllToolsDirectory } from './components/AllToolsDirectory';

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
  RegionBounds,
  renderPdfPageToCanvas
} from './utils/pdfParser';
import {
  exportToExcel,
  exportToCsvFile,
  exportToJsonFile,
  exportToHtmlTable
} from './utils/excelExport';
import { downloadWordDocx } from './utils/wordExport';
import { exportPdfToImages } from './utils/imageExport';
import {
  extractDocumentContent,
  exportToTextFile,
  exportToHtmlDocument,
  exportToXmlFile
} from './utils/textHtmlExport';
import {
  getConversionHistory,
  saveConversionHistoryItem,
  HistoryItem
} from './utils/historyStorage';
import { SAMPLE_DOCUMENTS, SampleDoc } from './utils/samplePdfs';
import {
  Loader2,
  FileText,
  Table as TableIcon,
  Columns,
  Sparkles,
  ArrowLeft,
  Eye,
  Sliders,
  Download
} from 'lucide-react';

export default function App() {
  // Navigation & View Mode
  const [activeNavTab, setActiveNavTab] = useState<'converter' | 'tools' | 'batch' | 'history'>('converter');
  const [workspaceMode, setWorkspaceMode] = useState<'hub' | 'editor'>('hub');
  const [mobilePane, setMobilePane] = useState<'pdf' | 'spreadsheet'>('spreadsheet');

  // Active Document State
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [rawArrayBuffer, setRawArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [sampleDoc, setSampleDoc] = useState<SampleDoc | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [currentFileSize, setCurrentFileSize] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isScannedDetected, setIsScannedDetected] = useState<boolean>(false);
  const [firstPageThumbnail, setFirstPageThumbnail] = useState<string | undefined>(undefined);

  // Sheets & Table Grid State
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheetId, setActiveSheetId] = useState<string>('');

  // Batch Processing State
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);

  // History State
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

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

  // Progress & Result Modal State
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [progressStep, setProgressStep] = useState<ConversionStep>('analyzing');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [targetFormatName, setTargetFormatName] = useState<string>('XLSX');
  const [outputFileName, setOutputFileName] = useState<string>('');
  const [conversionError, setConversionError] = useState<string | undefined>(undefined);
  const [latestDownloadHandler, setLatestDownloadHandler] = useState<(() => void) | null>(null);

  // Password Decryption Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [pendingPasswordBuffer, setPendingPasswordBuffer] = useState<ArrayBuffer | null>(null);
  const [pendingPasswordFileName, setPendingPasswordFileName] = useState<string>('');
  const [passwordErrorMessage, setPasswordErrorMessage] = useState<string | undefined>(undefined);

  // PDF Manipulation Tools Modal
  const [isPdfToolsModalOpen, setIsPdfToolsModalOpen] = useState(false);
  const [activePdfToolMode, setActivePdfToolMode] = useState<PdfToolMode>('split');

  // Secondary Modals
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiInitialImage, setAiInitialImage] = useState<string | undefined>(undefined);
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [isSplitMergeOpen, setIsSplitMergeOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Load history on mount
  useEffect(() => {
    setHistoryItems(getConversionHistory());
  }, []);

  const refreshHistory = () => {
    setHistoryItems(getConversionHistory());
  };

  const hasActiveDocument = Boolean(pdfDoc || sampleDoc);
  const currentSheet = sheets.find((s) => s.id === activeSheetId) || sheets[0];

  // Helper: Detect if PDF is predominantly scanned (few text characters)
  const inspectScannedPdf = async (doc: pdfjsLib.PDFDocumentProxy): Promise<boolean> => {
    try {
      const checkPages = Math.min(doc.numPages, 3);
      let totalChars = 0;
      for (let i = 1; i <= checkPages; i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        totalChars += textContent.items.reduce((acc, it: any) => acc + (it.str || '').length, 0);
      }
      return totalChars < 80; // If less than ~80 characters across pages, likely image/scanned
    } catch {
      return false;
    }
  };

  // Helper: Generate fast thumbnail for page 1
  const generatePageThumbnail = async (doc: pdfjsLib.PDFDocumentProxy): Promise<string> => {
    try {
      const page = await doc.getPage(1);
      const canvas = document.createElement('canvas');
      const viewport = page.getViewport({ scale: 0.35 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';
      await page.render({ canvasContext: ctx, viewport } as any).promise;
      return canvas.toDataURL('image/jpeg', 0.85);
    } catch {
      return '';
    }
  };

  // 1. File Selection / Drop Handler
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
      setActiveNavTab('batch');
      return;
    }

    // Single File -> Process
    const file = fileArray[0];
    setCurrentFileName(file.name);
    setCurrentFileSize(file.size);
    setSampleDoc(null);
    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      setRawArrayBuffer(buffer);
      await loadPdfIntoState(buffer, file.name, file.size);
    } catch (err: any) {
      console.error('PDF Load Error:', err);
      if (err?.name === 'PasswordException' || err?.message?.toLowerCase().includes('password')) {
        // Trigger password modal
        const buffer = await file.arrayBuffer();
        setPendingPasswordBuffer(buffer);
        setPendingPasswordFileName(file.name);
        setPasswordErrorMessage(undefined);
        setIsPasswordModalOpen(true);
      } else {
        alert('Could not read PDF. The file may be damaged or in an unsupported format.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Load PDF Buffer into State
  const loadPdfIntoState = async (buffer: ArrayBuffer, fileName: string, fileSize: number, password?: string) => {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      password: password,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
      cMapPacked: true,
    });

    const doc = await loadingTask.promise;
    setPdfDoc(doc);
    setTotalPages(doc.numPages);
    setCurrentPage(1);

    // Check if scanned
    const isScanned = await inspectScannedPdf(doc);
    setIsScannedDetected(isScanned);

    // Generate thumbnail
    const thumb = await generatePageThumbnail(doc);
    setFirstPageThumbnail(thumb);

    // Extract initial tables across pages
    const pageNumbers = Array.from({ length: doc.numPages }, (_, i) => i + 1);
    const extractedSheets = await extractTablesFromPdf(doc, pageNumbers, {
      firstRowIsHeader: options.firstRowIsHeader,
      trimWhitespace: options.trimWhitespace,
    });

    setSheets(extractedSheets);
    if (extractedSheets.length > 0) {
      setActiveSheetId(extractedSheets[0].id);
    }
    setWorkspaceMode('hub');
    setActiveNavTab('converter');
  };

  // 2. Password Submission Handler
  const handlePasswordSubmit = async (password: string) => {
    if (!pendingPasswordBuffer) return;
    try {
      await loadPdfIntoState(
        pendingPasswordBuffer,
        pendingPasswordFileName,
        pendingPasswordBuffer.byteLength,
        password
      );
      setIsPasswordModalOpen(false);
      setPendingPasswordBuffer(null);
    } catch (err: any) {
      setPasswordErrorMessage('Incorrect password. Please try again.');
    }
  };

  // 3. Select Demo Sample
  const handleSelectSample = (sample: SampleDoc) => {
    setSampleDoc(sample);
    setPdfDoc(null);
    setRawArrayBuffer(null);
    setCurrentFileName(`${sample.title}.pdf`);
    setCurrentFileSize(245000);
    setTotalPages(sample.pageCount);
    setCurrentPage(1);
    setIsScannedDetected(false);
    setFirstPageThumbnail(undefined);
    setSheets(sample.sampleSheets);
    if (sample.sampleSheets.length > 0) {
      setActiveSheetId(sample.sampleSheets[0].id);
    }
    setWorkspaceMode('hub');
    setActiveNavTab('converter');
  };

  // 4. Primary Conversion Flow Execution
  const handleExecuteAction = async (target: ActionTarget, actionOptions: any = {}) => {
    if (!hasActiveDocument) return;

    const baseCleanName = currentFileName.replace(/\.pdf$/i, '') || 'Converted_Document';
    setIsProgressModalOpen(true);
    setProgressPercent(15);
    setProgressStep('analyzing');
    setProgressMessage('Analyzing PDF document structure...');
    setConversionError(undefined);

    try {
      await new Promise((r) => setTimeout(r, 250));

      if (target === 'excel') {
        setTargetFormatName('Excel');
        const outName = `${baseCleanName}.xlsx`;
        setOutputFileName(outName);

        setProgressPercent(45);
        setProgressStep('extracting');
        setProgressMessage('Detecting table matrices & numerical coordinates...');
        await new Promise((r) => setTimeout(r, 300));

        setProgressPercent(80);
        setProgressStep('formatting');
        setProgressMessage('Formatting Excel headers, data types & column widths...');

        let sheetsToExport = sheets;
        if (actionOptions?.excelScope === 'consolidated') {
          sheetsToExport = [consolidateSheets(sheets)];
        }

        const downloadFn = () => {
          exportToExcel(sheetsToExport, outName, {
            autoFitWidths: true,
            detectTypes: options.detectDataTypes,
          });
        };

        downloadFn();
        setLatestDownloadHandler(() => downloadFn);

        saveConversionHistoryItem({
          fileName: currentFileName,
          outputFormat: 'xlsx',
          outputName: outName,
          originalSize: currentFileSize,
          status: 'completed',
          pagesCount: totalPages,
          tableCount: sheets.length,
        });
        refreshHistory();

        setProgressPercent(100);
        setProgressStep('done');
        try {
          confetti({ particleCount: 60, spread: 70, origin: { y: 0.8 } });
        } catch {}
      } else if (target === 'word') {
        setTargetFormatName('Word (.docx)');
        const outName = `${baseCleanName}.docx`;
        setOutputFileName(outName);

        setProgressPercent(50);
        setProgressStep('extracting');
        setProgressMessage('Extracting document paragraphs, headings & tables...');

        let structuredContent: any = null;
        if (pdfDoc) {
          structuredContent = await extractDocumentContent(pdfDoc);
        }

        setProgressPercent(85);
        setProgressStep('formatting');
        setProgressMessage('Building Microsoft Word document hierarchy...');

        const downloadFn = async () => {
          await downloadWordDocx(outName, {
            title: baseCleanName,
            sheets: sheets,
            rawText: structuredContent?.pages?.map((p: any) => p.text).join('\n\n'),
          });
        };

        await downloadFn();
        setLatestDownloadHandler(() => downloadFn);

        saveConversionHistoryItem({
          fileName: currentFileName,
          outputFormat: 'docx',
          outputName: outName,
          originalSize: currentFileSize,
          status: 'completed',
          pagesCount: totalPages,
        });
        refreshHistory();

        setProgressPercent(100);
        setProgressStep('done');
        try {
          confetti({ particleCount: 60, spread: 70, origin: { y: 0.8 } });
        } catch {}
      } else if (target === 'csv' || target === 'tsv') {
        setTargetFormatName(target.toUpperCase());
        const ext = target === 'csv' ? 'csv' : 'tsv';
        const outName = `${baseCleanName}.${ext}`;
        setOutputFileName(outName);

        setProgressPercent(60);
        setProgressStep('extracting');
        setProgressMessage(`Exporting table rows to ${ext.toUpperCase()}...`);

        const sheetToExport = currentSheet || consolidateSheets(sheets);
        const delim = actionOptions?.csvDelimiter || (target === 'tsv' ? '\t' : ',');

        const downloadFn = () => {
          exportToCsvFile(sheetToExport, outName, delim);
        };

        downloadFn();
        setLatestDownloadHandler(() => downloadFn);

        saveConversionHistoryItem({
          fileName: currentFileName,
          outputFormat: 'csv',
          outputName: outName,
          originalSize: currentFileSize,
          status: 'completed',
          pagesCount: totalPages,
          tableCount: 1,
        });
        refreshHistory();

        setProgressPercent(100);
        setProgressStep('done');
      } else if (target === 'images') {
        setTargetFormatName('Images');
        const ext = actionOptions?.imageFormat === 'jpeg' ? 'jpg' : 'png';
        const outName = totalPages === 1 ? `${baseCleanName}_page_1.${ext}` : `${baseCleanName}_images.zip`;
        setOutputFileName(outName);

        if (!pdfDoc) {
          throw new Error('Image rendering requires a valid PDF document');
        }

        setProgressPercent(40);
        setProgressStep('extracting');
        setProgressMessage('Rendering PDF pages to high-resolution raster canvas...');

        await exportPdfToImages(pdfDoc, currentFileName, {
          format: actionOptions?.imageFormat || 'png',
          scale: actionOptions?.imageScale || 2,
          quality: actionOptions?.imageQuality || 0.9,
          onProgress: (cur, total) => {
            setProgressPercent(40 + Math.round((cur / total) * 50));
            setProgressMessage(`Rendering page ${cur} of ${total}...`);
          },
        });

        saveConversionHistoryItem({
          fileName: currentFileName,
          outputFormat: 'images',
          outputName: outName,
          originalSize: currentFileSize,
          status: 'completed',
          pagesCount: totalPages,
        });
        refreshHistory();

        setProgressPercent(100);
        setProgressStep('done');
      } else if (target === 'text') {
        setTargetFormatName('Text');
        const outName = `${baseCleanName}.txt`;
        setOutputFileName(outName);

        if (!pdfDoc) throw new Error('Requires active PDF');
        const content = await extractDocumentContent(pdfDoc);

        exportToTextFile(content, outName);

        saveConversionHistoryItem({
          fileName: currentFileName,
          outputFormat: 'txt',
          outputName: outName,
          originalSize: currentFileSize,
          status: 'completed',
          pagesCount: totalPages,
        });
        refreshHistory();

        setProgressPercent(100);
        setProgressStep('done');
      } else if (target === 'html') {
        setTargetFormatName('HTML');
        const outName = `${baseCleanName}.html`;
        setOutputFileName(outName);

        if (!pdfDoc) throw new Error('Requires active PDF');
        const content = await extractDocumentContent(pdfDoc);

        exportToHtmlDocument(content, sheets, outName);

        saveConversionHistoryItem({
          fileName: currentFileName,
          outputFormat: 'html',
          outputName: outName,
          originalSize: currentFileSize,
          status: 'completed',
          pagesCount: totalPages,
        });
        refreshHistory();

        setProgressPercent(100);
        setProgressStep('done');
      }
    } catch (err: any) {
      console.error('Conversion Execution Error:', err);
      setProgressStep('error');
      setConversionError(err?.message || 'Failed to complete conversion.');
    }
  };

  // 5. Open PDF Manipulation Tools Modal
  const handleOpenPdfTool = (mode: PdfToolMode) => {
    setActivePdfToolMode(mode);
    setIsPdfToolsModalOpen(true);
  };

  // 6. Reset & Remove Current File
  const handleRemoveFile = () => {
    setPdfDoc(null);
    setRawArrayBuffer(null);
    setSampleDoc(null);
    setCurrentFileName('');
    setCurrentFileSize(0);
    setSheets([]);
    setActiveSheetId('');
    setWorkspaceMode('hub');
  };

  // 7. Update Sheet in Grid
  const handleUpdateSheet = (updatedSheet: SheetData) => {
    setSheets((prev) => prev.map((s) => (s.id === updatedSheet.id ? updatedSheet : s)));
  };

  const handleDeleteSheet = (sheetId: string) => {
    const remaining = sheets.filter((s) => s.id !== sheetId);
    setSheets(remaining);
    if (activeSheetId === sheetId && remaining.length > 0) {
      setActiveSheetId(remaining[0].id);
    }
  };

  const handleAddSheet = () => {
    const newSheet: SheetData = {
      id: `sheet-${Date.now()}`,
      name: `Table ${sheets.length + 1}`,
      pageNumber: currentPage,
      headers: ['Column 1', 'Column 2', 'Column 3'],
      rows: [['', '', '']],
      extractedAt: Date.now(),
    };
    setSheets((prev) => [...prev, newSheet]);
    setActiveSheetId(newSheet.id);
  };

  const handleConsolidateAll = () => {
    if (sheets.length <= 1) return;
    const consolidated = consolidateSheets(sheets);
    setSheets((prev) => [consolidated, ...prev]);
    setActiveSheetId(consolidated.id);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-slate-950">
      {/* 1. Header Navigation Bar */}
      <Header
        hasDocument={hasActiveDocument}
        fileName={currentFileName}
        pageCount={totalPages}
        onExportClick={() => setIsExportModalOpen(true)}
        onOpenNew={handleRemoveFile}
        activeTab={activeNavTab}
        setActiveTab={setActiveNavTab}
      />

      {/* 2. Main Content Area Scoped by Active Nav Tab */}
      <main className="flex-1 flex flex-col min-h-0">
        {/* TAB 1: CONVERTER WORKSPACE */}
        {activeNavTab === 'converter' && (
          <>
            {!hasActiveDocument ? (
              <div className="flex-1 overflow-y-auto">
                <TrafficBoosterBar />
                <Dropzone
                  onFileSelect={handleFileSelect}
                  onSelectSample={handleSelectSample}
                  options={options}
                  setOptions={setOptions}
                  onExploreToolsClick={() => setActiveNavTab('tools')}
                />
                <SeoContentSection
                  onSelectSample={handleSelectSample}
                  onScrollToTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                />
              </div>
            ) : workspaceMode === 'hub' ? (
              /* "WHAT WOULD YOU LIKE TO DO?" HUB */
              <div className="flex-1 overflow-y-auto">
                <ActionSelectionGrid
                  fileName={currentFileName}
                  fileSize={currentFileSize}
                  totalPages={totalPages}
                  detectedTableCount={sheets.length}
                  isScannedDetected={isScannedDetected}
                  sheets={sheets}
                  options={options}
                  setOptions={setOptions}
                  onExecuteAction={handleExecuteAction}
                  onOpenPdfTool={handleOpenPdfTool}
                  onOpenAiOcr={() => setIsAiModalOpen(true)}
                  onInspectTables={() => setWorkspaceMode('editor')}
                  onRemoveFile={handleRemoveFile}
                  thumbnailUrl={firstPageThumbnail}
                />
              </div>
            ) : (
              /* DUAL-PANE PDF VIEWER + INTERACTIVE SPREADSHEET EDITOR */
              <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
                {/* Top Return to Hub & Controls Header */}
                <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
                  <button
                    onClick={() => setWorkspaceMode('hub')}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Formats</span>
                  </button>

                  {/* Mobile switcher */}
                  <div className="flex md:hidden bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setMobilePane('pdf')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold ${mobilePane === 'pdf' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400'}`}
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => setMobilePane('spreadsheet')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold ${mobilePane === 'spreadsheet' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400'}`}
                    >
                      Spreadsheet
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsExportModalOpen(true)}
                      className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export File</span>
                    </button>
                  </div>
                </div>

                {/* Dual Pane Layout */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                  {/* Left: PDF Document Viewer */}
                  <div
                    className={`w-full md:w-1/2 h-full border-r border-slate-800 bg-slate-950 flex flex-col ${
                      mobilePane === 'pdf' ? 'flex' : 'hidden md:flex'
                    }`}
                  >
                    <PdfViewer
                      pdfDoc={pdfDoc}
                      sampleDoc={sampleDoc}
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={(p) => setCurrentPage(p)}
                      onExtractRegion={() => {}}
                      onOpenAiExtract={() => setIsAiModalOpen(true)}
                      isProcessing={isProcessing}
                    />
                  </div>

                  {/* Right: Spreadsheet Grid and Cleanup Toolbar */}
                  <div
                    className={`w-full md:w-1/2 h-full flex flex-col bg-slate-900 ${
                      mobilePane === 'spreadsheet' ? 'flex' : 'hidden md:flex'
                    }`}
                  >
                    <TableCleanupBar
                      currentSheet={currentSheet}
                      onUpdateSheet={handleUpdateSheet}
                      onOpenFindReplace={() => setIsFindReplaceOpen(true)}
                      onOpenSplitMerge={() => setIsSplitMergeOpen(true)}
                      onConsolidateAll={handleConsolidateAll}
                      isMultiSheet={sheets.length > 1}
                    />

                    <SpreadsheetGrid
                      sheets={sheets}
                      activeSheetId={activeSheetId}
                      onSelectSheet={setActiveSheetId}
                      onUpdateSheet={handleUpdateSheet}
                      onDeleteSheet={handleDeleteSheet}
                      onAddSheet={handleAddSheet}
                      onConsolidateAll={handleConsolidateAll}
                      onOpenAiModal={() => setIsAiModalOpen(true)}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: ALL PDF TOOLS DIRECTORY */}
        {activeNavTab === 'tools' && (
          <div className="flex-1 overflow-y-auto">
            <AllToolsDirectory
              onSelectTool={(toolId) => {
                setActiveNavTab('converter');
                if (hasActiveDocument) {
                  handleExecuteAction(toolId as ActionTarget);
                }
              }}
              onOpenPdfToolModal={(mode) => {
                if (hasActiveDocument) {
                  handleOpenPdfTool(mode);
                } else {
                  setActiveNavTab('converter');
                }
              }}
              hasDocument={hasActiveDocument}
            />
          </div>
        )}

        {/* TAB 3: BATCH CONVERTER */}
        {activeNavTab === 'batch' && (
          <div className="flex-1 overflow-y-auto">
            <BatchConverter
              batchItems={batchItems}
              setBatchItems={setBatchItems}
              options={options}
              onExportSingle={(item) => {
                if (item.sheets) {
                  exportToExcel(item.sheets, `${item.name.replace(/\.pdf$/i, '')}.xlsx`);
                }
              }}
            />
          </div>
        )}

        {/* TAB 4: CONVERSION HISTORY */}
        {activeNavTab === 'history' && (
          <div className="flex-1 overflow-y-auto">
            <HistoryTab
              history={historyItems}
              onRefreshHistory={refreshHistory}
              onUploadNew={() => {
                handleRemoveFile();
                setActiveNavTab('converter');
              }}
            />
          </div>
        )}
      </main>

      {/* 3. MODALS & WORKSPACES */}

      {/* Step Progress & Result Modal */}
      <ConversionProgressModal
        isOpen={isProgressModalOpen}
        onClose={() => setIsProgressModalOpen(false)}
        fileName={currentFileName}
        targetFormat={targetFormatName}
        outputFileName={outputFileName}
        currentStep={progressStep}
        progressPercent={progressPercent}
        stepMessage={progressMessage}
        error={conversionError}
        onDownload={() => {
          if (latestDownloadHandler) latestDownloadHandler();
        }}
        onPreview={() => {
          setIsProgressModalOpen(false);
          setWorkspaceMode('editor');
        }}
        onConvertAnother={() => {
          setIsProgressModalOpen(false);
          handleRemoveFile();
        }}
      />

      {/* Password Prompt Decryption Modal */}
      <PasswordPromptModal
        isOpen={isPasswordModalOpen}
        fileName={pendingPasswordFileName}
        onSubmit={handlePasswordSubmit}
        onCancel={() => {
          setIsPasswordModalOpen(false);
          setPendingPasswordBuffer(null);
        }}
        errorMessage={passwordErrorMessage}
      />

      {/* PDF Tools (Merge, Split, Rotate, Compress, Reorder) Modal */}
      <PdfToolsWorkspaceModal
        isOpen={isPdfToolsModalOpen}
        onClose={() => setIsPdfToolsModalOpen(false)}
        initialMode={activePdfToolMode}
        pdfDoc={pdfDoc}
        rawArrayBuffer={rawArrayBuffer}
        fileName={currentFileName || 'document.pdf'}
      />

      {/* Export Options Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        sheets={sheets}
        activeSheetId={activeSheetId}
        defaultFileName={currentFileName}
      />

      {/* Gemini AI OCR Extraction Modal */}
      <AiExtractionModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onApplyResult={(newSheet) => {
          setSheets((prev) => [...prev, newSheet]);
          setActiveSheetId(newSheet.id);
          setIsAiModalOpen(false);
          setWorkspaceMode('editor');
        }}
        initialImage={aiInitialImage}
        currentPage={currentPage}
      />

      {/* Find & Replace Modal */}
      <FindReplaceModal
        isOpen={isFindReplaceOpen}
        onClose={() => setIsFindReplaceOpen(false)}
        currentSheet={currentSheet}
        onUpdateSheet={handleUpdateSheet}
      />

      {/* Column Split / Merge Modal */}
      <ColumnSplitMergeModal
        isOpen={isSplitMergeOpen}
        onClose={() => setIsSplitMergeOpen(false)}
        currentSheet={currentSheet}
        onUpdateSheet={handleUpdateSheet}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        sheets={sheets}
      />
    </div>
  );
}
