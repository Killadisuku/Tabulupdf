import React from 'react';
import {
  Trash2,
  Copy,
  Sliders,
  Grid,
  Palette,
  Eye,
  X,
  Check
} from 'lucide-react';
import {
  PdfEditorElement,
  TableElement,
  ShapeElement,
  ImageElement,
  WhiteoutElement
} from '../../types/editor';

interface PropertiesPanelProps {
  selectedElement: PdfEditorElement | null;
  onUpdateElement: (updated: PdfEditorElement) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onOpenTableEditor: (table: TableElement) => void;
  onDeselect: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onOpenTableEditor,
  onDeselect,
}) => {
  // If no element is selected or if it's text (text uses CompactTextEditor), don't show this
  if (!selectedElement || selectedElement.type === 'text') {
    return null;
  }

  const el = selectedElement;

  return (
    <div className="fixed bottom-0 left-0 right-0 sm:bottom-auto sm:top-4 sm:right-4 sm:left-auto z-50 sm:w-80 max-w-full bg-slate-900/98 backdrop-blur-md border-t sm:border border-slate-700/80 sm:rounded-2xl shadow-2xl p-3 text-xs select-none animate-in fade-in slide-in-from-bottom-2 sm:slide-in-from-right-2">
      {/* Header with Title & Action Icons */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            {el.type === 'table' && <Grid className="w-3 h-3" />}
            {el.type === 'shape' && <Sliders className="w-3 h-3" />}
            {el.type === 'image' && <Eye className="w-3 h-3" />}
            {el.type === 'whiteout' && <Palette className="w-3 h-3" />}
            {el.type === 'drawing' && <Palette className="w-3 h-3" />}
          </div>
          <span className="font-bold text-slate-200 capitalize text-xs">
            {el.type} Properties
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onDuplicateElement(el.id)}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title="Duplicate"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDeleteElement(el.id)}
            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 rounded transition-colors cursor-pointer"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDeselect}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* TABLE ELEMENT */}
      {el.type === 'table' && (
        <div className="space-y-2.5">
          <button
            onClick={() => onOpenTableEditor(el as TableElement)}
            className="w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 cursor-pointer transition-colors"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Open Table Spreadsheet Editor</span>
          </button>
          <div className="grid grid-cols-2 gap-2 text-slate-300">
            <div className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
              <span className="text-slate-500 text-[10px]">Columns:</span>
              <span className="font-bold text-xs">
                {(el as TableElement).headers?.length || (el as TableElement).rows?.[0]?.length || 0}
              </span>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
              <span className="text-slate-500 text-[10px]">Rows:</span>
              <span className="font-bold text-xs">{(el as TableElement).rows?.length || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* SHAPE ELEMENT */}
      {el.type === 'shape' && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Stroke Color</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={(el as ShapeElement).strokeColor || '#000000'}
                  onChange={(e) =>
                    onUpdateElement({ ...el, strokeColor: e.target.value } as ShapeElement)
                  }
                  className="w-6 h-6 rounded border border-slate-700 cursor-pointer bg-transparent"
                />
                <span className="font-mono text-[10px] text-slate-400">
                  {(el as ShapeElement).strokeColor}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Fill</label>
              <div className="flex items-center gap-1">
                <input
                  type="color"
                  value={(el as ShapeElement).fillColor || '#ffffff'}
                  onChange={(e) =>
                    onUpdateElement({ ...el, fillColor: e.target.value } as ShapeElement)
                  }
                  className="w-6 h-6 rounded border border-slate-700 cursor-pointer bg-transparent"
                />
                <button
                  onClick={() =>
                    onUpdateElement({
                      ...el,
                      fillColor: (el as ShapeElement).fillColor ? '' : '#ffffff',
                    } as ShapeElement)
                  }
                  className="px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-[10px] text-slate-300"
                >
                  {(el as ShapeElement).fillColor ? 'Solid' : 'None'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WHITEOUT ELEMENT */}
      {el.type === 'whiteout' && (
        <div className="space-y-2">
          <p className="text-slate-400 text-[10px]">
            Whiteout masks underlying content in the exported PDF.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400">Mask Color:</span>
            <input
              type="color"
              value={(el as WhiteoutElement).color || '#ffffff'}
              onChange={(e) =>
                onUpdateElement({ ...el, color: e.target.value } as WhiteoutElement)
              }
              className="w-6 h-6 rounded border border-slate-700 cursor-pointer bg-transparent"
            />
          </div>
        </div>
      )}

      {/* IMAGE ELEMENT */}
      {el.type === 'image' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Opacity</span>
            <span>{Math.round(((el as ImageElement).opacity ?? 1) * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={(el as ImageElement).opacity ?? 1}
            onChange={(e) =>
              onUpdateElement({
                ...el,
                opacity: Number(e.target.value),
              } as ImageElement)
            }
            className="w-full accent-emerald-500"
          />
        </div>
      )}

      {/* Done Button */}
      <div className="pt-2 mt-2 border-t border-slate-800 flex justify-end">
        <button
          onClick={onDeselect}
          className="w-full py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
        >
          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Done</span>
        </button>
      </div>
    </div>
  );
};
