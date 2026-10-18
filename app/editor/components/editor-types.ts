export type TrimPreset = "letter" | "paperback" | "square";
export type ZoomLevel = "50%" | "75%" | "100%" | "Fit";
export type SpreadMode = "single" | "spread";
export type SaveStatus = "loading" | "saved" | "error";
export type SudokuDifficulty = "easy" | "medium" | "hard" | "insane";
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
  | "speech-bubble";
export type LineStyle =
  | "thin"
  | "thick"
  | "dashed"
  | "dotted"
  | "double"
  | "ornament";
export type LineCapStyle = "round" | "square";

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
  lineStyle: LineStyle;
  lineCap: LineCapStyle;
  fillColor: string;
  outlineColor: string | null;
  outlineWidth: number;
  rotation: number;
  cornerRadius: number;
  starPoints: number;
  pentagonSides: number;
};

export type ArtworkEditorElement = ElementPosition & {
  kind: "artwork";
  artKey: string;
  strokeColor: string;
  strokeWidth: number;
  rotation: number;
};

export type ImageFilterSettings = {
  brightness: number;
  contrast: number;
  saturation: number;
  grayscale: number;
  sepia: number;
  blur: number;
  hueRotation: number;
};

export type ImageEditorElement = ElementPosition & {
  kind: "image";
  src: string;
  alt: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  opacity: number;
  rotation: number;
  filters: ImageFilterSettings;
};

export type SudokuEditorElement = ElementPosition & {
  kind: "sudoku";
  squares: 2 | 3 | 4 | 5;
  difficulty: SudokuDifficulty;
  puzzle: number[];
  solution: number[];
  hiddenSquares: number;
  color: string;
  numberSize: number;
  isSolution: boolean;
  solutionNumber?: number;
};

export type WordSearchPlacement = {
  word: string;
  clean: string;
  path: { x: number; y: number }[];
  solutionColor?: string;
};

export type WordSearchGenerationSettings = {
  cols: number;
  rows: number;
  dictionaryName: string;
  dictionary: string[];
  maxWords: number;
  pageCount: number;
};

export type WordSearchEditorElement = ElementPosition & {
  kind: "word-search";
  puzzleId: string;
  rows: number;
  cols: number;
  grid: string[][];
  words: WordSearchPlacement[];
  dictionaryName: string;
  color: string;
  letterSize: number;
  lineWeight: number;
  isSolution: boolean;
  solutionNumber?: number;
};

export type WordSearchWordsEditorElement = ElementPosition & {
  kind: "word-search-words";
  puzzleId: string;
  words: WordSearchPlacement[];
  color: string;
  fontFamily: TextFontFamily;
  fontSize: number;
  spacing: number;
  lineSpacing: number;
  isSolution: boolean;
  solutionNumber?: number;
};

export type WordSearchGridElementUpdates = Partial<
  Pick<WordSearchEditorElement, "letterSize" | "lineWeight">
>;

export type WordSearchWordsElementUpdates = Partial<
  Pick<
    WordSearchWordsEditorElement,
    "fontFamily" | "fontSize" | "spacing" | "lineSpacing"
  >
>;

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
    | "lineStyle"
    | "lineCap"
    | "fillColor"
    | "outlineColor"
    | "outlineWidth"
    | "rotation"
    | "cornerRadius"
    | "starPoints"
    | "pentagonSides"
  >
>;

export type ArtworkElementUpdates = Partial<
  Pick<
    ArtworkEditorElement,
    "width" | "height" | "strokeColor" | "strokeWidth" | "rotation"
  >
>;

export type ImageElementUpdates = Partial<
  Pick<
    ImageEditorElement,
    | "width"
    | "height"
    | "borderColor"
    | "borderWidth"
    | "borderRadius"
    | "opacity"
    | "rotation"
    | "filters"
  >
>;

export type SudokuElementUpdates = Partial<
  Pick<
    SudokuEditorElement,
    "x" | "y" | "width" | "height" | "color" | "numberSize"
  >
>;

export type EditorElement =
  | TextEditorElement
  | ImageEditorElement
  | SudokuEditorElement
  | WordSearchEditorElement
  | WordSearchWordsEditorElement
  | (ElementPosition & {
      kind: "puzzle";
      puzzleType: string;
    })
  | ShapeEditorElement
  | ArtworkEditorElement;

export type EditorPage = {
  id: string;
  title: string;
  pageType?: "sudoku-solutions" | "puzzle-solutions";
  elements: EditorElement[];
};
