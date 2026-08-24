import React, { useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  Plus,
  Trash2,
  Copy,
  RotateCw,
  X,
  Layers,
  FileCheck,
  Check
} from 'lucide-react';
import { PageEditData } from '../../types/editor';

interface PageNavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  pages: PageEditData[];
  activePageNumber: number;
  onSelectPage: (pageNumber: number) => void;
  onAddPage: () => void;
  onDeletePage: (pageNumber: number) => void;
  onDuplicatePage: (pageNumber: number) => void;
  onRotatePage: (pageNumber: number) => void;
  onMovePage: (fromIndex: number, toIndex: number) => void;
}

export const PageNavigationDrawer: React.FC<PageNavigationDrawerProps> = ({
  isOpen,
  onClose,
  pdfDoc,
  pages,
  activePageNumber,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onDuplicatePage,
  onRotatePage,
  onMovePage,
}) => {
  const thumbnailCanvasRefs = useRef<{ [pageNumber: number]: HTMLCanvasElement | null }>({});

  // Render page thumbnails when drawer opens or pages change
  useEffect(() => {
    if (!isOpen || !pdfDoc) return;

    let isMounted = true;

    pages.forEach(async (pageData) => {
      if (pageData.isDeleted) return;
      const pageNum = pageData.pageNumber;
      const canvas = thumbnailCanvasRefs.current[pageNum];
      if (!canvas) return;

      if (pageNum <= pdfDoc.numPages) {
        try {
          const page = await pdfDoc.getPage(pageNum);
          if (!isMounted) return;
          const viewport = page.getViewport({ scale: 0.3 });
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport } as any).promise;
          }
        } catch {
          // Ignored
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, pdfDoc, pages]);

  if (!isOpen) return null;

  const activePages = pages.filter((p) => !p.isDeleted);

  const handlePageClick = (pageNum: number) => {
    onSelectPage(pageNum);
    onClose(); // Automatically close drawer on selection as requested!
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Slide-over Drawer */}
      <div className="relative w-full max-w-sm sm:max-w-md bg-slate-900 border-r border-slate-800 shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Document Pages</h2>
              <p className="text-[11px] text-slate-400">
                {activePages.length} {activePages.length === 1 ? 'Page' : 'Pages'} • Tap to switch
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onAddPage}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Add Blank Page"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Page</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Pages Drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Body: Grid of Thumbnails */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3.5 sm:gap-4 content-start">
          {pages.map((pageData, index) => {
            if (pageData.isDeleted) return null;
            const pageNum = pageData.pageNumber;
            const isActive = pageNum === activePageNumber;
            const editCount = pageData.elements?.length || 0;

            return (
              <div
                key={pageNum}
                onClick={() => handlePageClick(pageNum)}
                className={`group relative rounded-2xl border p-2.5 transition-all cursor-pointer flex flex-col ${
                  isActive
                    ? 'bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                {/* Thumbnail Canvas Stage */}
                <div className="aspect-[3/4] bg-white rounded-xl overflow-hidden shadow-sm flex items-center justify-center relative border border-slate-200/20">
                  {pdfDoc && pageNum <= pdfDoc.numPages ? (
                    <canvas
                      ref={(el) => (thumbnailCanvasRefs.current[pageNum] = el)}
                      className="w-full h-full object-contain pointer-events-none"
                      style={{ transform: `rotate(${pageData.rotation || 0}deg)` }}
                    />
                  ) : (
                    <div className="text-slate-400 text-xs flex flex-col items-center gap-1.5">
                      <FileCheck className="w-8 h-8 text-slate-300" />
                      <span className="text-[10px] text-slate-400 font-medium">Blank Page</span>
                    </div>
                  )}

                  {/* Active Indicator Badge */}
                  {isActive && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-bold text-[10px] shadow flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>Current</span>
                    </div>
                  )}

                  {/* Edits Badge */}
                  {editCount > 0 && (
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-slate-900/90 backdrop-blur text-emerald-400 font-semibold text-[9px] border border-emerald-500/30 shadow-sm">
                      {editCount} {editCount === 1 ? 'edit' : 'edits'}
                    </div>
                  )}
                </div>

                {/* Page Info & Controls Footer */}
                <div className="flex items-center justify-between mt-2.5 pt-1">
                  <div className="min-w-0">
                    <span
                      className={`text-xs font-semibold truncate block ${
                        isActive ? 'text-emerald-400' : 'text-slate-300'
                      }`}
                    >
                      Page {index + 1}
                    </span>
                    {pageData.rotation ? (
                      <span className="text-[10px] text-slate-500 block">
                        Rotated {pageData.rotation}°
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRotatePage(pageNum);
                      }}
                      className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                      title="Rotate 90°"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicatePage(pageNum);
                      }}
                      className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                      title="Duplicate Page"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {activePages.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePage(pageNum);
                        }}
                        className="p-1 rounded-lg hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Delete Page"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Drawer Footer Tip */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-center">
          <p className="text-[11px] text-slate-400">
            Selecting a page will switch to it and return to the full-screen canvas.
          </p>
        </div>
      </div>
    </div>
  );
};
