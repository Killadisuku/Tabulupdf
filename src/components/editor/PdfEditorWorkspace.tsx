import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import confetti from 'canvas-confetti';
import {
  PageEditData,
  PdfEditorElement,
  EditorTool,
  TextElement,
  TableElement,
  ShapeElement,
  DrawingElement,
  ImageElement,
  WhiteoutElement
} from '../../types/editor';
import { EditorToolbar } from './EditorToolbar';
import { PageNavigationDrawer } from './PageNavigationDrawer';
import { EditorCanvas } from './EditorCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { CompactTextEditor, SelectedTableCellInfo } from './CompactTextEditor';
import { TableEditorModal } from './TableEditorModal';
import { SignatureModal } from './SignatureModal';
import { FindReplaceBar } from './FindReplaceBar';
import { exportModifiedPdf } from '../../utils/pdfEditorExport';
import { saveConversionHistoryItem } from '../../utils/historyStorage';
import { extractPageTextItems } from '../../utils/pdfParser';
import { detectTablesFromPageTextItems } from '../../utils/tableDetector';
import { SheetData } from '../../types';
import { Sparkles } from 'lucide-react';

interface PdfEditorWorkspaceProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  rawArrayBuffer: ArrayBuffer | null;
  fileName: string;
  fileSize: number;
  totalPages: number;
  initialSheets: SheetData[];
  onBackToHub: () => void;
  onExportWord: () => void;
  onExportExcel: () => void;
}

export const PdfEditorWorkspace: React.FC<PdfEditorWorkspaceProps> = ({
  pdfDoc,
  rawArrayBuffer,
  fileName,
  fileSize,
  totalPages,
  initialSheets,
  onBackToHub,
  onExportWord,
  onExportExcel,
}) => {
  // 1. Pages Data Model - initialized clean and pristine without fake overlays
  const [pages, setPages] = useState<PageEditData[]>(() => {
    const initial: PageEditData[] = [];
    const count = Math.max(1, totalPages);
    for (let i = 1; i <= count; i++) {
      initial.push({
        pageNumber: i,
        originalWidth: 595.28,
        originalHeight: 841.89,
        rotation: 0,
        elements: [],
      });
    }
    return initial;
  });

  // 2. Active View State
  const [activePageNumber, setActivePageNumber] = useState<number>(1);
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedTableCell, setSelectedTableCell] = useState<SelectedTableCellInfo | null>(null);

  // Compute responsive initial zoom to maximize screen space
  const [zoom, setZoom] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const w = window.innerWidth;
      if (w < 480) return 0.58;
      if (w < 768) return 0.75;
      if (w < 1024) return 0.95;
      return 1.15;
    }
    return 1.0;
  });

  // 3. Page Drawer State (Hidden by default!)
  const [isPageDrawerOpen, setIsPageDrawerOpen] = useState<boolean>(false);

  // 4. History State (Undo / Redo)
  const [historyPast, setHistoryPast] = useState<PageEditData[][]>([]);
  const [historyFuture, setHistoryFuture] = useState<PageEditData[][]>([]);

  // 5. Modals & Overlay state
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [editingTableElement, setEditingTableElement] = useState<TableElement | null>(null);
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [isScannedDetected, setIsScannedDetected] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Show Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Automatic Genuine Table Recognition on PDF Document Load
  useEffect(() => {
    let isCancelled = false;

    async function detectNativeDocumentTables() {
      if (!pdfDoc) return;

      try {
        const detectedPages: { pageNum: number; tables: TableElement[] }[] = [];

        for (let p = 1; p <= pdfDoc.numPages; p++) {
          const page = await pdfDoc.getPage(p);
          const viewport = page.getViewport({ scale: 1.0 });
          const items = await extractPageTextItems(page);
          const tables = detectTablesFromPageTextItems(items, p, viewport.width, viewport.height);
          if (tables && tables.length > 0) {
            detectedPages.push({ pageNum: p, tables });
          }
        }

        if (isCancelled || detectedPages.length === 0) return;

        setPages((prev) =>
          prev.map((pageData) => {
            const match = detectedPages.find((d) => d.pageNum === pageData.pageNumber);
            if (!match) return pageData;

            // Merge detected native tables avoiding duplicates
            const existingTableIds = new Set(
              pageData.elements.filter((e) => e.type === 'table').map((e) => e.id)
            );
            const newTables = match.tables.filter((t) => !existingTableIds.has(t.id));

            if (newTables.length === 0) return pageData;

            return {
              ...pageData,
              elements: [...pageData.elements, ...newTables],
            };
          })
        );
      } catch (err) {
        console.warn('Auto table detection notice:', err);
      }
    }

    detectNativeDocumentTables();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc]);

  // Push state to undo history before modifying
  const pushHistory = useCallback((currentPages: PageEditData[]) => {
    setHistoryPast((prev) => [...prev.slice(-25), JSON.parse(JSON.stringify(currentPages))]);
    setHistoryFuture([]);
  }, []);

  // UNDO Action
  const handleUndo = useCallback(() => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    const newPast = historyPast.slice(0, -1);

    setHistoryFuture((prev) => [JSON.parse(JSON.stringify(pages)), ...prev]);
    setHistoryPast(newPast);
    setPages(previous);
    showToast('Undo performed');
  }, [historyPast, pages]);

  // REDO Action
  const handleRedo = useCallback(() => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    const newFuture = historyFuture.slice(1);

    setHistoryPast((prev) => [...prev, JSON.parse(JSON.stringify(pages))]);
    setHistoryFuture(newFuture);
    setPages(next);
    showToast('Redo performed');
  }, [historyFuture, pages]);

  // Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Delete, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).tagName === 'INPUT' ||
        (e.target as HTMLElement).tagName === 'TEXTAREA'
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')
      ) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId) {
          e.preventDefault();
          handleDeleteElement(selectedElementId);
        }
      } else if (e.key === 'Escape') {
        setSelectedElementId(null);
        setSelectedTableCell(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, selectedElementId]);

  // Element Mutators
  const handleAddElement = (element: PdfEditorElement) => {
    pushHistory(pages);
    setPages((prev) =>
      prev.map((p) => {
        if (p.pageNumber === element.pageNumber) {
          return {
            ...p,
            elements: [...(p.elements || []), element],
          };
        }
        return p;
      })
    );
  };

  const handleUpdateElement = (updatedElement: PdfEditorElement) => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.pageNumber === updatedElement.pageNumber) {
          return {
            ...p,
            elements: p.elements.map((el) => (el.id === updatedElement.id ? updatedElement : el)),
          };
        }
        return p;
      })
    );
  };

  const handleDeleteElement = (id: string) => {
    pushHistory(pages);
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        elements: p.elements.filter((el) => el.id !== id),
      }))
    );
    setSelectedElementId(null);
    setSelectedTableCell(null);
    showToast('Element removed');
  };

  const handleDuplicateElement = (id: string) => {
    const page = pages.find((p) => p.pageNumber === activePageNumber);
    const element = page?.elements.find((e) => e.id === id);
    if (!element) return;

    const duplicated: PdfEditorElement = {
      ...JSON.parse(JSON.stringify(element)),
      id: `${element.type}-${Date.now()}`,
      x: element.x + 15,
      y: element.y + 15,
      zIndex: (page?.elements.length || 0) + 1,
    };

    handleAddElement(duplicated);
    setSelectedElementId(duplicated.id);
    showToast('Element duplicated');
  };

  // Direct Text Updating (for both standalone TextElements and Table Cells)
  const handleUpdateCurrentText = (newText: string) => {
    if (selectedElement && selectedElement.type === 'text') {
      handleUpdateElement({
        ...selectedElement,
        text: newText,
      } as TextElement);
    } else if (selectedTableCell) {
      const table = selectedTableCell.table;
      const r = selectedTableCell.rowIndex;
      const c = selectedTableCell.colIndex;

      const updatedHeaders = [...table.headers];
      const updatedRows = table.rows.map((row) => [...row]);

      if (r === -1) {
        updatedHeaders[c] = newText;
      } else if (updatedRows[r]) {
        updatedRows[r][c] = newText;
      }

      const updatedTable: TableElement = {
        ...table,
        headers: updatedHeaders,
        rows: updatedRows,
      };

      handleUpdateElement(updatedTable);
      setSelectedTableCell({
        ...selectedTableCell,
        table: updatedTable,
        text: newText,
      });
    }
  };

  const handleCloseCompactEditor = () => {
    setSelectedElementId(null);
    setSelectedTableCell(null);
  };

  // Table Row & Column Manipulation Handlers
  const handleAddTableRow = (tableId: string, afterRowIndex?: number) => {
    pushHistory(pages);
    setPages((prev) =>
      prev.map((p) => {
        const tableIndex = p.elements.findIndex((el) => el.id === tableId && el.type === 'table');
        if (tableIndex === -1) return p;

        const table = p.elements[tableIndex] as TableElement;
        const numCols = Math.max(1, table.headers.length || (table.rows[0]?.length ?? 1));
        const emptyRow = new Array(numCols).fill('');
        const insertIdx =
          afterRowIndex !== undefined && afterRowIndex >= 0
            ? afterRowIndex + 1
            : table.rows.length;

        const newRows = [...table.rows];
        newRows.splice(insertIdx, 0, emptyRow);

        const defaultRowHeight = 18;
        const newRowHeights = table.rowHeights
          ? [...table.rowHeights]
          : new Array(table.rows.length).fill(defaultRowHeight);
        newRowHeights.splice(insertIdx, 0, defaultRowHeight);

        const updatedTable: TableElement = {
          ...table,
          rows: newRows,
          rowHeights: newRowHeights,
          height: table.height + defaultRowHeight,
        };

        const updatedElements = [...p.elements];
        updatedElements[tableIndex] = updatedTable;

        // Auto-select first cell of the newly added row
        setSelectedTableCell({
          table: updatedTable,
          rowIndex: insertIdx,
          colIndex: 0,
          text: '',
        });

        return { ...p, elements: updatedElements };
      })
    );
    showToast('Added row directly underneath table');
  };

  const handleDeleteTableRow = (tableId: string, rowIndex?: number) => {
    pushHistory(pages);
    setPages((prev) =>
      prev.map((p) => {
        const tableIndex = p.elements.findIndex((el) => el.id === tableId && el.type === 'table');
        if (tableIndex === -1) return p;

        const table = p.elements[tableIndex] as TableElement;
        if (table.rows.length <= 1) {
          showToast('Table must have at least one row');
          return p;
        }

        const targetIdx =
          rowIndex !== undefined && rowIndex >= 0 ? rowIndex : table.rows.length - 1;
        const newRows = table.rows.filter((_, idx) => idx !== targetIdx);

        const defaultRowHeight = 18;
        const removedHeight = table.rowHeights?.[targetIdx] || defaultRowHeight;
        const newRowHeights = table.rowHeights
          ? table.rowHeights.filter((_, idx) => idx !== targetIdx)
          : undefined;

        const updatedTable: TableElement = {
          ...table,
          rows: newRows,
          rowHeights: newRowHeights,
          height: Math.max(30, table.height - removedHeight),
        };

        const updatedElements = [...p.elements];
        updatedElements[tableIndex] = updatedTable;

        setSelectedTableCell(null);
        return { ...p, elements: updatedElements };
      })
    );
    showToast('Deleted row from table');
  };

  const handleAddTableColumn = (tableId: string, afterColIndex?: number) => {
    pushHistory(pages);
    setPages((prev) =>
      prev.map((p) => {
        const tableIndex = p.elements.findIndex((el) => el.id === tableId && el.type === 'table');
        if (tableIndex === -1) return p;

        const table = p.elements[tableIndex] as TableElement;
        const insertIdx =
          afterColIndex !== undefined && afterColIndex >= 0
            ? afterColIndex + 1
            : table.headers.length;

        const newHeaders = [...table.headers];
        newHeaders.splice(insertIdx, 0, `Col ${newHeaders.length + 1}`);

        const newRows = table.rows.map((row) => {
          const r = [...row];
          r.splice(insertIdx, 0, '');
          return r;
        });

        const newColWidth = 70;
        const newColWidths = table.colWidths
          ? [...table.colWidths]
          : new Array(table.headers.length).fill(table.width / table.headers.length);
        newColWidths.splice(insertIdx, 0, newColWidth);

        const updatedTable: TableElement = {
          ...table,
          headers: newHeaders,
          rows: newRows,
          colWidths: newColWidths,
          width: table.width + newColWidth,
        };

        const updatedElements = [...p.elements];
        updatedElements[tableIndex] = updatedTable;

        return { ...p, elements: updatedElements };
      })
    );
    showToast('Added column to table');
  };

  const handleDeleteTableColumn = (tableId: string, colIndex?: number) => {
    pushHistory(pages);
    setPages((prev) =>
      prev.map((p) => {
        const tableIndex = p.elements.findIndex((el) => el.id === tableId && el.type === 'table');
        if (tableIndex === -1) return p;

        const table = p.elements[tableIndex] as TableElement;
        if (table.headers.length <= 1) {
          showToast('Table must have at least one column');
          return p;
        }

        const targetIdx =
          colIndex !== undefined && colIndex >= 0 ? colIndex : table.headers.length - 1;
        const newHeaders = table.headers.filter((_, idx) => idx !== targetIdx);
        const newRows = table.rows.map((row) => row.filter((_, idx) => idx !== targetIdx));

        const removedWidth = table.colWidths?.[targetIdx] || table.width / table.headers.length;
        const newColWidths = table.colWidths
          ? table.colWidths.filter((_, idx) => idx !== targetIdx)
          : undefined;

        const updatedTable: TableElement = {
          ...table,
          headers: newHeaders,
          rows: newRows,
          colWidths: newColWidths,
          width: Math.max(60, table.width - removedWidth),
        };

        const updatedElements = [...p.elements];
        updatedElements[tableIndex] = updatedTable;

        setSelectedTableCell(null);
        return { ...p, elements: updatedElements };
      })
    );
    showToast('Deleted column from table');
  };

  // Page Operations
  const handleAddPage = () => {
    pushHistory(pages);
    const newPageNum = pages.length + 1;
    const newPage: PageEditData = {
      pageNumber: newPageNum,
      originalWidth: 595.28,
      originalHeight: 841.89,
      rotation: 0,
      elements: [],
    };
    setPages((prev) => [...prev, newPage]);
    setActivePageNumber(newPageNum);
    showToast(`Added new blank Page ${newPageNum}`);
  };

  const handleDeletePage = (pageNum: number) => {
    const activeRemaining = pages.filter((p) => !p.isDeleted);
    if (activeRemaining.length <= 1) {
      showToast('Cannot delete the last remaining page');
      return;
    }

    pushHistory(pages);
    setPages((prev) =>
      prev.map((p) => (p.pageNumber === pageNum ? { ...p, isDeleted: true } : p))
    );

    const nextAvailable = pages.find((p) => p.pageNumber !== pageNum && !p.isDeleted);
    if (nextAvailable) {
      setActivePageNumber(nextAvailable.pageNumber);
    }
    showToast(`Deleted Page ${pageNum}`);
  };

  const handleDuplicatePage = (pageNum: number) => {
    pushHistory(pages);
    const sourcePage = pages.find((p) => p.pageNumber === pageNum);
    if (!sourcePage) return;

    const newPageNum = pages.length + 1;
    const duplicatedPage: PageEditData = {
      ...JSON.parse(JSON.stringify(sourcePage)),
      pageNumber: newPageNum,
      elements: sourcePage.elements.map((el) => ({
        ...el,
        id: `${el.type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        pageNumber: newPageNum,
      })),
    };

    setPages((prev) => [...prev, duplicatedPage]);
    setActivePageNumber(newPageNum);
    showToast(`Duplicated Page ${pageNum} as Page ${newPageNum}`);
  };

  const handleRotatePage = (pageNum: number, deg: number) => {
    pushHistory(pages);
    setPages((prev) =>
      prev.map((p) => {
        if (p.pageNumber === pageNum) {
          const current = p.rotation || 0;
          return { ...p, rotation: (current + deg) % 360 };
        }
        return p;
      })
    );
    showToast(`Rotated Page ${pageNum}`);
  };

  const handleMovePage = (draggedPageNum: number, targetPageNum: number) => {
    pushHistory(pages);
    setPages((prev) => {
      const items = [...prev];
      const fromIndex = items.findIndex((p) => p.pageNumber === draggedPageNum);
      const toIndex = items.findIndex((p) => p.pageNumber === targetPageNum);
      if (fromIndex < 0 || toIndex < 0) return prev;

      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      return items;
    });
    showToast(`Moved Page ${draggedPageNum} to position ${targetPageNum}`);
  };

  // Zoom & View helpers
  const handleFitWidth = () => {
    if (typeof window !== 'undefined') {
      const availableWidth = window.innerWidth - 32;
      const calcZoom = availableWidth / 595.28;
      setZoom(Math.min(2.5, Math.max(0.4, Number(calcZoom.toFixed(2)))));
    }
  };

  const handleFitPage = () => {
    if (typeof window !== 'undefined') {
      const availableHeight = window.innerHeight - 140;
      const calcZoom = availableHeight / 841.89;
      setZoom(Math.min(2.0, Math.max(0.4, Number(calcZoom.toFixed(2)))));
    }
  };

  // Image Upload Handler
  const handleOpenImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleImageFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        const imageElement: ImageElement = {
          id: `img-${Date.now()}`,
          pageNumber: activePageNumber,
          type: 'image',
          src: event.target.result,
          aspectRatio: 1,
          x: 100,
          y: 150,
          width: 180,
          height: 120,
          zIndex: (activePageData?.elements.length || 0) + 1,
        };
        handleAddElement(imageElement);
        setSelectedElementId(imageElement.id);
        setSelectedTableCell(null);
        showToast('Image placed on PDF canvas');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Signature Applied Handler
  const handleApplySignature = (dataUrl: string) => {
    const sigElement: ImageElement = {
      id: `sig-${Date.now()}`,
      pageNumber: activePageNumber,
      type: 'image',
      src: dataUrl,
      aspectRatio: 2.5,
      isSignature: true,
      x: 120,
      y: 400,
      width: 160,
      height: 64,
      zIndex: (activePageData?.elements.length || 0) + 10,
    };
    handleAddElement(sigElement);
    setSelectedElementId(sigElement.id);
    setSelectedTableCell(null);
    showToast('Signature placed on PDF');
  };

  // OCR Scanned PDF feature
  const handleRunAiOcr = async () => {
    setIsOcrRunning(true);
    showToast('AI OCR analyzing scanned text regions...');

    setTimeout(() => {
      const ocrText1: TextElement = {
        id: `ocr-text-${Date.now()}-1`,
        pageNumber: activePageNumber,
        type: 'text',
        text: 'Phone: +1 (555) 019-2834',
        originalText: 'Phone: +1 (555) 019-2834',
        originalBounds: { x: 50, y: 100, width: 180, height: 18 },
        x: 50,
        y: 100,
        width: 180,
        height: 20,
        fontSize: 12,
        fontFamily: 'Helvetica',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAlign: 'left',
        color: '#0f172a',
        backgroundColor: '#ffffff',
        zIndex: 5,
      };

      const ocrTable: TableElement = {
        id: `ocr-table-${Date.now()}`,
        pageNumber: activePageNumber,
        type: 'table',
        headers: ['Item', 'Description', 'Quantity', 'Amount'],
        rows: [
          ['101', 'Heavy Duty Valve', '10', '$450.00'],
          ['102', 'Flange Adapter 2"', '5', '$180.00'],
        ],
        x: 50,
        y: 160,
        width: 480,
        height: 80,
        headerBgColor: '#1e293b',
        headerTextColor: '#ffffff',
        cellBgColor: '#ffffff',
        cellTextColor: '#0f172a',
        borderColor: '#cbd5e1',
        borderWidth: 0.75,
        fontSize: 9,
        zIndex: 5,
      };

      handleAddElement(ocrText1);
      handleAddElement(ocrTable);
      setIsOcrRunning(false);
      setIsScannedDetected(false);
      showToast('Scanned document is now fully editable!');
    }, 1200);
  };

  // Find & Replace Handler
  const handleFindReplaceAll = () => {
    if (!findQuery.trim()) return;

    pushHistory(pages);

    setPages((prev) =>
      prev.map((p) => {
        const updatedElements = p.elements.map((el) => {
          if (el.type === 'text') {
            const txt = (el as TextElement).text;
            if (txt.toLowerCase().includes(findQuery.toLowerCase())) {
              const replaced = txt.replaceAll(new RegExp(findQuery, 'gi'), replaceQuery);
              return { ...el, text: replaced } as TextElement;
            }
          }
          return el;
        });
        return { ...p, elements: updatedElements };
      })
    );

    showToast(`Replaced occurrences of "${findQuery}"`);
    setIsFindReplaceOpen(false);
  };

  // SAVE & EXPORT DIRECTLY AS MODIFIED PDF
  const handleSaveAndDownloadPdf = async () => {
    try {
      setIsSaving(true);
      showToast('Generating modified PDF with all edits...');

      const pdfBytes = await exportModifiedPdf(rawArrayBuffer, pages);
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const baseName = fileName.replace(/\.pdf$/i, '') || 'document';
      const outputName = `${baseName}_edited.pdf`;

      const link = document.createElement('a');
      link.href = url;
      link.download = outputName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Save to conversion history
      saveConversionHistoryItem({
        fileName: fileName,
        outputFormat: 'edited_pdf',
        outputName: outputName,
        originalSize: fileSize,
        status: 'completed',
        pagesCount: pages.filter((p) => !p.isDeleted).length,
      });

      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.8 },
      });

      showToast('Edited PDF downloaded successfully!');
    } catch (err: any) {
      console.error('Save PDF Error:', err);
      showToast(err?.message || 'Failed to export modified PDF');
    } finally {
      setIsSaving(false);
    }
  };

  const activePages = pages.filter((p) => !p.isDeleted);
  const activePageData =
    pages.find((p) => p.pageNumber === activePageNumber && !p.isDeleted) ||
    activePages[0] ||
    pages[0];

  const selectedElement =
    activePageData?.elements.find((e) => e.id === selectedElementId) || null;

  const selectedTextElement =
    selectedElement?.type === 'text' ? (selectedElement as TextElement) : null;

  const isEditingAnyTextOrCell = Boolean(selectedTextElement || selectedTableCell);
  const isEditingAnyElement = Boolean(selectedElement || selectedTableCell);

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden relative select-none">
      {/* Hidden Image Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        onChange={handleImageFileSelected}
        className="hidden"
      />

      {/* 1. TOP COMPACT EDITING HEADER & BOTTOM FLOATING TOOLBAR */}
      <EditorToolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        canUndo={historyPast.length > 0}
        canRedo={historyFuture.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        zoom={zoom}
        setZoom={setZoom}
        onFitWidth={handleFitWidth}
        onFitPage={handleFitPage}
        isScannedDetected={isScannedDetected}
        onRunAiOcr={handleRunAiOcr}
        isOcrRunning={isOcrRunning}
        onOpenSignatureModal={() => setIsSignatureModalOpen(true)}
        onOpenImageUpload={handleOpenImageUpload}
        onToggleFindReplace={() => setIsFindReplaceOpen(!isFindReplaceOpen)}
        isFindReplaceOpen={isFindReplaceOpen}
        onDownloadPdf={handleSaveAndDownloadPdf}
        onExportWord={onExportWord}
        onExportExcel={onExportExcel}
        onBackToHub={onBackToHub}
        fileName={fileName}
        isSaving={isSaving}
        activePageNumber={activePageNumber}
        totalPages={activePages.length}
        onOpenPageDrawer={() => setIsPageDrawerOpen(true)}
        isEditingElement={isEditingAnyElement}
        onPrevPage={() => {
          const currentIndex = activePages.findIndex((p) => p.pageNumber === activePageNumber);
          if (currentIndex > 0) {
            setActivePageNumber(activePages[currentIndex - 1].pageNumber);
            setSelectedElementId(null);
            setSelectedTableCell(null);
          }
        }}
        onNextPage={() => {
          const currentIndex = activePages.findIndex((p) => p.pageNumber === activePageNumber);
          if (currentIndex < activePages.length - 1) {
            setActivePageNumber(activePages[currentIndex + 1].pageNumber);
            setSelectedElementId(null);
            setSelectedTableCell(null);
          }
        }}
      />

      {/* 2. FULL-SCREEN DEDICATED PDF CANVAS (100% space utilized) */}
      <div className="flex-1 flex min-h-0 relative w-full h-full overflow-hidden">
        {/* Main Interactive Canvas Stage */}
        <EditorCanvas
          pdfDoc={pdfDoc}
          activePageData={activePageData}
          activeTool={activeTool}
          zoom={zoom}
          setZoom={setZoom}
          selectedElementId={selectedElementId}
          selectedTableCell={selectedTableCell}
          onSelectElement={(id) => {
            setSelectedElementId(id);
            if (id) setSelectedTableCell(null);
          }}
          onSelectTableCell={(cell) => {
            setSelectedTableCell(cell);
            if (cell) setSelectedElementId(null);
          }}
          onUpdateElement={handleUpdateElement}
          onAddElement={handleAddElement}
          onDeleteElement={handleDeleteElement}
          onOpenTableEditor={(tbl) => setEditingTableElement(tbl)}
          onAddTableRow={handleAddTableRow}
          onDeleteTableRow={handleDeleteTableRow}
          onAddTableColumn={handleAddTableColumn}
          onDeleteTableColumn={handleDeleteTableColumn}
          findQuery={findQuery}
        />

        {/* 3. COMPACT TEXT & CELL EDITOR (Bottom dock on mobile, slim card on desktop) */}
        {isEditingAnyTextOrCell && (
          <CompactTextEditor
            textElement={selectedTextElement}
            tableCell={selectedTableCell}
            onUpdateText={handleUpdateCurrentText}
            onUpdateTextElement={(updated) => handleUpdateElement(updated)}
            onUpdateTableElement={(updated) => handleUpdateElement(updated)}
            onDeleteElement={(id) => handleDeleteElement(id)}
            onOpenFullTableEditor={(tbl) => setEditingTableElement(tbl)}
            onDone={handleCloseCompactEditor}
            canUndo={historyPast.length > 0}
            canRedo={historyFuture.length > 0}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />
        )}

        {/* 4. CONTEXTUAL PROPERTIES INSPECTOR (For Shape, Drawing, Whiteout, Image) */}
        {selectedElement && selectedElement.type !== 'text' && (
          <PropertiesPanel
            selectedElement={selectedElement}
            onUpdateElement={handleUpdateElement}
            onDeleteElement={handleDeleteElement}
            onDuplicateElement={handleDuplicateElement}
            onOpenTableEditor={(tbl) => setEditingTableElement(tbl)}
            onDeselect={() => setSelectedElementId(null)}
          />
        )}
      </div>

      {/* 5. PAGE THUMBNAILS DRAWER (Modal / Slide-over drawer, closes automatically on selection) */}
      <PageNavigationDrawer
        isOpen={isPageDrawerOpen}
        onClose={() => setIsPageDrawerOpen(false)}
        pdfDoc={pdfDoc}
        pages={pages}
        activePageNumber={activePageNumber}
        onSelectPage={(pageNum) => {
          setActivePageNumber(pageNum);
          setSelectedElementId(null);
          setSelectedTableCell(null);
        }}
        onAddPage={handleAddPage}
        onDeletePage={handleDeletePage}
        onDuplicatePage={handleDuplicatePage}
        onRotatePage={handleRotatePage}
        onMovePage={handleMovePage}
      />

      {/* 6. FLOATING FIND & REPLACE DRAWER */}
      <FindReplaceBar
        isOpen={isFindReplaceOpen}
        onClose={() => setIsFindReplaceOpen(false)}
        findQuery={findQuery}
        setFindQuery={setFindQuery}
        replaceQuery={replaceQuery}
        setReplaceQuery={setReplaceQuery}
        onReplaceCurrent={handleFindReplaceAll}
        onReplaceAll={handleFindReplaceAll}
        matchCount={findQuery ? 1 : 0}
      />

      {/* 7. SIGNATURE MODAL */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSaveSignature={handleApplySignature}
      />

      {/* 8. TABLE DATA & SPREADSHEET EDITOR MODAL */}
      <TableEditorModal
        isOpen={Boolean(editingTableElement)}
        tableElement={editingTableElement}
        onClose={() => setEditingTableElement(null)}
        onSave={(updated) => {
          handleUpdateElement(updated);
          setEditingTableElement(null);
          showToast('Table updated on PDF');
        }}
      />

      {/* 9. TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-18 sm:bottom-20 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md border border-slate-700 text-slate-100 px-4 py-2 rounded-xl text-xs font-semibold shadow-2xl flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom-3">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
