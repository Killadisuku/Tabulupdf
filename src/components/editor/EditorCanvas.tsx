import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  PdfEditorElement,
  PageEditData,
  EditorTool,
  TextElement,
  TableElement,
  ShapeElement,
  DrawingElement,
  ImageElement,
  WhiteoutElement,
  DetectedTextItem
} from '../../types/editor';
import { SelectedTableCellInfo } from './CompactTextEditor';
import { Plus, Trash2, Grid, Check, X } from 'lucide-react';

interface EditorCanvasProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  activePageData: PageEditData;
  activeTool: EditorTool;
  zoom: number;
  setZoom?: (z: number | ((prev: number) => number)) => void;
  selectedElementId: string | null;
  selectedTableCell?: SelectedTableCellInfo | null;
  onSelectElement: (id: string | null) => void;
  onSelectTableCell?: (cell: SelectedTableCellInfo | null) => void;
  onUpdateElement: (updated: PdfEditorElement) => void;
  onAddElement: (element: PdfEditorElement) => void;
  onDeleteElement: (id: string) => void;
  onOpenTableEditor: (table: TableElement) => void;
  onAddTableRow?: (tableId: string, afterRowIndex?: number) => void;
  onDeleteTableRow?: (tableId: string, rowIndex?: number) => void;
  onAddTableColumn?: (tableId: string, afterColIndex?: number) => void;
  onDeleteTableColumn?: (tableId: string, colIndex?: number) => void;
  findQuery: string;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  pdfDoc,
  activePageData,
  activeTool,
  zoom,
  setZoom,
  selectedElementId,
  selectedTableCell,
  onSelectElement,
  onSelectTableCell,
  onUpdateElement,
  onAddElement,
  onDeleteElement,
  onOpenTableEditor,
  onAddTableRow,
  onDeleteTableRow,
  onAddTableColumn,
  onDeleteTableColumn,
  findQuery,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportWrapperRef = useRef<HTMLDivElement | null>(null);

  // Original PDF Dimensions in Points (72 DPI)
  const [pageWidthPt, setPageWidthPt] = useState<number>(activePageData.originalWidth || 595.28);
  const [pageHeightPt, setPageHeightPt] = useState<number>(activePageData.originalHeight || 841.89);
  const [detectedTextItems, setDetectedTextItems] = useState<DetectedTextItem[]>([]);
  const [hoveredTextId, setHoveredTextId] = useState<string | null>(null);
  const [hoveredTableId, setHoveredTableId] = useState<string | null>(null);

  // Mouse / Touch interaction State
  const [isInteracting, setIsInteracting] = useState(false);
  const [interactionType, setInteractionType] = useState<
    'move' | 'resize-nw' | 'resize-ne' | 'resize-se' | 'resize-sw' | 'resize-e' | 'resize-w' | 'resize-n' | 'resize-s' | 'draw' | 'create-shape' | null
  >(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [elementInitialState, setElementInitialState] = useState<PdfEditorElement | null>(null);

  // Current Freehand Drawing Stroke points
  const [currentDrawPoints, setCurrentDrawPoints] = useState<{ x: number; y: number }[]>([]);

  // Current Shape Creation Box
  const [creationBox, setCreationBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);

  // Pinch-to-zoom touch state
  const touchDistanceRef = useRef<number | null>(null);

  // 1. Render PDF Page on Canvas & Extract Text Items
  useEffect(() => {
    let isCancelled = false;

    async function renderPage() {
      if (!pdfDoc || activePageData.pageNumber > pdfDoc.numPages) return;
      try {
        const page = await pdfDoc.getPage(activePageData.pageNumber);
        if (isCancelled) return;

        // Viewport scale includes devicePixelRatio for crisp text rendering
        const dpr = window.devicePixelRatio || 1;
        const renderScale = zoom * 1.5 * dpr;
        const viewport = page.getViewport({ scale: renderScale });
        const baseViewport = page.getViewport({ scale: 1.0 });

        setPageWidthPt(baseViewport.width);
        setPageHeightPt(baseViewport.height);

        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${baseViewport.width * zoom}px`;
        canvas.style.height = `${baseViewport.height * zoom}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        await page.render(renderContext).promise;

        // Extract Text items for inline click-to-edit
        const textContent = await page.getTextContent();
        const extracted: DetectedTextItem[] = [];

        textContent.items.forEach((item: any, idx) => {
          if (!item.str || item.str.trim() === '') return;

          // PDF coordinate transformation to Top-Left standard
          const tx = item.transform[4];
          const ty = item.transform[5];
          const fontSize = Math.hypot(item.transform[0], item.transform[1]) || 12;
          const textWidth = item.width || item.str.length * (fontSize * 0.55);
          const textHeight = item.height || fontSize;

          // Convert PDF bottom-left to top-left
          const ptX = tx;
          const ptY = baseViewport.height - ty - fontSize * 0.85;

          extracted.push({
            id: `detected-${activePageData.pageNumber}-${idx}`,
            pageNumber: activePageData.pageNumber,
            text: item.str,
            x: ptX,
            y: ptY,
            width: Math.max(textWidth, 10),
            height: Math.max(textHeight, fontSize),
            fontSize: Math.round(fontSize),
            fontFamily: item.fontName || 'Helvetica',
          });
        });

        if (!isCancelled) {
          setDetectedTextItems(extracted);
        }
      } catch (err: any) {
        if (!err?.message?.includes('cancelled')) {
          console.warn('PDF Page Render Notice:', err);
        }
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, activePageData.pageNumber, zoom, activePageData.rotation]);

  // Helper: Convert Screen Client Coordinates to PDF Points
  const getPdfCoordinates = (clientX: number, clientY: number): { x: number; y: number } => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    const xInPixels = clientX - rect.left;
    const yInPixels = clientY - rect.top;
    return {
      x: xInPixels / zoom,
      y: yInPixels / zoom,
    };
  };

  // Convert Detected Text Item to Editable Text Element on Click
  const handleConvertDetectedTextToEditable = (item: DetectedTextItem) => {
    const newTextElement: TextElement = {
      id: `text-edit-${Date.now()}`,
      pageNumber: activePageData.pageNumber,
      type: 'text',
      text: item.text,
      originalText: item.text,
      originalBounds: {
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
      },
      x: item.x,
      y: item.y,
      width: Math.max(item.width, 60),
      height: Math.max(item.height, item.fontSize * 1.3),
      fontSize: item.fontSize || 12,
      fontFamily: 'Helvetica',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'left',
      color: '#0f172a',
      backgroundColor: '#ffffff', // Covers the original PDF text
      zIndex: (activePageData.elements?.length || 0) + 10,
    };

    onAddElement(newTextElement);
    onSelectElement(newTextElement.id);
    if (onSelectTableCell) onSelectTableCell(null);
  };

  // PRIMARY DOWN HANDLER (Mouse or Single Touch)
  const handlePointerDownCoords = (clientX: number, clientY: number) => {
    const coords = getPdfCoordinates(clientX, clientY);

    // 1. Text Tool: Drop new text box
    if (activeTool === 'text') {
      const newText: TextElement = {
        id: `text-${Date.now()}`,
        pageNumber: activePageData.pageNumber,
        type: 'text',
        text: 'Type text here',
        x: coords.x,
        y: coords.y,
        width: 150,
        height: 28,
        fontSize: 14,
        fontFamily: 'Helvetica',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAlign: 'left',
        color: '#0f172a',
        backgroundColor: '#ffffff',
        zIndex: (activePageData.elements?.length || 0) + 1,
      };
      onAddElement(newText);
      onSelectElement(newText.id);
      if (onSelectTableCell) onSelectTableCell(null);
      return;
    }

    // 2. Table Tool: Drop table grid
    if (activeTool === 'table') {
      const newTable: TableElement = {
        id: `table-${Date.now()}`,
        pageNumber: activePageData.pageNumber,
        type: 'table',
        headers: ['Column 1', 'Column 2', 'Column 3'],
        rows: [
          ['Data 1', 'Data 2', 'Data 3'],
          ['Data 4', 'Data 5', 'Data 6'],
        ],
        x: coords.x,
        y: coords.y,
        width: 320,
        height: 90,
        isNativePdfTable: false,
        headerBgColor: '#1e293b',
        headerTextColor: '#ffffff',
        cellBgColor: '#ffffff',
        cellTextColor: '#0f172a',
        borderColor: '#cbd5e1',
        borderWidth: 1,
        fontSize: 9,
        zIndex: (activePageData.elements?.length || 0) + 1,
      };
      onAddElement(newTable);
      onSelectElement(newTable.id);
      if (onSelectTableCell) onSelectTableCell(null);
      return;
    }

    // 3. Whiteout / Mask Tool
    if (activeTool === 'whiteout') {
      const newWhiteout: WhiteoutElement = {
        id: `whiteout-${Date.now()}`,
        pageNumber: activePageData.pageNumber,
        type: 'whiteout',
        color: '#ffffff',
        x: coords.x,
        y: coords.y,
        width: 120,
        height: 30,
        zIndex: (activePageData.elements?.length || 0) + 1,
      };
      onAddElement(newWhiteout);
      onSelectElement(newWhiteout.id);
      if (onSelectTableCell) onSelectTableCell(null);
      return;
    }

    // 4. Freehand Pen / Highlighter
    if (activeTool === 'draw' || activeTool === 'highlight') {
      setIsInteracting(true);
      setInteractionType('draw');
      setCurrentDrawPoints([coords]);
      return;
    }

    // 5. Shapes & Lines Creation
    if (
      [
        'rectangle',
        'circle',
        'arrow',
        'line',
        'callout',
        'checkbox',
        'checkmark',
        'crossmark',
      ].includes(activeTool)
    ) {
      // Quick one-click drops for icons
      if (['checkbox', 'checkmark', 'crossmark'].includes(activeTool)) {
        const shapeEl: ShapeElement = {
          id: `shape-${Date.now()}`,
          pageNumber: activePageData.pageNumber,
          type: 'shape',
          shapeType: activeTool as any,
          x: coords.x - 12,
          y: coords.y - 12,
          width: 24,
          height: 24,
          strokeColor: '#059669',
          fillColor: '#ecfdf5',
          strokeWidth: 2,
          strokeStyle: 'solid',
          isChecked: true,
          zIndex: (activePageData.elements?.length || 0) + 1,
        };
        onAddElement(shapeEl);
        onSelectElement(shapeEl.id);
        if (onSelectTableCell) onSelectTableCell(null);
        return;
      }

      setIsInteracting(true);
      setInteractionType('create-shape');
      setCreationBox({
        startX: coords.x,
        startY: coords.y,
        currentX: coords.x,
        currentY: coords.y,
      });
      return;
    }

    // Default: Click outside deselects
    if (activeTool === 'select') {
      onSelectElement(null);
      if (onSelectTableCell) onSelectTableCell(null);
    }
  };

  // PRIMARY MOVE HANDLER (Mouse or Single Touch)
  const handlePointerMoveCoords = (clientX: number, clientY: number) => {
    if (!isInteracting) return;
    const coords = getPdfCoordinates(clientX, clientY);

    // Freehand Drawing
    if (interactionType === 'draw') {
      setCurrentDrawPoints((prev) => [...prev, coords]);
      return;
    }

    // Shape Box Creation
    if (interactionType === 'create-shape' && creationBox) {
      setCreationBox((prev) => (prev ? { ...prev, currentX: coords.x, currentY: coords.y } : null));
      return;
    }

    // Moving or Resizing Selected Element
    if (!elementInitialState || !selectedElementId) return;

    const deltaX = coords.x - dragStartPos.x;
    const deltaY = coords.y - dragStartPos.y;

    if (interactionType === 'move') {
      onUpdateElement({
        ...elementInitialState,
        x: Math.max(0, Math.min(pageWidthPt - elementInitialState.width, elementInitialState.x + deltaX)),
        y: Math.max(0, Math.min(pageHeightPt - elementInitialState.height, elementInitialState.y + deltaY)),
      });
    } else if (interactionType?.startsWith('resize-')) {
      const handle = interactionType.replace('resize-', '');
      let newX = elementInitialState.x;
      let newY = elementInitialState.y;
      let newW = elementInitialState.width;
      let newH = elementInitialState.height;

      if (handle.includes('e')) newW = Math.max(20, elementInitialState.width + deltaX);
      if (handle.includes('s')) newH = Math.max(16, elementInitialState.height + deltaY);
      if (handle.includes('w')) {
        const potentialW = elementInitialState.width - deltaX;
        if (potentialW >= 20) {
          newW = potentialW;
          newX = elementInitialState.x + deltaX;
        }
      }
      if (handle.includes('n')) {
        const potentialH = elementInitialState.height - deltaY;
        if (potentialH >= 16) {
          newH = potentialH;
          newY = elementInitialState.y + deltaY;
        }
      }

      onUpdateElement({
        ...elementInitialState,
        x: newX,
        y: newY,
        width: newW,
        height: newH,
      });
    }
  };

  // PRIMARY UP HANDLER (Mouse or Touch)
  const handlePointerUp = () => {
    if (!isInteracting) return;

    // Finish Freehand Drawing
    if (interactionType === 'draw' && currentDrawPoints.length > 1) {
      const isHighlighter = activeTool === 'highlight';
      const drawEl: DrawingElement = {
        id: `draw-${Date.now()}`,
        pageNumber: activePageData.pageNumber,
        type: 'drawing',
        points: currentDrawPoints,
        strokeColor: isHighlighter ? '#facc15' : '#0f172a',
        strokeWidth: isHighlighter ? 14 : 2,
        isHighlighter: isHighlighter,
        opacity: isHighlighter ? 0.4 : 1.0,
        x: 0,
        y: 0,
        width: pageWidthPt,
        height: pageHeightPt,
        zIndex: (activePageData.elements?.length || 0) + 1,
      };
      onAddElement(drawEl);
      setCurrentDrawPoints([]);
    }

    // Finish Shape Creation
    if (interactionType === 'create-shape' && creationBox) {
      const minX = Math.min(creationBox.startX, creationBox.currentX);
      const minY = Math.min(creationBox.startY, creationBox.currentY);
      const width = Math.max(24, Math.abs(creationBox.currentX - creationBox.startX));
      const height = Math.max(18, Math.abs(creationBox.currentY - creationBox.startY));

      const shapeEl: ShapeElement = {
        id: `shape-${Date.now()}`,
        pageNumber: activePageData.pageNumber,
        type: 'shape',
        shapeType: activeTool as any,
        x: minX,
        y: minY,
        width: width,
        height: height,
        strokeColor: '#059669',
        fillColor: activeTool === 'rectangle' ? '#ecfdf5' : 'transparent',
        strokeWidth: 2,
        strokeStyle: 'solid',
        zIndex: (activePageData.elements?.length || 0) + 1,
      };
      onAddElement(shapeEl);
      onSelectElement(shapeEl.id);
      if (onSelectTableCell) onSelectTableCell(null);
      setCreationBox(null);
    }

    setIsInteracting(false);
    setInteractionType(null);
    setElementInitialState(null);
  };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    handlePointerDownCoords(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handlePointerMoveCoords(e.clientX, e.clientY);
  };

  // Touch Handlers (with Pinch-to-zoom support)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && setZoom) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchDistanceRef.current = dist;
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      handlePointerDownCoords(touch.clientX, touch.clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && setZoom && touchDistanceRef.current !== null) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const ratio = dist / touchDistanceRef.current;

      if (Math.abs(ratio - 1) > 0.05) {
        setZoom((prev) => {
          const next = prev * ratio;
          return Math.min(3.0, Math.max(0.4, Number(next.toFixed(2))));
        });
        touchDistanceRef.current = dist;
      }
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      handlePointerMoveCoords(touch.clientX, touch.clientY);
    }
  };

  const handleTouchEnd = () => {
    touchDistanceRef.current = null;
    handlePointerUp();
  };

  // Start dragging an existing element
  const handleStartMoveElement = (e: React.MouseEvent, el: PdfEditorElement) => {
    e.stopPropagation();
    onSelectElement(el.id);
    if (onSelectTableCell) onSelectTableCell(null);
    const coords = getPdfCoordinates(e.clientX, e.clientY);
    setIsInteracting(true);
    setInteractionType('move');
    setDragStartPos(coords);
    setElementInitialState({ ...el });
  };

  // Start resizing an element from a specific handle
  const handleStartResize = (
    e: React.MouseEvent,
    handle: 'nw' | 'ne' | 'se' | 'sw' | 'e' | 'w' | 'n' | 's',
    el: PdfEditorElement
  ) => {
    e.stopPropagation();
    const coords = getPdfCoordinates(e.clientX, e.clientY);
    setIsInteracting(true);
    setInteractionType(`resize-${handle}` as any);
    setDragStartPos(coords);
    setElementInitialState({ ...el });
  };

  // Auto-scroll when element or table cell is selected so it stays visible above the bottom editor and keyboard
  useEffect(() => {
    if (!selectedElementId && !selectedTableCell) return;

    const viewport = viewportWrapperRef.current;
    if (!viewport) return;

    let targetY = 0;
    if (selectedElementId) {
      const el = activePageData.elements?.find((e) => e.id === selectedElementId);
      if (el) targetY = el.y * zoom;
    } else if (selectedTableCell) {
      targetY = selectedTableCell.table.y * zoom;
    }

    // Scroll viewport so target is placed in the upper half
    if (targetY > 0) {
      const targetScroll = Math.max(0, targetY - 120);
      viewport.scrollTo({
        top: targetScroll,
        behavior: 'smooth',
      });
    }
  }, [selectedElementId, selectedTableCell?.table?.id, selectedTableCell?.rowIndex]);

  // Render SVG stroke string for drawings
  const getSvgPathData = (points: { x: number; y: number }[]) => {
    if (!points || points.length === 0) return '';
    return points.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x * zoom} ${pt.y * zoom}` : `${acc} L ${pt.x * zoom} ${pt.y * zoom}`;
    }, '');
  };

  return (
    <div
      ref={viewportWrapperRef}
      className="flex-1 overflow-auto bg-slate-950/90 flex items-center justify-center p-2 sm:p-6 md:p-10 select-none relative w-full h-full min-h-0 pb-36 sm:pb-16"
    >
      {/* PDF Stage Wrapper - Centered, maintains aspect ratio */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative bg-white rounded-xl shadow-2xl transition-shadow cursor-crosshair overflow-visible border border-slate-700/60 my-auto mx-auto shrink-0"
        style={{
          width: `${pageWidthPt * zoom}px`,
          height: `${pageHeightPt * zoom}px`,
          transform: `rotate(${activePageData.rotation || 0}deg)`,
        }}
      >
        {/* LAYER 1: BASE PDF CANVAS */}
        <canvas ref={canvasRef} className="block pointer-events-none rounded-xl" />

        {/* LAYER 2: DETECTED ORIGINAL TEXT HOVER HIGHLIGHTS (Click to edit directly) */}
        {activeTool === 'select' &&
          detectedTextItems.map((item) => {
            const isHovered = hoveredTextId === item.id;
            const isMatch =
              findQuery.trim() !== '' &&
              item.text.toLowerCase().includes(findQuery.toLowerCase());

            return (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredTextId(item.id)}
                onMouseLeave={() => setHoveredTextId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  handleConvertDetectedTextToEditable(item);
                }}
                className={`absolute cursor-text transition-all rounded px-0.5 ${
                  isMatch
                    ? 'bg-amber-400/40 border border-amber-500 shadow-sm animate-pulse'
                    : isHovered
                    ? 'bg-emerald-400/20 border border-emerald-400/80 shadow-sm'
                    : 'hover:border hover:border-emerald-400/60 hover:bg-emerald-400/10'
                }`}
                style={{
                  left: `${item.x * zoom}px`,
                  top: `${item.y * zoom}px`,
                  width: `${item.width * zoom}px`,
                  height: `${item.height * zoom}px`,
                }}
                title="Click to edit text directly"
              />
            );
          })}

        {/* LAYER 3: USER EDITS (TEXT, TABLES, SHAPES, WHITEOUTS, IMAGES) */}
        {activePageData.elements?.map((el) => {
          const isSelected = el.id === selectedElementId;
          const leftPx = el.x * zoom;
          const topPx = el.y * zoom;
          const widthPx = el.width * zoom;
          const heightPx = el.height * zoom;

          return (
            <div
              key={el.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectElement(el.id);
                if (onSelectTableCell) onSelectTableCell(null);
              }}
              onMouseDown={(e) => {
                if (el.type !== 'table') {
                  handleStartMoveElement(e, el);
                }
              }}
              className={`absolute select-none ${
                el.type === 'table' ? 'cursor-default' : 'cursor-move'
              } group ${
                isSelected
                  ? 'ring-2 ring-emerald-500 z-40'
                  : 'hover:ring-1 hover:ring-slate-400/50'
              }`}
              style={{
                left: `${leftPx}px`,
                top: `${topPx}px`,
                width: `${widthPx}px`,
                height: `${heightPx}px`,
                zIndex: el.zIndex || 10,
              }}
            >
              {/* 1. TEXT ELEMENT (Highlighted clearly on PDF) */}
              {el.type === 'text' && (
                <div
                  className={`w-full h-full p-0.5 flex flex-col justify-start transition-all ${
                    isSelected ? 'ring-2 ring-emerald-500 bg-emerald-50/20' : ''
                  }`}
                  style={{
                    backgroundColor: (el as TextElement).backgroundColor || 'transparent',
                    color: (el as TextElement).color || '#000000',
                    fontFamily: (el as TextElement).fontFamily || 'Helvetica',
                    fontSize: `${((el as TextElement).fontSize || 12) * zoom}px`,
                    fontWeight: (el as TextElement).fontWeight || 'normal',
                    fontStyle: (el as TextElement).fontStyle || 'normal',
                    textAlign: (el as TextElement).textAlign || 'left',
                    lineHeight: '1.2',
                  }}
                >
                  <span className="whitespace-pre-wrap select-text break-words w-full h-full block">
                    {(el as TextElement).text}
                  </span>
                </div>
              )}

              {/* 2. TABLE ELEMENT (High-fidelity in-place editing preserving native PDF) */}
              {el.type === 'table' && (() => {
                const table = el as TableElement;
                const isNative = !!table.isNativePdfTable;
                const isTableSelected = isSelected || selectedTableCell?.table?.id === table.id;
                const isTableHovered = hoveredTableId === table.id;

                const numCols = Math.max(1, table.headers?.length || (table.rows[0]?.length ?? 1));
                const colWidths = table.colWidths && table.colWidths.length === numCols
                  ? table.colWidths
                  : new Array(numCols).fill(table.width / numCols);

                const origRowCount = table.originalRows?.length ?? table.rows.length;

                return (
                  <div
                    onMouseEnter={() => setHoveredTableId(table.id)}
                    onMouseLeave={() => setHoveredTableId(null)}
                    className={`w-full h-full relative transition-all rounded-xs ${
                      isNative
                        ? isTableSelected
                          ? 'ring-1.5 ring-emerald-500/80 bg-emerald-500/5'
                          : isTableHovered
                          ? 'ring-1 ring-emerald-400/40 bg-emerald-500/5'
                          : 'bg-transparent'
                        : 'bg-white border shadow-sm'
                    }`}
                    style={
                      !isNative
                        ? {
                            borderColor: table.borderColor || '#cbd5e1',
                            borderWidth: `${(table.borderWidth || 1) * zoom}px`,
                          }
                        : undefined
                    }
                  >
                    {/* CONTEXTUAL TABLE ACTION BAR (Shown when table or any cell is active) */}
                    {isTableSelected && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute -top-9 left-0 z-50 flex items-center gap-1 bg-slate-900/95 text-slate-200 border border-slate-700/80 rounded-lg p-1 shadow-xl text-[11px] font-medium backdrop-blur-xs whitespace-nowrap animate-in fade-in"
                      >
                        {onAddTableRow && (
                          <button
                            onClick={() => onAddTableRow(table.id, selectedTableCell?.rowIndex)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-800 text-emerald-400 font-semibold cursor-pointer transition-colors"
                            title="Insert a new row underneath"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Row</span>
                          </button>
                        )}
                        {onDeleteTableRow && (
                          <button
                            onClick={() =>
                              onDeleteTableRow(
                                table.id,
                                selectedTableCell && selectedTableCell.rowIndex >= 0
                                  ? selectedTableCell.rowIndex
                                  : table.rows.length - 1
                              )
                            }
                            disabled={table.rows.length <= 1}
                            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-800 text-rose-400 disabled:opacity-40 cursor-pointer transition-colors"
                            title="Delete selected row"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete Row</span>
                          </button>
                        )}
                        <div className="w-px h-3.5 bg-slate-700 mx-0.5" />
                        {onAddTableColumn && (
                          <button
                            onClick={() => onAddTableColumn(table.id, selectedTableCell?.colIndex)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-800 text-slate-300 cursor-pointer transition-colors"
                            title="Insert a new column"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Col</span>
                          </button>
                        )}
                        <button
                          onClick={() => onOpenTableEditor(table)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-800 text-emerald-400 cursor-pointer transition-colors"
                          title="Open full spreadsheet grid"
                        >
                          <Grid className="w-3 h-3" />
                          <span>Grid</span>
                        </button>
                        <button
                          onClick={() => {
                            onSelectElement(null);
                            if (onSelectTableCell) onSelectTableCell(null);
                          }}
                          className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 ml-0.5"
                          title="Close table actions"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* INTERACTIVE TABLE GRID */}
                    <table
                      className="w-full h-full border-collapse"
                      style={{ fontSize: `${(table.fontSize || 9) * zoom}px` }}
                    >
                      {/* HEADER ROW */}
                      <thead>
                        <tr
                          style={
                            !isNative
                              ? { backgroundColor: table.headerBgColor || '#1e293b' }
                              : undefined
                          }
                        >
                          {table.headers?.map((h, cIdx) => {
                            const isThisCellSelected =
                              selectedTableCell?.table.id === table.id &&
                              selectedTableCell?.rowIndex === -1 &&
                              selectedTableCell?.colIndex === cIdx;

                            const origH = table.originalHeaders?.[cIdx];
                            const isEdited = isNative && origH !== undefined && h !== origH;
                            const cWidth = colWidths[cIdx] ? `${colWidths[cIdx] * zoom}px` : 'auto';

                            return (
                              <th
                                key={cIdx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectElement(null);
                                  if (onSelectTableCell) {
                                    onSelectTableCell({
                                      table,
                                      rowIndex: -1,
                                      colIndex: cIdx,
                                      text: h,
                                    });
                                  }
                                }}
                                className={`p-1 font-semibold text-left truncate cursor-pointer transition-all ${
                                  isThisCellSelected
                                    ? 'ring-2 ring-emerald-500 bg-emerald-100 text-slate-900 font-bold shadow-xs'
                                    : isEdited
                                    ? 'bg-white text-slate-900 border border-emerald-400 font-bold'
                                    : isNative
                                    ? isTableHovered || isTableSelected
                                      ? 'hover:bg-emerald-400/20 border-r border-slate-400/30 last:border-r-0'
                                      : 'opacity-0 hover:opacity-100 hover:bg-emerald-400/20'
                                    : 'border-r border-slate-700/40 last:border-r-0 hover:bg-slate-700/40'
                                }`}
                                style={{
                                  width: cWidth,
                                  color: !isNative && !isThisCellSelected && !isEdited
                                    ? table.headerTextColor || '#ffffff'
                                    : '#0f172a',
                                }}
                                title={`Tap to edit header (${h})`}
                              >
                                {h}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>

                      {/* DATA ROWS */}
                      <tbody>
                        {table.rows?.map((row, rIdx) => {
                          const isAddedRow = isNative && rIdx >= origRowCount;

                          return (
                            <tr
                              key={rIdx}
                              className={
                                isAddedRow
                                  ? 'bg-white border-t border-slate-300'
                                  : !isNative
                                  ? 'border-t border-slate-200'
                                  : isTableSelected
                                  ? 'border-t border-dashed border-slate-300/60'
                                  : ''
                              }
                              style={
                                !isNative
                                  ? {
                                      backgroundColor:
                                        rIdx % 2 === 0 ? table.cellBgColor || '#ffffff' : '#f8fafc',
                                    }
                                  : undefined
                              }
                            >
                              {row.map((cell, cIdx) => {
                                const isThisCellSelected =
                                  selectedTableCell?.table.id === table.id &&
                                  selectedTableCell?.rowIndex === rIdx &&
                                  selectedTableCell?.colIndex === cIdx;

                                const origCell = table.originalRows?.[rIdx]?.[cIdx];
                                const isEdited = isNative && !isAddedRow && origCell !== undefined && cell !== origCell;
                                const cWidth = colWidths[cIdx] ? `${colWidths[cIdx] * zoom}px` : 'auto';

                                return (
                                  <td
                                    key={cIdx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSelectElement(null);
                                      if (onSelectTableCell) {
                                        onSelectTableCell({
                                          table,
                                          rowIndex: rIdx,
                                          colIndex: cIdx,
                                          text: cell,
                                        });
                                      }
                                    }}
                                    className={`p-1 truncate cursor-pointer transition-all ${
                                      isThisCellSelected
                                        ? 'ring-2 ring-emerald-500 bg-emerald-100 text-slate-900 font-semibold shadow-xs'
                                        : isAddedRow
                                        ? 'bg-emerald-50/40 border-r border-slate-300 last:border-r-0 text-slate-900 hover:bg-emerald-100/40'
                                        : isEdited
                                        ? 'bg-white text-slate-900 font-semibold border border-emerald-400 shadow-xs'
                                        : isNative
                                        ? isTableHovered || isTableSelected
                                          ? 'hover:bg-emerald-400/20 border-r border-slate-400/20 last:border-r-0'
                                          : 'opacity-0 hover:opacity-100 hover:bg-emerald-400/20'
                                        : 'border-r border-slate-200 last:border-r-0 hover:bg-emerald-50'
                                    }`}
                                    style={{
                                      width: cWidth,
                                      color: table.cellTextColor || '#0f172a',
                                    }}
                                    title={`Tap to edit cell (${cell || 'empty'})`}
                                  >
                                    {cell || (isAddedRow ? <span className="text-slate-400 italic font-normal">empty</span> : '')}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {/* 3. SHAPE ELEMENT */}
              {el.type === 'shape' && (
                <div className="w-full h-full">
                  {(el as ShapeElement).shapeType === 'rectangle' && (
                    <div
                      className="w-full h-full"
                      style={{
                        borderWidth: `${((el as ShapeElement).strokeWidth || 2) * zoom}px`,
                        borderStyle: (el as ShapeElement).strokeStyle || 'solid',
                        borderColor: (el as ShapeElement).strokeColor,
                        backgroundColor: (el as ShapeElement).fillColor || 'transparent',
                      }}
                    />
                  )}
                  {(el as ShapeElement).shapeType === 'circle' && (
                    <div
                      className="w-full h-full rounded-full"
                      style={{
                        borderWidth: `${((el as ShapeElement).strokeWidth || 2) * zoom}px`,
                        borderStyle: (el as ShapeElement).strokeStyle || 'solid',
                        borderColor: (el as ShapeElement).strokeColor,
                        backgroundColor: (el as ShapeElement).fillColor || 'transparent',
                      }}
                    />
                  )}
                  {(el as ShapeElement).shapeType === 'line' && (
                    <div
                      className="w-full h-0.5 my-auto"
                      style={{
                        backgroundColor: (el as ShapeElement).strokeColor,
                        height: `${((el as ShapeElement).strokeWidth || 2) * zoom}px`,
                      }}
                    />
                  )}
                  {(el as ShapeElement).shapeType === 'arrow' && (
                    <svg className="w-full h-full overflow-visible">
                      <line
                        x1="0"
                        y1={heightPx / 2}
                        x2={widthPx}
                        y2={heightPx / 2}
                        stroke={(el as ShapeElement).strokeColor}
                        strokeWidth={((el as ShapeElement).strokeWidth || 2) * zoom}
                        markerEnd="url(#arrowhead)"
                      />
                    </svg>
                  )}
                  {(el as ShapeElement).shapeType === 'checkbox' && (
                    <div
                      className="w-full h-full rounded border-2 flex items-center justify-center bg-white shadow-xs"
                      style={{ borderColor: (el as ShapeElement).strokeColor }}
                    >
                      {(el as ShapeElement).isChecked && (
                        <div
                          className="w-2.5 h-2.5 rounded-xs"
                          style={{ backgroundColor: (el as ShapeElement).strokeColor }}
                        />
                      )}
                    </div>
                  )}
                  {(el as ShapeElement).shapeType === 'checkmark' && (
                    <div className="w-full h-full flex items-center justify-center font-bold text-emerald-600">
                      ✓
                    </div>
                  )}
                  {(el as ShapeElement).shapeType === 'crossmark' && (
                    <div className="w-full h-full flex items-center justify-center font-bold text-rose-600">
                      ✕
                    </div>
                  )}
                </div>
              )}

              {/* 4. WHITEOUT ELEMENT */}
              {el.type === 'whiteout' && (
                <div
                  className="w-full h-full border border-dashed border-slate-300 shadow-xs"
                  style={{
                    backgroundColor: (el as WhiteoutElement).color || '#ffffff',
                  }}
                />
              )}

              {/* 5. IMAGE ELEMENT */}
              {el.type === 'image' && (
                <div
                  className="w-full h-full select-none"
                  style={{ opacity: (el as ImageElement).opacity ?? 1 }}
                >
                  <img
                    src={(el as ImageElement).src}
                    alt="User Element"
                    className="w-full h-full object-contain pointer-events-none"
                  />
                </div>
              )}

              {/* RESIZE HANDLES (Shown only for selected element) */}
              {isSelected && (
                <>
                  <div
                    onMouseDown={(e) => handleStartResize(e, 'nw', el)}
                    className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-emerald-500 rounded-full cursor-nwse-resize shadow"
                  />
                  <div
                    onMouseDown={(e) => handleStartResize(e, 'ne', el)}
                    className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-emerald-500 rounded-full cursor-nesw-resize shadow"
                  />
                  <div
                    onMouseDown={(e) => handleStartResize(e, 'se', el)}
                    className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-emerald-500 rounded-full cursor-nwse-resize shadow"
                  />
                  <div
                    onMouseDown={(e) => handleStartResize(e, 'sw', el)}
                    className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-emerald-500 rounded-full cursor-nesw-resize shadow"
                  />
                  <div
                    onMouseDown={(e) => handleStartResize(e, 'e', el)}
                    className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-emerald-500 rounded-full cursor-ew-resize shadow"
                  />
                  <div
                    onMouseDown={(e) => handleStartResize(e, 's', el)}
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-emerald-500 rounded-full cursor-ns-resize shadow"
                  />
                </>
              )}
            </div>
          );
        })}

        {/* LAYER 4: FREEHAND DRAWINGS SVG LAYER */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
          style={{ width: `${pageWidthPt * zoom}px`, height: `${pageHeightPt * zoom}px` }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#0f172a" />
            </marker>
          </defs>

          {/* Render Saved Drawings */}
          {activePageData.elements
            ?.filter((e) => e.type === 'drawing')
            .map((drawEl: any) => (
              <path
                key={drawEl.id}
                d={getSvgPathData(drawEl.points)}
                stroke={drawEl.strokeColor}
                strokeWidth={(drawEl.strokeWidth || 2) * zoom}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity={drawEl.opacity ?? 1}
              />
            ))}

          {/* Active drawing stroke in real-time */}
          {currentDrawPoints.length > 1 && (
            <path
              d={getSvgPathData(currentDrawPoints)}
              stroke={activeTool === 'highlight' ? '#facc15' : '#0f172a'}
              strokeWidth={(activeTool === 'highlight' ? 14 : 2.5) * zoom}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={activeTool === 'highlight' ? 0.4 : 1.0}
            />
          )}
        </svg>

        {/* LAYER 5: ACTIVE SHAPE CREATION BOX PREVIEW */}
        {creationBox && (
          <div
            className="absolute border-2 border-dashed border-emerald-500 bg-emerald-500/10 pointer-events-none rounded"
            style={{
              left: `${Math.min(creationBox.startX, creationBox.currentX) * zoom}px`,
              top: `${Math.min(creationBox.startY, creationBox.currentY) * zoom}px`,
              width: `${Math.abs(creationBox.currentX - creationBox.startX) * zoom}px`,
              height: `${Math.abs(creationBox.currentY - creationBox.startY) * zoom}px`,
            }}
          />
        )}
      </div>
    </div>
  );
};

