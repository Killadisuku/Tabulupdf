export type EditorTool =
  | 'select'
  | 'text'
  | 'table'
  | 'image'
  | 'draw'
  | 'arrow'
  | 'line'
  | 'rectangle'
  | 'circle'
  | 'callout'
  | 'highlight'
  | 'signature'
  | 'whiteout'
  | 'checkbox'
  | 'checkmark'
  | 'crossmark';

export interface DetectedTextItem {
  id: string;
  pageNumber: number;
  text: string;
  x: number; // PDF points (72 DPI)
  y: number; // PDF points
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  color?: string;
}

export interface BaseElement {
  id: string;
  pageNumber: number;
  x: number; // PDF points (0,0 is top-left of page)
  y: number; // PDF points
  width: number;
  height: number;
  rotation?: number; // degrees 0-360
  opacity?: number; // 0 to 1
  zIndex: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  originalText?: string;
  originalBounds?: { x: number; y: number; width: number; height: number };
  fontSize: number;
  fontFamily: 'Helvetica' | 'Times' | 'Courier' | 'Arial' | 'Georgia';
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  color: string;
  backgroundColor?: string;
  underline?: boolean;
  isHeading?: boolean;
}

export interface TableCellBound {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TableElement extends BaseElement {
  type: 'table';
  headers: string[];
  rows: string[][];
  colWidths?: number[]; // Widths in points or relative weights
  rowHeights?: number[]; // Heights of each data row in points
  headerHeight?: number; // Height of header row in points
  headerBgColor?: string;
  headerTextColor?: string;
  cellBgColor?: string;
  cellTextColor?: string;
  borderColor?: string;
  borderWidth?: number;
  fontSize?: number;
  hasHeaderRow?: boolean;
  isNativePdfTable?: boolean; // True if detected from the underlying PDF document
  originalHeaders?: string[];
  originalRows?: string[][];
  originalRegion?: { x: number; y: number; width: number; height: number };
  cellBounds?: {
    headerBounds?: TableCellBound[];
    rowBounds?: TableCellBound[][];
  };
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType:
    | 'rectangle'
    | 'circle'
    | 'line'
    | 'arrow'
    | 'callout'
    | 'cloud'
    | 'checkbox'
    | 'checkmark'
    | 'crossmark'
    | 'highlight';
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  isChecked?: boolean; // for checkboxes
  textLabel?: string;
}

export interface DrawingElement extends BaseElement {
  type: 'drawing';
  points: { x: number; y: number }[];
  strokeColor: string;
  strokeWidth: number;
  isHighlighter?: boolean;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string; // Data URL or object URL
  aspectRatio: number;
  isSignature?: boolean;
}

export interface WhiteoutElement extends BaseElement {
  type: 'whiteout';
  color: string; // usually #ffffff
}

export type PdfEditorElement =
  | TextElement
  | TableElement
  | ShapeElement
  | DrawingElement
  | ImageElement
  | WhiteoutElement;

export interface PageEditData {
  pageNumber: number;
  originalWidth: number; // in PDF points (e.g. 595.28 for A4)
  originalHeight: number; // in PDF points (e.g. 841.89 for A4)
  rotation: number; // 0, 90, 180, 270
  isDeleted?: boolean;
  elements: PdfEditorElement[];
}

export interface PdfEditorState {
  pages: PageEditData[];
  activePageNumber: number;
  selectedElementIds: string[];
  activeTool: EditorTool;
  zoom: number; // 1.0 = 100%
  isScannedDetected: boolean;
  findQuery: string;
  replaceQuery: string;
}
