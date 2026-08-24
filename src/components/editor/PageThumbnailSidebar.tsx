import React, { useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  Plus,
  Trash2,
  Copy,
  RotateCw,
  ChevronUp,
  ChevronDown,
  Layers,
  FileCheck
} from 'lucide-react';
import { PageEditData } from '../../types/editor';

interface PageThumbnailSidebarProps {
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

export const PageThumbnailSidebar: React.FC<PageThumbnailSidebarProps> = ({
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

  // Render thumbnails
  useEffect(() => {
    if (!pdfDoc) return;

    pages.forEach(async (pageData) => {
      const pageNum = pageData.pageNumber;
      const canvas = thumbnailCanvasRefs.current[pageNum];
      if (!canvas) return;

      if (pageNum <= pdfDoc.numPages) {
        try {
          const page = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale: 0.25 });
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
  }, [pdfDoc, pages]);

  const activePages = pages.filter((p) => !p.isDeleted);

  return (
    <aside className="w-48 lg:w-56 bg-slate-950 border-r border-slate-800/80 flex flex-col shrink-0 select-none overflow-hidden">
      {/* Sidebar Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span>Pages ({activePages.length})</span>
        </div>

        <button
          onClick={onAddPage}
          className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 border border-slate-800 transition-colors flex items-center gap-1 text-[10px] font-medium"
          title="Add Blank Page"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New</span>
        </button>
      </div>

      {/* Thumbnails Scroll List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {pages.map((pageData, index) => {
          if (pageData.isDeleted) return null;
          const pageNum = pageData.pageNumber;
          const isActive = pageNum === activePageNumber;
          const editCount = pageData.elements?.length || 0;

          return (
            <div
              key={pageNum}
              onClick={() => onSelectPage(pageNum)}
              className={`group relative rounded-xl border p-2 transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 border-emerald-500 shadow-md shadow-emerald-500/10'
                  : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              {/* Thumbnail Container */}
              <div className="aspect-[3/4] bg-white rounded-lg overflow-hidden shadow-sm flex items-center justify-center relative border border-slate-200/20">
                {pdfDoc && pageNum <= pdfDoc.numPages ? (
                  <canvas
                    ref={(el) => (thumbnailCanvasRefs.current[pageNum] = el)}
                    className="w-full h-full object-contain pointer-events-none"
                    style={{ transform: `rotate(${pageData.rotation || 0}deg)` }}
                  />
                ) : (
                  <div className="text-slate-400 text-xs flex flex-col items-center gap-1">
                    <FileCheck className="w-6 h-6 text-slate-300" />
                    <span className="text-[10px] text-slate-400">Blank Page</span>
                  </div>
                )}

                {/* Edit Count Badge */}
                {editCount > 0 && (
                  <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-bold text-[9px] shadow-sm">
                    {editCount} {editCount === 1 ? 'edit' : 'edits'}
                  </div>
                )}
              </div>

              {/* Page Number & Action Buttons */}
              <div className="flex items-center justify-between mt-2 pt-1">
                <span
                  className={`text-[11px] font-semibold ${
                    isActive ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  Page {index + 1}
                </span>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRotatePage(pageNum);
                    }}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                    title="Rotate 90°"
                  >
                    <RotateCw className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicatePage(pageNum);
                    }}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                    title="Duplicate Page"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  {activePages.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePage(pageNum);
                      }}
                      className="p-1 rounded hover:bg-rose-950/50 text-slate-400 hover:text-rose-400"
                      title="Delete Page"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
