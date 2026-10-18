export type TrimPreset = "letter" | "paperback" | "square";
export type ZoomLevel = "50%" | "75%" | "100%" | "Fit";
export type SpreadMode = "single" | "spread";
export type SaveStatus = "loading" | "saved" | "error";
export type TextFontFamily = "serif" | "sans" | "mono";
export type TextAlignment = "left" | "center" | "right" | "justify";
export type TextStyle =
  | "paragraph"
  | "heading"
  | "subheading"
  | "body"
  | "bullet-list"
  | "numbered-list"
  | "pull-quote"
  | "caption"
  | "chapter-title";

export type ShapeType =
  | "rectangle"
  | "circle"
  | "ellipse"
  | "triangle"
  | "star"
  | "pentagon"
  | "line"
  | "arrow"
  | "speech-bubble"
  | "divider";

type ElementPosition = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
};

export type TextEditorElement = ElementPosition & {
  kind: "text";
  textStyle: TextStyle;
  content: string;
  fontFamily: TextFontFamily;
  fontSize: number;
  color: string;
  rotation: number;
  lineSpacing: number;
  tracking: number;
  bold: boolean;
  italic: boolean;
  alignment: TextAlignment;
  lineHeight: number;
};

export type ShapeEditorElement = ElementPosition & {
  kind: "shape";
  shapeType: ShapeType;
  fillColor: string;
  outlineColor: string | null;
  outlineWidth: number;
  rotation: number;
  cornerRadius: number;
  starPoints: number;
  pentagonSides: number;
};

export type TextElementUpdates = Partial<
  Pick<
    TextEditorElement,
    | "content"
    | "fontFamily"
    | "fontSize"
    | "color"
    | "rotation"
    | "lineSpacing"
    | "tracking"
    | "bold"
    | "italic"
    | "alignment"
    | "lineHeight"
  >
>;

export type ShapeElementUpdates = Partial<
  Pick<
    ShapeEditorElement,
    | "width"
    | "height"
    | "fillColor"
    | "outlineColor"
    | "outlineWidth"
    | "rotation"
    | "cornerRadius"
    | "starPoints"
    | "pentagonSides"
  >
>;

export type EditorElement =
  | TextEditorElement
  | (ElementPosition & {
      kind: "image";
      src: string;
      alt: string;
    })
  | (ElementPosition & {
      kind: "puzzle";
      puzzleType: string;
    })
  | ShapeEditorElement;

export type EditorPage = {
  id: string;
  title: string;
  elements: EditorElement[];
};
