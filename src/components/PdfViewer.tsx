import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crop,
  Sparkles,
  RefreshCw,
  Eye,
  CheckSquare,
  X,
  FileText,
  RotateCw
} from 'lucide-react';
import { renderPdfPageToCanvas, RegionBounds } from '../utils/pdfParser';
import { SampleDoc, renderSampleToCanvas } from '../utils/samplePdfs';

interface PdfViewerProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  sampleDoc: SampleDoc | null;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onExtractRegion: (region: RegionBounds | null) => void;
  onOpenAiExtract: (imageBase64?: string) => void;
  isProcessing: boolean;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  pdfDoc,
  sampleDoc,
  currentPage,
  totalPages,
  onPageChange,
  onExtractRegion,
  onOpenAiExtract,
  isProcessing,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentRenderTaskRef = useRef<any>(null);

  const [zoom, setZoom] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [isSelectingTable, setIsSelectingTable] = useState<boolean>(false);
  const [selectionBox, setSelectionBox] = useState<RegionBounds | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({
    width: 600,
    height: 800,
  });

  // Render Page
  useEffect(() => {
    let isCancelled = false;

    const render = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Cancel previous in-flight render task if still active
      if (currentRenderTaskRef.current) {
        try {
          currentRenderTaskRef.current.cancel();
        } catch (e) {
          // Ignore cancellation
        }
        currentRenderTaskRef.current = null;
      }

      try {
        if (pdfDoc) {
          const page = await pdfDoc.getPage(currentPage);
          if (isCancelled) return;

          const viewport = page.getViewport({ scale: zoom, rotation: (page.rotate + rotation) % 360 });
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const renderContext = {
            canvasContext: ctx,
            viewport: viewport,
          };

          const renderTask = page.render(renderContext);
          currentRenderTaskRef.current = renderTask;

          await renderTask.promise;

          if (!isCancelled) {
            setCanvasDimensions({ width: viewport.width, height: viewport.height });
          }
        } else if (sampleDoc) {
          renderSampleToCanvas(sampleDoc, currentPage - 1, canvas);
          if (!isCancelled) {
            setCanvasDimensions({ width: canvas.width, height: canvas.height });
          }
        }
      } catch (err: any) {
        if (err?.name === 'RenderingCancelledException' || err?.message?.includes('cancelled')) {
          // Normal PDF.js cancellation on quick page flip / zoom change
          return;
        }
        console.error('Error rendering PDF page:', err);
      } finally {
        currentRenderTaskRef.current = null;
      }
    };

    render();

    return () => {
      isCancelled = true;
      if (currentRenderTaskRef.current) {
        try {
          currentRenderTaskRef.current.cancel();
        } catch (e) {
          // Ignore cancellation
        }
        currentRenderTaskRef.current = null;
      }
    };
  }, [pdfDoc, sampleDoc, currentPage, zoom, rotation]);

  // Handle Box Selection (Marquee tool)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelectingTable || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setDragStart({ x, y });
    setSelectionBox({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragStart || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    const x = Math.min(dragStart.x, currentX);
    const y = Math.min(dragStart.y, currentY);
    const width = Math.abs(currentX - dragStart.x);
    const height = Math.abs(currentY - dragStart.y);

    setSelectionBox({ x, y, width, height });
  };

  const handleMouseUp = () => {
    if (dragStart && selectionBox) {
      if (selectionBox.width < 10 || selectionBox.height < 10) {
        setSelectionBox(null);
      }
    }
    setDragStart(null);
  };

  const handleApplySelection = () => {
    if (!selectionBox || !canvasRef.current) return;
    // Map screen zoom coordinates back to 1.0 scale
    const scaleFactor = zoom;
    const unscaledRegion: RegionBounds = {
      x: selectionBox.x / scaleFactor,
      y: selectionBox.y / scaleFactor,
      width: selectionBox.width / scaleFactor,
      height: selectionBox.height / scaleFactor,
    };
    onExtractRegion(unscaledRegion);
  };

  const handleClearSelection = () => {
    setSelectionBox(null);
    onExtractRegion(null);
  };

  const handleAiExtractCurrentView = () => {
    if (!canvasRef.current) return;

    let base64Image = '';
    if (selectionBox && selectionBox.width > 20 && selectionBox.height > 20) {
      // Crop selected region to new offscreen canvas
      const offscreen = document.createElement('canvas');
      offscreen.width = selectionBox.width;
      offscreen.height = selectionBox.height;
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          canvasRef.current,
          selectionBox.x,
          selectionBox.y,
          selectionBox.width,
          selectionBox.height,
          0,
          0,
          selectionBox.width,
          selectionBox.height
        );
        base64Image = offscreen.toDataURL('image/png');
      }
    } else {
      base64Image = canvasRef.current.toDataURL('image/png');
    }

    onOpenAiExtract(base64Image);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border-r border-slate-800 select-none overflow-hidden">
      {/* Top Toolbar */}
      <div className="h-12 px-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 text-xs">
        {/* Page Nav */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1 || isProcessing}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-slate-300 font-medium px-1">
            Page <span className="text-white font-bold">{currentPage}</span> of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages || isProcessing}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] text-slate-400 font-mono w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))))}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-slate-800 mx-1" />

          {/* Marquee Table Select Tool */}
          <button
            onClick={() => setIsSelectingTable(!isSelectingTable)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isSelectingTable
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800 border border-transparent'
            }`}
            title="Draw rectangle over specific table region"
          >
            <Crop className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Select Area</span>
          </button>

          {/* AI Vision Scan Button */}
          <button
            onClick={handleAiExtractCurrentView}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-600/20 border border-purple-500/30 text-purple-200 hover:bg-purple-600/30 flex items-center gap-1.5 transition-all"
            title="AI Table Vision Extract"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden lg:inline">AI Vision</span>
          </button>
        </div>
      </div>

      {/* Floating Selection Action Bar if box selected */}
      {selectionBox && (
        <div className="bg-amber-950/80 border-b border-amber-800/60 px-4 py-2 flex items-center justify-between text-xs text-amber-200 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Table Area Selected</span>
            <span className="text-[11px] text-amber-400 font-mono">
              ({Math.round(selectionBox.width)} × {Math.round(selectionBox.height)}px)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleApplySelection}
              className="px-3 py-1 rounded-md bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold flex items-center gap-1 transition-all shadow-sm"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Extract Crop
            </button>
            <button
              onClick={handleClearSelection}
              className="p-1 rounded-md hover:bg-amber-900/50 text-amber-400"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Canvas Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`flex-1 overflow-auto p-4 flex items-center justify-center relative bg-slate-950/90 ${
          isSelectingTable ? 'cursor-crosshair' : 'cursor-default'
        }`}
      >
        <div className="relative shadow-2xl rounded-sm overflow-hidden border border-slate-800 bg-white">
          <canvas ref={canvasRef} className="block" />

          {/* Selection Box Overlay */}
          {selectionBox && (
            <div
              style={{
                position: 'absolute',
                left: `${selectionBox.x}px`,
                top: `${selectionBox.y}px`,
                width: `${selectionBox.width}px`,
                height: `${selectionBox.height}px`,
                pointerEvents: 'none',
              }}
              className="border-2 border-dashed border-amber-400 bg-amber-400/20 shadow-lg"
            >
              <span className="absolute -top-6 left-0 bg-amber-500 text-slate-950 font-bold text-[10px] px-1.5 py-0.5 rounded shadow">
                Table Region
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
