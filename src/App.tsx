/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import confetti from 'canvas-confetti';
import { Header, WorkspaceTab } from './components/Header';
import { Dropzone } from './components/Dropzone';
import { DecisionHub } from './components/DecisionHub';
import { ConvertWorkspace } from './components/ConvertWorkspace';
import { ExtractWorkspace } from './components/ExtractWorkspace';
import { ToolsWorkspace } from './components/ToolsWorkspace';
import { HistoryTab } from './components/HistoryTab';
import { PdfEditorWorkspace } from './components/editor/PdfEditorWorkspace';
import { ActionTarget } from './components/ActionSelectionGrid';
import { ExportModal } from './components/ExportModal';
import { AiExtractionModal } from './components/AiExtractionModal';
import { SampleVault } from './components/SampleVault';
import { PasswordPromptModal } from './components/PasswordPromptModal';
import { ConversionProgressModal, ConversionStep } from './components/ConversionProgressModal';
import { PdfToolsWorkspaceModal, PdfToolMode } from './components/PdfToolsWorkspaceModal';
import { SeoContentSection } from './components/SeoContentSection';
import { TrafficBoosterBar } from './components/TrafficBoosterBar';

import {
  ExtractionOptions,
  SheetData,
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
  exportToJsonFile
} from './utils/excelExport';
import { downloadWordDocx } from './utils/wordExport';
import { exportPdfToImages } from './utils/imageExport';
import {
  extractDocumentContent,
  exportToTextFile,
  exportToHtmlDocument
} from './utils/textHtmlExport';
import {
  getConversionHistory,
  saveConversionHistoryItem,
  HistoryItem
} from './utils/historyStorage';
import { SAMPLE_DOCUMENTS, SampleDoc } from './utils/samplePdfs';

export default function App() {
  // Navigation & Workspace Routing
  const [activeNavTab, setActiveNavTab] = useState<WorkspaceTab>('home');

  // Shared Active Document Session State
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [rawArrayBuffer, setRawArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [sampleDoc, setSampleDoc] = useState<SampleDoc | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [currentFileSize, setCurrentFileSize] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isScannedDetected, setIsScannedDetected] = useState<boolean>(false);
  const [firstPageThumbnail, setFirstPageThumbnail] = useState<string | undefined>(undefined);

  // Sheets & Table Grid State
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheetId, setActiveSheetId] = useState<string>('');

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
  const [isSampleVaultOpen, setIsSampleVaultOpen] = useState(false);

  const hasActiveDocument = !!(pdfDoc || sampleDoc);

  // Load history on mount
  useEffect(() => {
    refreshHistory();
  }, []);

  const refreshHistory = () => {
    setHistoryItems(getConversionHistory());
  };

  // 1. Process Loaded PDF Document
  const processLoadedPdf = async (
    doc: pdfjsLib.PDFDocumentProxy,
    fileName: string,
    fileSize: number,
    arrayBuffer?: ArrayBuffer
  ) => {
    setIsProcessing(true);
    setPdfDoc(doc);
    if (arrayBuffer) {
      setRawArrayBuffer(arrayBuffer);
    }
    setSampleDoc(null);
    setCurrentFileName(fileName);
    setCurrentFileSize(fileSize);
    setTotalPages(doc.numPages);

    try {
      // 1. Generate fast thumbnail of Page 1
      const thumbCanvas = document.createElement('canvas');
      await renderPdfPageToCanvas(doc, 1, thumbCanvas, 0.4);
      setFirstPageThumbnail(thumbCanvas.toDataURL('image/jpeg', 0.8));

      // 2. Extract tables across document
      const extractedSheets = await extractTablesFromPdf(doc, options);
      setSheets(extractedSheets);
      if (extractedSheets.length > 0) {
        setActiveSheetId(extractedSheets[0].id);
      }

      // 3. Heuristic scan check
      if (extractedSheets.length === 0) {
        const p1 = await doc.getPage(1);
        const textContent = await p1.getTextContent();
        if (textContent.items.length < 5) {
          setIsScannedDetected(true);
        } else {
          setIsScannedDetected(false);
        }
      } else {
        setIsScannedDetected(false);
      }

      // Default land on Home / Decision screen so user decides their workflow
      setActiveNavTab('home');
    } catch (err) {
      console.error('Error extracting PDF tables:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Handle File Selection
  const handleFileSelect = async (files: FileList | File[]) => {
    const file = Array.from(files)[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const buffer = await file.arrayBuffer();
      const loadedDoc = await loadPdfDocument(buffer);
      await processLoadedPdf(loadedDoc, file.name, file.size, buffer);
    } catch (error: any) {
      console.error('PDF Load Error:', error);
      if (error?.name === 'PasswordException' || error?.message?.includes('password')) {
        const buffer = await file.arrayBuffer();
        setPendingPasswordBuffer(buffer);
        setPendingPasswordFileName(file.name);
        setPasswordErrorMessage(undefined);
        setIsPasswordModalOpen(true);
      } else {
        alert('Could not load PDF. Please make sure the file is a valid PDF document.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Handle Password Submission for encrypted PDFs
  const handlePasswordSubmit = async (password: string) => {
    if (!pendingPasswordBuffer) return;
    try {
      const loadedDoc = await loadPdfDocument(pendingPasswordBuffer, password);
      setIsPasswordModalOpen(false);
      await processLoadedPdf(
        loadedDoc,
        pendingPasswordFileName,
        pendingPasswordBuffer.byteLength,
        pendingPasswordBuffer
      );
      setPendingPasswordBuffer(null);
    } catch (err: any) {
      setPasswordErrorMessage('Incorrect password. Please try again.');
    }
  };

  // 4. Handle Sample Selection
  const handleSelectSample = async (sample: SampleDoc) => {
    setIsProcessing(true);
    try {
      setSampleDoc(sample);
      setPdfDoc(null);
      setRawArrayBuffer(null);
      setCurrentFileName(`${sample.title}.pdf`);
      setCurrentFileSize(1024 * 140);
      setTotalPages(sample.pageCount);
      setSheets(sample.sampleSheets);
      if (sample.sampleSheets.length > 0) {
        setActiveSheetId(sample.sampleSheets[0].id);
      }
      setIsScannedDetected(sample.category === 'Scanned Receipts');
      setFirstPageThumbnail(undefined);
      setActiveNavTab('home');
    } catch (err) {
      console.error('Error loading sample:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. Handle Conversion Execution across all formats
  const handleExecuteAction = async (target: ActionTarget, actionOptions?: any) => {
    setIsProgressModalOpen(true);
    setProgressStep('analyzing');
    setProgressPercent(15);
    setProgressMessage(`Analyzing ${currentFileName}...`);
    setConversionError(undefined);
    setLatestDownloadHandler(null);

    const baseCleanName = currentFileName.replace(/\.pdf$/i, '');

    try {
      await new Promise((r) => setTimeout(r, 200));

      if (target === 'excel') {
        setTargetFormatName('Excel Spreadsheet (.xlsx)');
        const outName = `${baseCleanName}.xlsx`;
        setOutputFileName(outName);

        setProgressPercent(50);
        setProgressStep('extracting');
        setProgressMessage('Extracting numerical matrices & column alignments...');
        await new Promise((r) => setTimeout(r, 250));

        setProgressPercent(85);
        setProgressStep('formatting');
        setProgressMessage('Building Excel styles, headers & data types...');

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
          confetti({ particleCount: 50, spread: 70, origin: { y: 0.8 } });
        } catch {}
      } else if (target === 'word') {
        setTargetFormatName('Microsoft Word (.docx)');
        const outName = `${baseCleanName}.docx`;
        setOutputFileName(outName);

        setProgressPercent(45);
        setProgressStep('extracting');
        setProgressMessage('Extracting document paragraphs, headings & tables...');

        let structuredContent: any = null;
        if (pdfDoc) {
          structuredContent = await extractDocumentContent(pdfDoc);
        }

        setProgressPercent(80);
        setProgressStep('formatting');
        setProgressMessage('Building Microsoft Word document structure...');

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
          confetti({ particleCount: 50, spread: 70, origin: { y: 0.8 } });
        } catch {}
      } else if (target === 'csv' || target === 'tsv') {
        setTargetFormatName(target.toUpperCase());
        const ext = target === 'csv' ? 'csv' : 'tsv';
        const outName = `${baseCleanName}.${ext}`;
        setOutputFileName(outName);

        setProgressPercent(60);
        setProgressStep('extracting');
        setProgressMessage(`Exporting table rows to ${ext.toUpperCase()}...`);

        const sheetToExport = sheets.find((s) => s.id === activeSheetId) || consolidateSheets(sheets);
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
        setTargetFormatName('Image Archive');
        const ext = actionOptions?.imageFormat === 'jpeg' ? 'jpg' : 'png';
        const outName = totalPages === 1 ? `${baseCleanName}_page_1.${ext}` : `${baseCleanName}_images.zip`;
        setOutputFileName(outName);

        if (!pdfDoc) {
          throw new Error('Image rendering requires a valid PDF document');
        }

        setProgressPercent(40);
        setProgressStep('extracting');
        setProgressMessage('Rendering PDF pages to high-resolution canvas...');

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
        setTargetFormatName('Plain Text (.txt)');
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
        setTargetFormatName('HTML Web Page (.html)');
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
      } else if (target === 'json') {
        setTargetFormatName('JSON Data (.json)');
        const outName = `${baseCleanName}.json`;
        setOutputFileName(outName);

        let content = null;
        if (pdfDoc) {
          content = await extractDocumentContent(pdfDoc);
        }

        exportToJsonFile(content, sheets, outName);

        saveConversionHistoryItem({
          fileName: currentFileName,
          outputFormat: 'json',
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

  // 6. Open PDF Tools Modal
  const handleOpenPdfTool = (mode: PdfToolMode) => {
    setActivePdfToolMode(mode);
    setIsPdfToolsModalOpen(true);
  };

  // 7. Reset / Switch File
  const handleRemoveFile = () => {
    setPdfDoc(null);
    setRawArrayBuffer(null);
    setSampleDoc(null);
    setCurrentFileName('');
    setCurrentFileSize(0);
    setSheets([]);
    setActiveSheetId('');
    setActiveNavTab('home');
  };

  // Sheet Updates
  const handleUpdateSheet = (updated: SheetData) => {
    setSheets((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleDeleteSheet = (id: string) => {
    const remaining = sheets.filter((s) => s.id !== id);
    setSheets(remaining);
    if (activeSheetId === id && remaining.length > 0) {
      setActiveSheetId(remaining[0].id);
    }
  };

  const handleAddSheet = () => {
    const newSheet: SheetData = {
      id: `custom_${Date.now()}`,
      name: `Sheet ${sheets.length + 1}`,
      headers: ['Column A', 'Column B', 'Column C'],
      rows: [['', '', '']],
      pageNumber: 1,
    };
    setSheets((prev) => [...prev, newSheet]);
    setActiveSheetId(newSheet.id);
  };

  const handleConsolidateAll = () => {
    if (sheets.length === 0) return;
    const consolidated = consolidateSheets(sheets);
    setSheets((prev) => [consolidated, ...prev]);
    setActiveSheetId(consolidated.id);
  };

  const handleExtractRegion = async (region: RegionBounds | null, pageNumber: number = 1) => {
    if (!pdfDoc || !region) return;
    setIsProcessing(true);
    try {
      const newSheets = await extractTablesFromPdf(pdfDoc, [pageNumber], {
        selectedRegion: region,
        firstRowIsHeader: options.firstRowIsHeader,
        trimWhitespace: options.trimWhitespace,
      });

      if (newSheets.length > 0) {
        const customSheet: SheetData = {
          ...newSheets[0],
          name: `Crop P${pageNumber} (${sheets.length + 1})`,
        };
        setSheets((prev) => [customSheet, ...prev]);
        setActiveSheetId(customSheet.id);
      }
    } catch (err) {
      console.error('Failed to extract table region:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-slate-950">
      {/* 1. Header Navigation Bar (Hidden during full-screen Edit mode for maximum workspace) */}
      {!(activeNavTab === 'edit' && hasActiveDocument) && (
        <Header
          hasDocument={hasActiveDocument}
          fileName={currentFileName}
          pageCount={totalPages}
          onExportClick={() => setIsExportModalOpen(true)}
          onOpenNew={handleRemoveFile}
          activeTab={activeNavTab}
          setActiveTab={setActiveNavTab}
          onOpenVault={() => setIsSampleVaultOpen(true)}
        />
      )}

      {/* 2. Main Workspaces Routing Area */}
      <main className="flex-1 flex flex-col min-h-0">
        {/* ========================================================= */}
        {/* WORKSPACE 1: HOME & DECISION SCREEN */}
        {/* ========================================================= */}
        {activeNavTab === 'home' && (
          <div className="flex-1 overflow-y-auto">
            {!hasActiveDocument ? (
              <>
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
              </>
            ) : (
              <DecisionHub
                fileName={currentFileName}
                fileSize={currentFileSize}
                totalPages={totalPages}
                detectedTableCount={sheets.length}
                isScannedDetected={isScannedDetected}
                sheets={sheets}
                thumbnailUrl={firstPageThumbnail}
                onNavigate={(tab) => setActiveNavTab(tab)}
                onRemoveFile={handleRemoveFile}
                onOpenSampleVault={() => setIsSampleVaultOpen(true)}
              />
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* WORKSPACE 2: REAL-TIME PDF EDITOR */}
        {/* ========================================================= */}
        {activeNavTab === 'edit' && (
          <>
            {!hasActiveDocument ? (
              <div className="flex-1 overflow-y-auto">
                <div className="bg-emerald-950/40 border-b border-emerald-500/20 py-3 px-4 text-center">
                  <span className="text-xs font-semibold text-emerald-300">
                    ✏️ Real-Time PDF Editor — Drop any PDF below to start editing text, numbers, tables, and shapes directly in-place.
                  </span>
                </div>
                <Dropzone
                  onFileSelect={handleFileSelect}
                  onSelectSample={handleSelectSample}
                  options={options}
                  setOptions={setOptions}
                  onExploreToolsClick={() => setActiveNavTab('tools')}
                />
              </div>
            ) : (
              <PdfEditorWorkspace
                pdfDoc={pdfDoc}
                rawArrayBuffer={rawArrayBuffer}
                fileName={currentFileName}
                fileSize={currentFileSize}
                totalPages={totalPages}
                initialSheets={sheets}
                onBackToHub={() => setActiveNavTab('home')}
                onExportWord={() => handleExecuteAction('word')}
                onExportExcel={() => handleExecuteAction('excel')}
              />
            )}
          </>
        )}

        {/* ========================================================= */}
        {/* WORKSPACE 3: CONVERT PDF WORKSPACE */}
        {/* ========================================================= */}
        {activeNavTab === 'convert' && (
          <>
            {!hasActiveDocument ? (
              <div className="flex-1 overflow-y-auto">
                <div className="bg-blue-950/40 border-b border-blue-500/20 py-3 px-4 text-center">
                  <span className="text-xs font-semibold text-blue-300">
                    🔄 Convert PDF — Upload any PDF to convert into Excel, Word, CSV, PowerPoint, Images, Text & HTML.
                  </span>
                </div>
                <Dropzone
                  onFileSelect={handleFileSelect}
                  onSelectSample={handleSelectSample}
                  options={options}
                  setOptions={setOptions}
                  onExploreToolsClick={() => setActiveNavTab('tools')}
                />
              </div>
            ) : (
              <ConvertWorkspace
                fileName={currentFileName}
                fileSize={currentFileSize}
                totalPages={totalPages}
                sheets={sheets}
                isScannedDetected={isScannedDetected}
                onExecuteAction={handleExecuteAction}
                onOpenAiOcr={() => setIsAiModalOpen(true)}
                onBackToDecision={() => setActiveNavTab('home')}
                onNavigateToEdit={() => setActiveNavTab('edit')}
                onNavigateToExtract={() => setActiveNavTab('extract')}
              />
            )}
          </>
        )}

        {/* ========================================================= */}
        {/* WORKSPACE 4: EXTRACT TABLES WORKSPACE */}
        {/* ========================================================= */}
        {activeNavTab === 'extract' && (
          <>
            {!hasActiveDocument ? (
              <div className="flex-1 overflow-y-auto">
                <div className="bg-teal-950/40 border-b border-teal-500/20 py-3 px-4 text-center">
                  <span className="text-xs font-semibold text-teal-300">
                    📊 Extract Tables — Drop a PDF invoice, bank statement, or financial report to extract tables into editable spreadsheet format.
                  </span>
                </div>
                <Dropzone
                  onFileSelect={handleFileSelect}
                  onSelectSample={handleSelectSample}
                  options={options}
                  setOptions={setOptions}
                  onExploreToolsClick={() => setActiveNavTab('tools')}
                />
              </div>
            ) : (
              <ExtractWorkspace
                pdfDoc={pdfDoc}
                sampleDoc={sampleDoc}
                fileName={currentFileName}
                totalPages={totalPages}
                sheets={sheets}
                activeSheetId={activeSheetId}
                onSelectSheet={setActiveSheetId}
                onUpdateSheet={handleUpdateSheet}
                onDeleteSheet={handleDeleteSheet}
                onAddSheet={handleAddSheet}
                onConsolidateAll={handleConsolidateAll}
                onOpenAiModal={() => setIsAiModalOpen(true)}
                onExtractRegion={handleExtractRegion}
                onExportExcel={() => handleExecuteAction('excel')}
                onExportCsv={() => handleExecuteAction('csv')}
                onExportJson={() => handleExecuteAction('json')}
                onBackToDecision={() => setActiveNavTab('home')}
                onNavigateToEdit={() => setActiveNavTab('edit')}
                onNavigateToConvert={() => setActiveNavTab('convert')}
                isProcessing={isProcessing}
              />
            )}
          </>
        )}

        {/* ========================================================= */}
        {/* WORKSPACE 5: PDF TOOLS WORKSPACE */}
        {/* ========================================================= */}
        {activeNavTab === 'tools' && (
          <>
            {!hasActiveDocument ? (
              <div className="flex-1 overflow-y-auto">
                <div className="bg-purple-950/40 border-b border-purple-500/20 py-3 px-4 text-center">
                  <span className="text-xs font-semibold text-purple-300">
                    🛠️ PDF Management Tools — Merge, split, compress, rotate, reorder, and protect PDF files.
                  </span>
                </div>
                <Dropzone
                  onFileSelect={handleFileSelect}
                  onSelectSample={handleSelectSample}
                  options={options}
                  setOptions={setOptions}
                  onExploreToolsClick={() => setActiveNavTab('tools')}
                />
              </div>
            ) : (
              <ToolsWorkspace
                fileName={currentFileName}
                fileSize={currentFileSize}
                totalPages={totalPages}
                onOpenPdfTool={handleOpenPdfTool}
                onBackToDecision={() => setActiveNavTab('home')}
                onNavigateToEdit={() => setActiveNavTab('edit')}
                onNavigateToConvert={() => setActiveNavTab('convert')}
              />
            )}
          </>
        )}

        {/* ========================================================= */}
        {/* WORKSPACE 6: HISTORY LOGS */}
        {/* ========================================================= */}
        {activeNavTab === 'history' && (
          <HistoryTab
            history={historyItems}
            onClearHistory={() => {
              localStorage.removeItem('tabula_conversion_history');
              refreshHistory();
            }}
            onRedownload={(item) => {
              if (item.outputFormat === 'xlsx') {
                handleExecuteAction('excel');
              } else if (item.outputFormat === 'docx') {
                handleExecuteAction('word');
              } else if (item.outputFormat === 'csv') {
                handleExecuteAction('csv');
              }
            }}
          />
        )}
      </main>

      {/* ========================================================= */}
      {/* GLOBAL MODALS & UTILITY WORKSPACES */}
      {/* ========================================================= */}

      {/* 1. PDF Page Manipulation Modal (Merge, Split, Compress, Rotate, etc.) */}
      {isPdfToolsModalOpen && (
        <PdfToolsWorkspaceModal
          isOpen={isPdfToolsModalOpen}
          initialMode={activePdfToolMode}
          pdfDoc={pdfDoc}
          rawArrayBuffer={rawArrayBuffer}
          fileName={currentFileName}
          totalPages={totalPages}
          onClose={() => setIsPdfToolsModalOpen(false)}
        />
      )}

      {/* 2. Conversion Progress & Result Modal */}
      <ConversionProgressModal
        isOpen={isProgressModalOpen}
        step={progressStep}
        progressPercent={progressPercent}
        message={progressMessage}
        targetFormat={targetFormatName}
        outputFileName={outputFileName}
        errorMessage={conversionError}
        onClose={() => setIsProgressModalOpen(false)}
        onRedownload={() => {
          if (latestDownloadHandler) {
            latestDownloadHandler();
          }
        }}
      />

      {/* 3. Password Decryption Modal */}
      <PasswordPromptModal
        isOpen={isPasswordModalOpen}
        fileName={pendingPasswordFileName}
        errorMessage={passwordErrorMessage}
        onSubmit={handlePasswordSubmit}
        onCancel={() => {
          setIsPasswordModalOpen(false);
          setPendingPasswordBuffer(null);
        }}
      />

      {/* 4. AI OCR & Intelligent Extraction Modal */}
      {isAiModalOpen && (
        <AiExtractionModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          onApplyExtractedSheet={(newSheet) => {
            setSheets((prev) => [newSheet, ...prev]);
            setActiveSheetId(newSheet.id);
            setActiveNavTab('extract');
          }}
          pdfDoc={pdfDoc}
          currentPage={1}
        />
      )}

      {/* 5. Export Modal */}
      {isExportModalOpen && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          sheets={sheets}
          pdfDoc={pdfDoc}
          currentFileName={currentFileName}
          totalPages={totalPages}
          activeSheetId={activeSheetId}
          onExecuteAction={handleExecuteAction}
        />
      )}

      {/* 6. Sample Vault Modal */}
      {isSampleVaultOpen && (
        <SampleVault
          isOpen={isSampleVaultOpen}
          onClose={() => setIsSampleVaultOpen(false)}
          onSelectSample={(sample) => {
            setIsSampleVaultOpen(false);
            handleSelectSample(sample);
          }}
        />
      )}
    </div>
  );
}
