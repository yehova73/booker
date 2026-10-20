"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type {
  EditorElement,
  EditorPage,
  ArtworkEditorElement,
  ColoringPageImage,
  ArtworkElementUpdates,
  ImageEditorElement,
  ImageElementUpdates,
  ImageFilterSettings,
  BookDesignSettings,
  LineCapStyle,
  LineStyle,
  MazeCellWalls,
  MazeDifficulty,
  MazeEditorElement,
  MazeElementUpdates,
  MazeGenerationSettings,
  MazePathCell,
  SaveStatus,
  ShapeEditorElement,
  ShapeElementUpdates,
  ShapeType,
  PageBorderStyle,
  PageNumberPosition,
  RepeatingDesignElement,
  SpreadMode,
  SudokuDifficulty,
  SudokuEditorElement,
  SudokuElementUpdates,
  TextEditorElement,
  TextElementUpdates,
  TextStyle,
  TrimPreset,
  WordSearchEditorElement,
  WordSearchGenerationSettings,
  WordSearchGridElementUpdates,
  WordSearchPlacement,
  WordSearchWordsElementUpdates,
  WordSearchWordsEditorElement,
  ZoomLevel,
} from "./components/editor-types";
import { ART_LIBRARY, SHAPE_TYPES } from "@/lib/designAssets";
import {
  generateSudokus,
  isSudokuDifficulty,
  updateSudokuDifficulty,
} from "./sudoku-utils";
import { generateWordSearches } from "./word-search-utils";
import { withWordSearchSolutionColors } from "./components/word-search-colors";
import { generateMazes } from "./maze-utils";
import { saveBookDataAction } from "@/actions/books/save-book-data";
import { isAiBookPlanPageType } from "@/lib/ai-studio";

const defaultImageFilters: ImageFilterSettings = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  grayscale: 0,
  sepia: 0,
  blur: 0,
  hueRotation: 0,
};
const defaultBookDesign: BookDesignSettings = {
  pageNumbers: {
    enabled: false,
    format: "arabic",
    position: "bottom-outer",
    fontFamily: "serif",
    fontSize: 10,
    color: "#59655e",
  },
  pageBorder: {
    enabled: false,
    style: "solid",
    inset: 4,
    width: 1,
    color: "#59655e",
  },
  excludedPageIds: [],
  elements: [],
};
const defaultDocument: EditorDocument = {
  bookName: "Untitled Book",
  pages: [{ id: "page-1", title: "Page 1", elements: [] }],
  currentPageId: "page-1",
  trimPreset: "letter",
  bleedEnabled: false,
  zoom: "Fit",
  spreadMode: "single",
  design: defaultBookDesign,
};

const textDefaults: Record<
  TextStyle,
  Pick<
    TextEditorElement,
    "fontFamily" | "fontSize" | "color" | "bold" | "italic"
  >
> = {
  paragraph: {
    fontFamily: "serif",
    fontSize: 14,
    color: "#49534b",
    bold: false,
    italic: false,
  },
  heading: {
    fontFamily: "serif",
    fontSize: 32,
    color: "#2b4736",
    bold: true,
    italic: false,
  },
  subheading: {
    fontFamily: "serif",
    fontSize: 23,
    color: "#405d47",
    bold: false,
    italic: false,
  },
  body: {
    fontFamily: "sans",
    fontSize: 14,
    color: "#566158",
    bold: false,
    italic: false,
  },
  "bullet-list": {
    fontFamily: "sans",
    fontSize: 14,
    color: "#566158",
    bold: false,
    italic: false,
  },
  "numbered-list": {
    fontFamily: "sans",
    fontSize: 14,
    color: "#566158",
    bold: false,
    italic: false,
  },
  "pull-quote": {
    fontFamily: "serif",
    fontSize: 18,
    color: "#51634f",
    bold: false,
    italic: true,
  },
  caption: {
    fontFamily: "sans",
    fontSize: 11,
    color: "#7b847c",
    bold: false,
    italic: true,
  },
  "chapter-title": {
    fontFamily: "serif",
    fontSize: 36,
    color: "#2b4736",
    bold: true,
    italic: false,
  },
};
type EditorDocument = {
  bookName: string;
  pages: EditorPage[];
  currentPageId: string;
  trimPreset: TrimPreset;
  bleedEnabled: boolean;
  zoom: ZoomLevel;
  spreadMode: SpreadMode;
  design: BookDesignSettings;
};

type StorageSnapshot = {
  ready: boolean;
  value: string | null;
  error: string | null;
};

type EditorContextValue = EditorDocument & {
  currentPage: EditorPage;
  currentPageNumber: number;
  selectedElementId: string | null;
  saveStatus: SaveStatus;
  saveError: string | null;
  selectPage: (pageId: string) => void;
  addBlankPage: () => void;
  clonePage: (pageId: string) => void;
  deletePage: (pageId: string) => void;
  addTextElement: (textStyle: TextStyle) => void;
  addImageElement: (fileId: string, src: string, alt: string) => void;
  addColoringPages: (images: ColoringPageImage[]) => void;
  addShapeElement: (shapeType: ShapeType) => void;
  addArtworkElement: (artKey: string) => void;
  addSudokuPages: (
    squares: 2 | 3 | 4 | 5,
    difficulty: SudokuDifficulty,
    pageCount: number,
  ) => Promise<void>;
  addWordSearchPages: (settings: WordSearchGenerationSettings) => Promise<void>;
  addMazePages: (settings: MazeGenerationSettings) => Promise<void>;
  generatePuzzleSolutions: () => void;
  deleteElement: (elementId: string) => void;
  updateTextContent: (elementId: string, content: string) => void;
  updateTextElement: (elementId: string, updates: TextElementUpdates) => void;
  updateShapeElement: (elementId: string, updates: ShapeElementUpdates) => void;
  updateArtworkElement: (
    elementId: string,
    updates: ArtworkElementUpdates,
  ) => void;
  updateImageElement: (elementId: string, updates: ImageElementUpdates) => void;
  updateSudokuElement: (
    elementId: string,
    updates: SudokuElementUpdates,
  ) => void;
  updateWordSearchGridElement: (
    elementId: string,
    updates: WordSearchGridElementUpdates,
  ) => void;
  updateWordSearchWordsElement: (
    elementId: string,
    updates: WordSearchWordsElementUpdates,
  ) => void;
  updateMazeElement: (elementId: string, updates: MazeElementUpdates) => void;
  setBookDesign: (design: BookDesignSettings) => void;
  addDesignTextElement: () => string;
  addDesignShapeElement: (shapeType: ShapeType) => string;
  addDesignArtworkElement: (artKey: string) => string;
  updateDesignElement: (
    elementId: string,
    element: RepeatingDesignElement,
  ) => void;
  deleteDesignElement: (elementId: string) => void;
  setSudokuDifficulty: (
    elementId: string,
    difficulty: SudokuDifficulty,
  ) => void;
  moveElement: (
    elementId: string,
    position: { x: number; y: number; pageId?: string },
  ) => void;
  rotateElement: (elementId: string, rotation: number) => void;
  resizeElement: (
    elementId: string,
    size: { x: number; y: number; width: number; height: number },
  ) => void;
  reorderElement: (elementId: string, direction: -1 | 1) => void;
  selectElement: (elementId: string | null) => void;
  setTrimPreset: (preset: TrimPreset) => void;
  setBookName: (name: string) => void;
  setBleedEnabled: (enabled: boolean) => void;
  setZoom: (zoom: ZoomLevel) => void;
  setSpreadMode: (mode: SpreadMode) => void;
  changePage: (direction: -1 | 1) => void;
};

const textStyles: TextStyle[] = [
  "paragraph",
  "heading",
  "subheading",
  "body",
  "bullet-list",
  "numbered-list",
  "pull-quote",
  "caption",
  "chapter-title",
];

const defaultText: Record<TextStyle, string> = {
  paragraph: "Start writing your paragraph here...",
  heading: "Add a heading",
  subheading: "Add a subheading",
  body: "Your body text goes here.",
  "bullet-list": "First item\nSecond item",
  "numbered-list": "1. First item\n2. Second item",
  "pull-quote": "Add an inspiring quote",
  caption: "Add a caption",
  "chapter-title": "Chapter title",
};

export const editorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({
  bookId,
  bookTitle,
  initialBookData,
  initialTrimPreset,
  children,
}: {
  bookId: string;
  bookTitle: string;
  initialBookData: unknown;
  initialTrimPreset: TrimPreset;
  children: ReactNode;
}) {
  const initialDocument = isRecord(initialBookData)
    ? {
        ...initialBookData,
        bookName: bookTitle,
        trimPreset: initialTrimPreset,
      }
    : {
        ...defaultDocument,
        bookName: bookTitle,
        trimPreset: initialTrimPreset,
      };
  const [snapshot, setSnapshot] = useState<StorageSnapshot>(() => ({
    ready: true,
    value: JSON.stringify(initialDocument),
    error: null,
  }));
  const parsed = useMemo(() => parseDocument(snapshot), [snapshot]);
  const [pendingSave, setPendingSave] = useState<{
    document: EditorDocument;
    revision: number;
  } | null>(null);
  const documentRef = useRef(parsed.document);
  const serializedDocumentRef = useRef<string | null>(null);
  if (serializedDocumentRef.current === null) {
    serializedDocumentRef.current = JSON.stringify(parsed.document);
  }
  const saveRevisionRef = useRef(0);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const [selectedElementId, selectElement] = useState<string | null>(null);
  const document = parsed.document;
  const saveDocument = useCallback((nextDocument: EditorDocument) => {
    const serializedDocument = JSON.stringify(nextDocument);
    if (serializedDocument === serializedDocumentRef.current) return;
    saveRevisionRef.current += 1;
    documentRef.current = nextDocument;
    serializedDocumentRef.current = serializedDocument;
    setSnapshot({
      ready: false,
      value: serializedDocument,
      error: null,
    });
    setPendingSave({
      document: nextDocument,
      revision: saveRevisionRef.current,
    });
  }, []);
  const updateDocumentState = useCallback((nextDocument: EditorDocument) => {
    const serializedDocument = JSON.stringify(nextDocument);
    documentRef.current = nextDocument;
    serializedDocumentRef.current = serializedDocument;
    setSnapshot((current) => ({
      ...current,
      value: serializedDocument,
    }));
  }, []);
  const getCurrentDocument = useCallback(() => documentRef.current, []);

  useEffect(() => {
    if (!pendingSave) return;

    const timeout = setTimeout(() => {
      saveQueueRef.current = saveQueueRef.current
        .then(async () => {
          if (saveRevisionRef.current !== pendingSave.revision) return;
          const result = await saveBookDataAction(bookId, pendingSave.document);
          if (saveRevisionRef.current !== pendingSave.revision) return;
          if (result.status === "error") {
            setSnapshot((current) => ({
              ...current,
              ready: true,
              error:
                result.message?.description ??
                result.message?.title ??
                "Could not save this book.",
            }));
            return;
          }
          setSnapshot((current) => ({
            ...current,
            ready: true,
            error: null,
          }));
        })
        .catch((error: unknown) => {
          if (saveRevisionRef.current !== pendingSave.revision) return;
          setSnapshot((current) => ({
            ...current,
            ready: true,
            error: errorMessage(error),
          }));
        });
    }, 2500);

    return () => clearTimeout(timeout);
  }, [bookId, pendingSave]);

  const currentPageIndex = Math.max(
    0,
    document.pages.findIndex((page) => page.id === document.currentPageId),
  );
  const currentPage = document.pages[currentPageIndex] ?? document.pages[0];
  const saveError = snapshot.error ?? parsed.error;
  const saveStatus: SaveStatus = saveError
    ? "error"
    : snapshot.ready
      ? "saved"
      : "loading";

  const value = useMemo<EditorContextValue>(
    () => ({
      ...document,
      currentPage,
      currentPageNumber: currentPageIndex + 1,
      selectedElementId,
      saveStatus,
      saveError,
      selectPage: (pageId) => {
        if (document.pages.some((page) => page.id === pageId)) {
          if (pageId !== document.currentPageId) {
            updateDocumentState({ ...document, currentPageId: pageId });
          }
          selectElement(null);
        }
      },
      addBlankPage: () => {
        const page = {
          id: crypto.randomUUID(),
          title: `Page ${document.pages.length + 1}`,
          elements: [],
        };

        saveDocument({
          ...document,
          pages: [...document.pages].toSpliced(currentPageIndex + 1, 0, page),
          currentPageId: page.id,
        });
        selectElement(null);
      },
      clonePage: (pageId) => {
        const pageIndex = document.pages.findIndex(
          (page) => page.id === pageId,
        );
        if (pageIndex === -1) return;

        const sourcePage = document.pages[pageIndex];
        const page: EditorPage = {
          ...sourcePage,
          id: crypto.randomUUID(),
          title: `Copy of ${sourcePage.title}`,
          elements: sourcePage.elements.map((element) => ({
            ...element,
            id: crypto.randomUUID(),
          })),
        };
        const pages = [...document.pages].toSpliced(pageIndex + 1, 0, page);

        saveDocument({ ...document, pages, currentPageId: page.id });
        selectElement(null);
      },
      deletePage: (pageId) => {
        if (document.pages.length === 1) return;

        const pageIndex = document.pages.findIndex(
          (page) => page.id === pageId,
        );
        if (pageIndex === -1) return;

        const pages = document.pages.filter((page) => page.id !== pageId);
        const deletingCurrentPage = document.currentPageId === pageId;
        const currentPageId = deletingCurrentPage
          ? pages[Math.min(pageIndex, pages.length - 1)].id
          : document.currentPageId;

        saveDocument({ ...document, pages, currentPageId });
        if (deletingCurrentPage) selectElement(null);
      },
      addTextElement: (textStyle) => {
        const topLayer = Math.max(
          -1,
          ...currentPage.elements.map((element) => element.zIndex),
        );
        const element: EditorElement = {
          id: crypto.randomUUID(),
          kind: "text",
          textStyle,
          content: defaultText[textStyle],
          fontFamily: textDefaults[textStyle].fontFamily,
          fontSize: textDefaults[textStyle].fontSize,
          color: textDefaults[textStyle].color,
          backgroundColor: null,
          rotation: 0,
          lineSpacing: 6,
          tracking: 0,
          bold: textDefaults[textStyle].bold,
          italic: textDefaults[textStyle].italic,
          alignment: "left",
          lineHeight: 1.45,
          x: 14,
          y: 16 + Math.min(currentPage.elements.length, 5) * 6,
          width:
            textStyle === "heading" || textStyle === "chapter-title" ? 68 : 54,
          height: 12,
          zIndex: topLayer + 1,
        };
        saveDocument({
          ...document,
          pages: updatePageElements(
            document.pages,
            currentPage.id,
            (elements) => [...elements, element],
          ),
        });
        selectElement(element.id);
      },
      addImageElement: (fileId, src, alt) => {
        const topLayer = Math.max(
          -1,
          ...currentPage.elements.map((element) => element.zIndex),
        );
        const element: ImageEditorElement = {
          id: crypto.randomUUID(),
          kind: "image",
          fileId,
          src,
          alt,
          borderColor: "#1e293b",
          borderWidth: 0,
          borderRadius: 0,
          opacity: 100,
          rotation: 0,
          filters: { ...defaultImageFilters },
          x: 14,
          y: 16 + Math.min(currentPage.elements.length, 5) * 6,
          width: 40,
          height: 32,
          zIndex: topLayer + 1,
        };
        saveDocument({
          ...document,
          pages: updatePageElements(
            document.pages,
            currentPage.id,
            (elements) => [...elements, element],
          ),
        });
        selectElement(element.id);
      },
      addColoringPages: (images) => {
        if (images.length < 1 || images.length > 50) {
          throw new Error("Add between 1 and 50 coloring page images.");
        }

        const pages: EditorPage[] = images.map((image, index) => {
          const title = `Coloring page ${index + 1}`;
          const element: ImageEditorElement = {
            id: crypto.randomUUID(),
            kind: "image",
            fileId: image.fileId,
            src: image.src,
            alt: image.alt || title,
            objectFit: "contain",
            borderColor: "#1e293b",
            borderWidth: 0,
            borderRadius: 0,
            opacity: 100,
            rotation: 0,
            filters: {
              ...defaultImageFilters,
              brightness: 120,
              contrast: 180,
              grayscale: 100,
            },
            x: 8,
            y: 8,
            width: 84,
            height: 84,
            zIndex: 0,
          };

          return {
            id: crypto.randomUUID(),
            title,
            elements: [element],
          };
        });

        saveDocument({
          ...document,
          pages: [...document.pages, ...pages],
          currentPageId: pages[0].id,
        });
        selectElement(null);
      },
      addShapeElement: (shapeType) => {
        const topLayer = Math.max(
          -1,
          ...currentPage.elements.map((element) => element.zIndex),
        );
        const isRegularShape = [
          "circle",
          "triangle",
          "star",
          "pentagon",
        ].includes(shapeType);
        const isLine = shapeType === "line";
        const element: ShapeEditorElement = {
          id: crypto.randomUUID(),
          kind: "shape",
          shapeType,
          lineStyle: "thin",
          lineCap: "round",
          fillColor: "#dce6d8",
          outlineColor: null,
          outlineWidth: isLine ? 1 : 2,
          rotation: 0,
          cornerRadius: 0,
          starPoints: 5,
          pentagonSides: 5,
          x: 14,
          y: 16 + Math.min(currentPage.elements.length, 5) * 6,
          width: isRegularShape ? 28 : 52,
          height: isRegularShape ? 28 : isLine ? 10 : 26,
          zIndex: topLayer + 1,
        };
        saveDocument({
          ...document,
          pages: updatePageElements(
            document.pages,
            currentPage.id,
            (elements) => [...elements, element],
          ),
        });
        selectElement(element.id);
      },
      addArtworkElement: (artKey) => {
        const topLayer = Math.max(
          -1,
          ...currentPage.elements.map((element) => element.zIndex),
        );
        const element: EditorElement = {
          id: crypto.randomUUID(),
          kind: "artwork",
          artKey,
          strokeColor: "#1e293b",
          strokeWidth: 1.8,
          rotation: 0,
          x: 14,
          y: 16 + Math.min(currentPage.elements.length, 5) * 6,
          width: 30,
          height: 30,
          zIndex: topLayer + 1,
        };
        saveDocument({
          ...document,
          pages: updatePageElements(
            document.pages,
            currentPage.id,
            (elements) => [...elements, element],
          ),
        });
        selectElement(element.id);
      },
      setBookDesign: (design) =>
        saveDocument({ ...document, design }),
      addDesignTextElement: () => {
        const textStyle: TextStyle = "body";
        const defaults = textDefaults[textStyle];
        const element: TextEditorElement = {
          id: crypto.randomUUID(),
          kind: "text",
          textStyle,
          content: "Your repeated text",
          fontFamily: defaults.fontFamily,
          fontSize: defaults.fontSize,
          color: defaults.color,
          backgroundColor: null,
          rotation: 0,
          lineSpacing: 6,
          tracking: 0,
          bold: defaults.bold,
          italic: defaults.italic,
          alignment: "left",
          lineHeight: 1.45,
          x: 8,
          y: 8,
          width: 34,
          height: 10,
          zIndex:
            Math.max(-1, ...document.design.elements.map((item) => item.zIndex)) +
            1,
        };
        saveDocument({
          ...document,
          design: {
            ...document.design,
            elements: [...document.design.elements, element],
          },
        });
        return element.id;
      },
      addDesignShapeElement: (shapeType) => {
        if (!SHAPE_TYPES.includes(shapeType)) {
          throw new Error("Choose a supported shape.");
        }
        const isLine = shapeType === "line";
        const element: ShapeEditorElement = {
          id: crypto.randomUUID(),
          kind: "shape",
          shapeType,
          lineStyle: "thin",
          lineCap: "round",
          fillColor: "#dce6d8",
          outlineColor: null,
          outlineWidth: isLine ? 1 : 2,
          rotation: 0,
          cornerRadius: 0,
          starPoints: 5,
          pentagonSides: 5,
          x: 8,
          y: 8,
          width: 22,
          height: isLine ? 8 : 22,
          zIndex:
            Math.max(-1, ...document.design.elements.map((item) => item.zIndex)) +
            1,
        };
        saveDocument({
          ...document,
          design: {
            ...document.design,
            elements: [...document.design.elements, element],
          },
        });
        return element.id;
      },
      addDesignArtworkElement: (artKey) => {
        if (!ART_LIBRARY.some((artwork) => artwork.key === artKey)) {
          throw new Error("Choose a supported artwork.");
        }
        const element: ArtworkEditorElement = {
          id: crypto.randomUUID(),
          kind: "artwork",
          artKey,
          strokeColor: "#1e293b",
          strokeWidth: 1.8,
          rotation: 0,
          x: 8,
          y: 8,
          width: 22,
          height: 22,
          zIndex:
            Math.max(-1, ...document.design.elements.map((item) => item.zIndex)) +
            1,
        };
        saveDocument({
          ...document,
          design: {
            ...document.design,
            elements: [...document.design.elements, element],
          },
        });
        return element.id;
      },
      updateDesignElement: (elementId, updatedElement) => {
        saveDocument({
          ...document,
          design: {
            ...document.design,
            elements: document.design.elements.map((element) =>
              element.id === elementId ? updatedElement : element,
            ),
          },
        });
      },
      deleteDesignElement: (elementId) => {
        saveDocument({
          ...document,
          design: {
            ...document.design,
            elements: document.design.elements.filter(
              (element) => element.id !== elementId,
            ),
          },
        });
      },
      addSudokuPages: async (squares, difficulty, pageCount) => {
        if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > 50) {
          throw new Error("Sudoku page count must be between 1 and 50.");
        }

        const generated = await generateSudokus(squares, difficulty, pageCount);
        const latestDocument = getCurrentDocument();
        const pages = generated.map((data, index) => {
          const element: SudokuEditorElement = {
            id: crypto.randomUUID(),
            kind: "sudoku",
            squares,
            difficulty,
            ...data,
            color: "#2b4736",
            numberSize: defaultSudokuNumberSize(squares),
            isSolution: false,
            x: 14,
            y: 12,
            width: 72,
            height: 68,
            zIndex: 0,
          };
          return {
            id: crypto.randomUUID(),
            title: `Sudoku ${index + 1}`,
            elements: [element],
          };
        });
        const nextPages = [...latestDocument.pages, ...pages];

        saveDocument({
          ...latestDocument,
          pages: nextPages,
          currentPageId: pages[0].id,
        });
        selectElement(null);
      },
      addWordSearchPages: async (settings) => {
        const { cols, rows, dictionary, maxWords, pageCount, dictionaryName } =
          settings;
        if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > 50) {
          throw new Error("Word Search page count must be between 1 and 50.");
        }

        const generated = await generateWordSearches({
          cols,
          rows,
          dictionary,
          maxWords,
          pageCount,
        });
        const latestDocument = getCurrentDocument();
        const pages = generated.map((data, index) => {
          const element: WordSearchEditorElement = {
            id: crypto.randomUUID(),
            kind: "word-search",
            puzzleId: crypto.randomUUID(),
            rows,
            cols,
            grid: data.grid,
            words: data.words,
            dictionaryName,
            color: "#2b4736",
            letterSize: Math.max(5, Math.min(18, 180 / Math.max(rows, cols))),
            lineWeight: 1.5,
            isSolution: false,
            x: 12,
            y: 12,
            width: 76,
            height: 72,
            zIndex: 0,
          };
          const wordList: WordSearchWordsEditorElement = {
            id: crypto.randomUUID(),
            kind: "word-search-words",
            puzzleId: element.puzzleId,
            words: data.words,
            color: element.color,
            fontFamily: "sans",
            fontSize: 12,
            spacing: 0,
            lineSpacing: 4,
            isSolution: false,
            x: 12,
            y: 84,
            width: 76,
            height: 11,
            zIndex: 1,
          };
          return {
            id: crypto.randomUUID(),
            title: `Word Search ${index + 1}`,
            elements: [element, wordList],
          };
        });
        saveDocument({
          ...latestDocument,
          pages: [...latestDocument.pages, ...pages],
          currentPageId: pages[0].id,
        });
        selectElement(null);
      },
      addMazePages: async (settings) => {
        const { rows, cols, difficulty, pageCount } = settings;
        if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > 50) {
          throw new Error("Maze page count must be between 1 and 50.");
        }

        const generated = await generateMazes(settings);
        const latestDocument = getCurrentDocument();
        const pages = generated.map((data, index) => {
          const element: MazeEditorElement = {
            id: crypto.randomUUID(),
            kind: "maze",
            rows,
            cols,
            cells: data.cells,
            solutionPath: data.solutionPath,
            difficulty,
            lineWeight: 1.5,
            isSolution: false,
            x: 12,
            y: 10,
            width: 76,
            height: 80,
            zIndex: 0,
          };
          return {
            id: crypto.randomUUID(),
            title: `Maze ${index + 1}`,
            elements: [element],
          };
        });
        saveDocument({
          ...latestDocument,
          pages: [...latestDocument.pages, ...pages],
          currentPageId: pages[0].id,
        });
        selectElement(null);
      },
      generatePuzzleSolutions: () => {
        const puzzles = document.pages.flatMap((page) =>
          page.pageType === "sudoku-solutions" ||
          page.pageType === "puzzle-solutions"
            ? []
            : page.elements.filter(
                (
                  element,
                ): element is
                  | SudokuEditorElement
                  | WordSearchEditorElement
                  | MazeEditorElement =>
                  (element.kind === "sudoku" ||
                    element.kind === "word-search" ||
                    element.kind === "maze") &&
                  !element.isSolution,
              ),
        );
        if (puzzles.length === 0) return;

        const sudokuPuzzles = puzzles.filter(
          (element): element is SudokuEditorElement =>
            element.kind === "sudoku",
        );
        const sudokuSolutions = sudokuPuzzles.map((element, index) => ({
          ...element,
          id: crypto.randomUUID(),
          puzzle: [...element.solution],
          hiddenSquares: 0,
          isSolution: true,
          solutionNumber: index + 1,
          x: 7 + (index % 2) * 46,
          y: 7 + (Math.floor(index / 2) % 2) * 46,
          width: 40,
          height: 40,
          zIndex: 0,
        }));
        const mazePuzzles = puzzles.filter(
          (element): element is MazeEditorElement => element.kind === "maze",
        );
        const mazeSolutions = mazePuzzles.map((element, index) => ({
          ...element,
          id: crypto.randomUUID(),
          isSolution: true,
          solutionNumber: index + 1,
          x: 7 + (index % 2) * 46,
          y: 7 + (Math.floor(index / 2) % 2) * 46,
          width: 40,
          height: 40,
          zIndex: 0,
        }));
        const sharedSolutions = [...sudokuSolutions, ...mazeSolutions];
        const puzzleSolutionPages = Array.from(
          { length: Math.ceil(sharedSolutions.length / 4) },
          (_, pageIndex) => ({
            id: crypto.randomUUID(),
            title: `Puzzle solutions ${pageIndex + 1}`,
            pageType: "puzzle-solutions" as const,
            elements: sharedSolutions.slice(pageIndex * 4, pageIndex * 4 + 4),
          }),
        );
        const wordSearchPuzzles = puzzles.filter(
          (element): element is WordSearchEditorElement =>
            element.kind === "word-search",
        );
        const wordSearchSolutionPages = wordSearchPuzzles.map(
          (element, index) => {
            const solutionPuzzleId = crypto.randomUUID();
            const sourceWordList = document.pages
              .flatMap((page) => page.elements)
              .find(
                (candidate): candidate is WordSearchWordsEditorElement =>
                  candidate.kind === "word-search-words" &&
                  candidate.puzzleId === element.puzzleId,
              );
            const solutionGrid: WordSearchEditorElement = {
              ...element,
              id: crypto.randomUUID(),
              puzzleId: solutionPuzzleId,
              words: withWordSearchSolutionColors(element.words),
              isSolution: true,
              solutionNumber: index + 1,
              x: 12,
              y: 8,
              width: 76,
              height: 68,
              zIndex: 0,
            };
            const solutionWords: WordSearchWordsEditorElement = {
              id: crypto.randomUUID(),
              kind: "word-search-words",
              puzzleId: solutionPuzzleId,
              words: solutionGrid.words,
              color: element.color,
              fontFamily: sourceWordList?.fontFamily ?? "sans",
              fontSize: sourceWordList?.fontSize ?? 12,
              spacing: sourceWordList?.spacing ?? 0,
              lineSpacing: sourceWordList?.lineSpacing ?? 4,
              isSolution: true,
              x: 12,
              y: 78,
              width: 76,
              height: 16,
              zIndex: 1,
            };
            return {
              id: crypto.randomUUID(),
              title: `Word Search solution ${index + 1}`,
              pageType: "puzzle-solutions" as const,
              elements: [solutionGrid, solutionWords],
            };
          },
        );
        const solutionPages = [
          ...puzzleSolutionPages,
          ...wordSearchSolutionPages,
        ];
        const pages = [
          ...document.pages.filter(
            (page) =>
              page.pageType !== "sudoku-solutions" &&
              page.pageType !== "puzzle-solutions",
          ),
          ...solutionPages,
        ];

        saveDocument({
          ...document,
          pages,
          currentPageId: solutionPages[0].id,
        });
        selectElement(null);
      },
      deleteElement: (elementId) => {
        if (
          !document.pages.some((page) =>
            page.elements.some((element) => element.id === elementId),
          )
        )
          return;
        saveDocument({
          ...document,
          pages: updateElementPage(document.pages, elementId, (elements) =>
            elements.filter((element) => element.id !== elementId),
          ),
        });
        if (selectedElementId === elementId) selectElement(null);
      },
      updateTextContent: (elementId, content) => {
        const currentDocument = getCurrentDocument();
        saveDocument({
          ...currentDocument,
          pages: updateElementPage(
            currentDocument.pages,
            elementId,
            (elements) =>
              elements.map((element) =>
                element.id === elementId && element.kind === "text"
                  ? { ...element, content }
                  : element,
              ),
          ),
        });
      },
      updateShapeElement: (elementId, updates) => {
        saveDocument({
          ...document,
          pages: updateElementPage(document.pages, elementId, (elements) =>
            elements.map((element) => {
              if (element.id !== elementId || element.kind !== "shape")
                return element;
              const updated = { ...element, ...updates };
              return {
                ...updated,
                width: Math.max(0.1, updated.width),
                height: Math.max(0.1, updated.height),
                rotation: clamp(updated.rotation, -180, 180),
                outlineWidth: clamp(updated.outlineWidth, 0, 20),
                cornerRadius: clamp(updated.cornerRadius, 0, 50),
                starPoints: Math.round(clamp(updated.starPoints, 3, 24)),
                pentagonSides: Math.round(clamp(updated.pentagonSides, 3, 12)),
              };
            }),
          ),
        });
      },
      updateArtworkElement: (elementId, updates) => {
        saveDocument({
          ...document,
          pages: updateElementPage(document.pages, elementId, (elements) =>
            elements.map((element) => {
              if (element.id !== elementId || element.kind !== "artwork")
                return element;
              const updated = { ...element, ...updates };
              return {
                ...updated,
                width: Math.max(0.1, updated.width),
                height: Math.max(0.1, updated.height),
                strokeWidth: clamp(updated.strokeWidth, 0, 20),
                rotation: clamp(updated.rotation, -180, 180),
              };
            }),
          ),
        });
      },
      updateImageElement: (elementId, updates) => {
        saveDocument({
          ...document,
          pages: updateElementPage(document.pages, elementId, (elements) =>
            elements.map((element) => {
              if (element.id !== elementId || element.kind !== "image")
                return element;
              const updated = { ...element, ...updates };
              return {
                ...updated,
                width: Math.max(0.1, updated.width),
                height: Math.max(0.1, updated.height),
                borderColor: isHexColor(updated.borderColor)
                  ? updated.borderColor
                  : "#1e293b",
                borderWidth: clamp(updated.borderWidth, 0, 20),
                borderRadius: clamp(updated.borderRadius, 0, 100),
                opacity: clamp(updated.opacity, 0, 100),
                rotation: clamp(updated.rotation, -180, 180),
                filters: normalizeImageFilters(updated.filters),
              };
            }),
          ),
        });
      },
      updateSudokuElement: (elementId, updates) => {
        saveDocument({
          ...document,
          pages: updateElementPage(document.pages, elementId, (elements) =>
            elements.map((element) => {
              if (element.id !== elementId || element.kind !== "sudoku")
                return element;
              const updated = { ...element, ...updates };
              return {
                ...updated,
                x: clamp(updated.x, 0, 100),
                y: clamp(updated.y, 0, 100),
                width: Math.max(0.1, updated.width),
                height: Math.max(0.1, updated.height),
                color: isHexColor(updated.color) ? updated.color : "#2b4736",
                numberSize: clamp(updated.numberSize, 4, 48),
              };
            }),
          ),
        });
      },
      updateWordSearchGridElement: (elementId, updates) => {
        saveDocument({
          ...document,
          pages: updateElementPage(document.pages, elementId, (elements) =>
            elements.map((element) => {
              if (element.id !== elementId || element.kind !== "word-search")
                return element;
              return {
                ...element,
                letterSize: clamp(
                  updates.letterSize ?? element.letterSize,
                  4,
                  48,
                ),
                lineWeight: clamp(
                  updates.lineWeight ?? element.lineWeight,
                  0.5,
                  8,
                ),
              };
            }),
          ),
        });
      },
      updateWordSearchWordsElement: (elementId, updates) => {
        saveDocument({
          ...document,
          pages: updateElementPage(document.pages, elementId, (elements) =>
            elements.map((element) => {
              if (
                element.id !== elementId ||
                element.kind !== "word-search-words"
              ) {
                return element;
              }
              return {
                ...element,
                ...updates,
                fontSize: clamp(updates.fontSize ?? element.fontSize, 4, 72),
                spacing: clamp(updates.spacing ?? element.spacing, -2, 12),
                lineSpacing: clamp(
                  updates.lineSpacing ?? element.lineSpacing,
                  0,
                  24,
                ),
              };
            }),
          ),
        });
      },
      updateMazeElement: (elementId, updates) => {
        saveDocument({
          ...document,
          pages: updateElementPage(document.pages, elementId, (elements) =>
            elements.map((element) =>
              element.id === elementId && element.kind === "maze"
                ? {
                    ...element,
                    x: clamp(updates.x ?? element.x, 0, 100),
                    y: clamp(updates.y ?? element.y, 0, 100),
                    width: Math.max(0.1, updates.width ?? element.width),
                    height: Math.max(0.1, updates.height ?? element.height),
                    lineWeight: clamp(
                      updates.lineWeight ?? element.lineWeight,
                      0.5,
                      8,
                    ),
                  }
                : element,
            ),
          ),
        });
      },
      setSudokuDifficulty: (elementId, difficulty) => {
        const element = document.pages
          .flatMap((page) => page.elements)
          .find(
            (candidate): candidate is SudokuEditorElement =>
              candidate.id === elementId && candidate.kind === "sudoku",
          );
        if (!element || element.difficulty === difficulty) return;
        const data = updateSudokuDifficulty(
          element.puzzle,
          element.solution,
          difficulty,
        );
        saveDocument({
          ...document,
          pages: updateElementPage(document.pages, elementId, (elements) =>
            elements.map((candidate) =>
              candidate.id === elementId && candidate.kind === "sudoku"
                ? {
                    ...candidate,
                    difficulty,
                    ...data,
                    puzzle: candidate.isSolution
                      ? [...candidate.solution]
                      : data.puzzle,
                    hiddenSquares: candidate.isSolution
                      ? 0
                      : data.hiddenSquares,
                  }
                : candidate,
            ),
          ),
        });
      },
      updateTextElement: (elementId, updates) => {
        saveDocument({
          ...document,
          pages: updateElementPage(document.pages, elementId, (elements) =>
            elements.map((element) =>
              element.id === elementId && element.kind === "text"
                ? { ...element, ...updates }
                : element,
            ),
          ),
        });
      },
      moveElement: (elementId, position) => {
        const currentDocument = getCurrentDocument();
        saveDocument({
          ...currentDocument,
          pages: moveElementBetweenPages(
            currentDocument.pages,
            elementId,
            position,
          ),
        });
      },
      rotateElement: (elementId, rotation) => {
        saveDocument({
          ...document,
          pages: updateElementPage(document.pages, elementId, (elements) =>
            elements.map((element) =>
              element.id === elementId && "rotation" in element
                ? { ...element, rotation: clamp(rotation, -180, 180) }
                : element,
            ),
          ),
        });
      },
      resizeElement: (elementId, size) => {
        saveDocument({
          ...document,
          pages: updateElementPage(document.pages, elementId, (elements) =>
            elements.map((element) => {
              if (element.id !== elementId) return element;
              return {
                ...element,
                x: size.x,
                y: size.y,
                width: Math.max(0.1, size.width),
                height: Math.max(0.1, size.height),
              };
            }),
          ),
        });
      },
      reorderElement: (elementId, direction) => {
        saveDocument({
          ...document,
          pages: updateElementPage(document.pages, elementId, (elements) =>
            reorderElements(elements, elementId, direction),
          ),
        });
      },
      selectElement,
      setBookName: (bookName) => saveDocument({ ...document, bookName }),
      setTrimPreset: (trimPreset) => saveDocument({ ...document, trimPreset }),
      setBleedEnabled: (bleedEnabled) =>
        saveDocument({ ...document, bleedEnabled }),
      setZoom: (zoom) => saveDocument({ ...document, zoom }),
      setSpreadMode: (spreadMode) => saveDocument({ ...document, spreadMode }),
      changePage: (direction) => {
        const nextIndex = Math.min(
          document.pages.length - 1,
          Math.max(0, currentPageIndex + direction),
        );
        const nextPageId = document.pages[nextIndex].id;
        if (nextPageId !== document.currentPageId) {
          updateDocumentState({ ...document, currentPageId: nextPageId });
        }
        selectElement(null);
      },
    }),
    [
      currentPage,
      currentPageIndex,
      document,
      saveError,
      saveStatus,
      selectedElementId,
      getCurrentDocument,
      updateDocumentState,
      saveDocument,
    ],
  );

  return (
    <editorContext.Provider value={value}>{children}</editorContext.Provider>
  );
}

function isLineCapStyle(value: unknown): value is LineCapStyle {
  return value === "round" || value === "square";
}

export function useEditorContext() {
  const context = useContext(editorContext);
  if (!context)
    throw new Error("useEditorContext must be used within an EditorProvider.");
  return context;
}

function parseDocument(snapshot: StorageSnapshot) {
  if (snapshot.value === null) {
    return { document: defaultDocument, error: null };
  }
  try {
    const value: unknown = JSON.parse(snapshot.value);
    const document = normalizeDocument(value);
    if (!document)
      throw new Error("The saved book data has an invalid format.");
    return { document, error: null };
  } catch (error) {
    return {
      document: defaultDocument,
      error: `Could not read saved book data: ${errorMessage(error)}`,
    };
  }
}

function normalizeDocument(value: unknown): EditorDocument | null {
  if (
    !isRecord(value) ||
    !Array.isArray(value.pages) ||
    value.pages.length === 0
  )
    return null;

  const pages: EditorPage[] = [];
  for (const [pageIndex, pageValue] of value.pages.entries()) {
    if (
      !isRecord(pageValue) ||
      typeof pageValue.id !== "string" ||
      !Array.isArray(pageValue.elements)
    ) {
      return null;
    }
    const elements: EditorElement[] = [];
    for (const [elementIndex, elementValue] of pageValue.elements.entries()) {
      const element = normalizeElement(elementValue, elementIndex);
      if (!element) return null;
      elements.push(element);
    }
    const wordSearchGrids = elements.filter(
      (element): element is WordSearchEditorElement =>
        element.kind === "word-search",
    );
    for (const grid of wordSearchGrids) {
      if (
        elements.some(
          (element) =>
            element.kind === "word-search-words" &&
            element.puzzleId === grid.puzzleId,
        )
      ) {
        continue;
      }
      elements.push({
        id: crypto.randomUUID(),
        kind: "word-search-words",
        puzzleId: grid.puzzleId,
        words: grid.words,
        color: grid.color,
        fontFamily: "sans",
        fontSize: 12,
        spacing: 0,
        lineSpacing: 4,
        isSolution: grid.isSolution,
        ...(grid.solutionNumber ? { solutionNumber: grid.solutionNumber } : {}),
        x: grid.x,
        y: Math.min(88, grid.y + grid.height + 2),
        width: grid.width,
        height: Math.max(8, Math.min(16, grid.height * 0.2)),
        zIndex: grid.zIndex + 1,
      });
    }
    pages.push({
      id: pageValue.id,
      title:
        typeof pageValue.title === "string"
          ? pageValue.title
          : `Page ${pageIndex + 1}`,
      ...(pageValue.pageType === "sudoku-solutions" ||
      pageValue.pageType === "puzzle-solutions"
        ? { pageType: pageValue.pageType }
        : {}),
      ...(isAiBookPlanPageType(pageValue.aiPageType)
        ? { aiPageType: pageValue.aiPageType }
        : {}),
      ...(typeof pageValue.aiPageDescription === "string"
        ? { aiPageDescription: pageValue.aiPageDescription }
        : {}),
      elements,
    });
  }

  const document: EditorDocument = {
    bookName:
      typeof value.bookName === "string" && value.bookName.trim()
        ? value.bookName
        : defaultDocument.bookName,
    pages,
    currentPageId:
      typeof value.currentPageId === "string" &&
      pages.some((page) => page.id === value.currentPageId)
        ? value.currentPageId
        : pages[0].id,
    trimPreset:
      value.trimPreset === "paperback" || value.trimPreset === "square"
        ? value.trimPreset
        : "letter",
    bleedEnabled: value.bleedEnabled === true,
    zoom:
      value.zoom === "50%" || value.zoom === "75%" || value.zoom === "100%"
        ? value.zoom
        : "Fit",
    spreadMode: value.spreadMode === "spread" ? "spread" : "single",
    design: normalizeBookDesign(value.design, pages),
  };
  return isEditorDocument(document) ? document : null;
}

function normalizeBookDesign(
  value: unknown,
  pages: EditorPage[],
): BookDesignSettings {
  const design = isRecord(value) ? value : {};
  const pageNumbers = isRecord(design.pageNumbers) ? design.pageNumbers : {};
  const pageBorder = isRecord(design.pageBorder) ? design.pageBorder : {};
  const pageIds = new Set(pages.map((page) => page.id));
  const elementIds = new Set(
    pages.flatMap((page) => page.elements.map((element) => element.id)),
  );
  const elements: RepeatingDesignElement[] = [];

  if (Array.isArray(design.elements)) {
    for (const [index, elementValue] of design.elements.entries()) {
      const element = normalizeElement(elementValue, index);
      if (
        element &&
        (element.kind === "text" ||
          element.kind === "shape" ||
          element.kind === "artwork") &&
        !elementIds.has(element.id)
      ) {
        elementIds.add(element.id);
        elements.push(element);
      }
    }
  }

  return {
    pageNumbers: {
      enabled: pageNumbers.enabled === true,
      format:
        pageNumbers.format === "roman-lower" ||
        pageNumbers.format === "roman-upper"
          ? pageNumbers.format
          : "arabic",
      position: isPageNumberPosition(pageNumbers.position)
        ? pageNumbers.position
        : defaultBookDesign.pageNumbers.position,
      fontFamily: isTextFontFamily(pageNumbers.fontFamily)
        ? pageNumbers.fontFamily
        : defaultBookDesign.pageNumbers.fontFamily,
      fontSize: isFiniteNumber(pageNumbers.fontSize)
        ? clamp(pageNumbers.fontSize, 6, 48)
        : defaultBookDesign.pageNumbers.fontSize,
      color: isHexColor(pageNumbers.color)
        ? pageNumbers.color
        : defaultBookDesign.pageNumbers.color,
    },
    pageBorder: {
      enabled: pageBorder.enabled === true,
      style: isPageBorderStyle(pageBorder.style)
        ? pageBorder.style
        : defaultBookDesign.pageBorder.style,
      inset: isFiniteNumber(pageBorder.inset)
        ? clamp(pageBorder.inset, 1, 15)
        : defaultBookDesign.pageBorder.inset,
      width: isFiniteNumber(pageBorder.width)
        ? clamp(pageBorder.width, 1, 8)
        : defaultBookDesign.pageBorder.width,
      color: isHexColor(pageBorder.color)
        ? pageBorder.color
        : defaultBookDesign.pageBorder.color,
    },
    excludedPageIds: Array.isArray(design.excludedPageIds)
      ? design.excludedPageIds.filter(
          (pageId): pageId is string =>
            typeof pageId === "string" && pageIds.has(pageId),
        )
      : [],
    elements,
  };
}

function normalizeElement(value: unknown, index: number): EditorElement | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !isFiniteNumber(value.x) ||
    !isFiniteNumber(value.y) ||
    !isFiniteNumber(value.width) ||
    !isFiniteNumber(value.height)
  ) {
    return null;
  }

  const position = {
    id: value.id,
    x: value.x,
    y: value.y,
    width: Math.max(0.1, value.width),
    height: Math.max(0.1, value.height),
    zIndex: isFiniteNumber(value.zIndex) ? value.zIndex : index,
  };

  if (value.kind === "text") {
    if (
      typeof value.content !== "string" ||
      typeof value.textStyle !== "string" ||
      !textStyles.includes(value.textStyle as TextStyle)
    ) {
      return null;
    }
    const textStyle = value.textStyle as TextStyle;
    const defaults = textDefaults[textStyle];
    return {
      ...position,
      kind: "text",
      textStyle,
      content: value.content,
      fontFamily: isTextFontFamily(value.fontFamily)
        ? value.fontFamily
        : defaults.fontFamily,
      fontSize: isFiniteNumber(value.fontSize)
        ? clamp(value.fontSize, 6, 96)
        : defaults.fontSize,
      color: typeof value.color === "string" ? value.color : defaults.color,
      backgroundColor:
        typeof value.backgroundColor === "string"
          ? value.backgroundColor
          : null,
      rotation: isFiniteNumber(value.rotation)
        ? clamp(value.rotation, -180, 180)
        : 0,
      lineSpacing: isFiniteNumber(value.lineSpacing)
        ? clamp(value.lineSpacing, 0, 24)
        : 6,
      tracking: isFiniteNumber(value.tracking)
        ? clamp(value.tracking, -2, 12)
        : 0,
      bold: typeof value.bold === "boolean" ? value.bold : defaults.bold,
      italic:
        typeof value.italic === "boolean" ? value.italic : defaults.italic,
      alignment: isTextAlignment(value.alignment) ? value.alignment : "left",
      lineHeight: isFiniteNumber(value.lineHeight)
        ? clamp(value.lineHeight, 1, 2)
        : 1.45,
    };
  }
  if (
    value.kind === "image" &&
    typeof value.fileId === "string" &&
    typeof value.src === "string" &&
    typeof value.alt === "string"
  ) {
    return {
      ...position,
      kind: "image",
      fileId: value.fileId,
      src: value.src,
      alt: value.alt,
      objectFit: value.objectFit === "contain" ? "contain" : "cover",
      width: Math.max(0.1, value.width),
      height: Math.max(0.1, value.height),
      borderColor: isHexColor(value.borderColor)
        ? value.borderColor
        : "#1e293b",
      borderWidth: isFiniteNumber(value.borderWidth)
        ? clamp(value.borderWidth, 0, 20)
        : 0,
      borderRadius: isFiniteNumber(value.borderRadius)
        ? clamp(value.borderRadius, 0, 100)
        : 0,
      opacity: isFiniteNumber(value.opacity)
        ? clamp(value.opacity, 0, 100)
        : 100,
      rotation: isFiniteNumber(value.rotation)
        ? clamp(value.rotation, -180, 180)
        : 0,
      filters: normalizeImageFilters(value.filters),
    };
  }
  if (value.kind === "puzzle" && typeof value.puzzleType === "string") {
    return { ...position, kind: "puzzle", puzzleType: value.puzzleType };
  }
  if (value.kind === "sudoku") {
    const squares = value.squares;
    const solutionNumber = value.solutionNumber;
    if (squares !== 2 && squares !== 3 && squares !== 4 && squares !== 5) {
      return null;
    }
    const sideLength = squares * squares;
    const boardLength = sideLength * sideLength;
    if (
      !isSudokuDifficulty(value.difficulty) ||
      !isSudokuBoard(value.puzzle, boardLength, true) ||
      !isSudokuBoard(value.solution, boardLength, false)
    ) {
      return null;
    }
    return {
      ...position,
      kind: "sudoku",
      squares,
      difficulty: value.difficulty,
      puzzle: value.puzzle,
      solution: value.solution,
      hiddenSquares: value.puzzle.filter((cell) => cell === -1).length,
      color: isHexColor(value.color) ? value.color : "#2b4736",
      numberSize: isFiniteNumber(value.numberSize)
        ? clamp(value.numberSize, 4, 48)
        : defaultSudokuNumberSize(squares),
      isSolution: value.isSolution === true,
      ...(typeof solutionNumber === "number" &&
      Number.isInteger(solutionNumber) &&
      solutionNumber > 0
        ? { solutionNumber }
        : {}),
    };
  }
  if (value.kind === "word-search") {
    const rows = value.rows;
    const cols = value.cols;
    const solutionNumber = value.solutionNumber;
    if (
      !isGridDimension(rows) ||
      !isGridDimension(cols) ||
      !isWordSearchGrid(value.grid, rows, cols) ||
      !isWordSearchPlacements(value.words, rows, cols) ||
      typeof value.dictionaryName !== "string" ||
      !value.dictionaryName.trim()
    ) {
      return null;
    }
    return {
      ...position,
      kind: "word-search",
      puzzleId:
        typeof value.puzzleId === "string" && value.puzzleId.length > 0
          ? value.puzzleId
          : `word-search-${value.id}`,
      rows,
      cols,
      grid: value.grid,
      words: value.words,
      dictionaryName: value.dictionaryName,
      color: isHexColor(value.color) ? value.color : "#2b4736",
      letterSize: isFiniteNumber(value.letterSize)
        ? clamp(value.letterSize, 4, 48)
        : Math.max(5, Math.min(18, 180 / Math.max(rows, cols))),
      lineWeight: isFiniteNumber(value.lineWeight)
        ? clamp(value.lineWeight, 0.5, 8)
        : 1.5,
      isSolution: value.isSolution === true,
      ...(typeof solutionNumber === "number" &&
      Number.isInteger(solutionNumber) &&
      solutionNumber > 0
        ? { solutionNumber }
        : {}),
    };
  }
  if (value.kind === "word-search-words") {
    const solutionNumber = value.solutionNumber;
    if (
      typeof value.puzzleId !== "string" ||
      !value.puzzleId ||
      !isWordSearchPlacements(value.words, 30, 30)
    ) {
      return null;
    }
    return {
      ...position,
      kind: "word-search-words",
      puzzleId: value.puzzleId,
      words: value.words,
      color: isHexColor(value.color) ? value.color : "#2b4736",
      fontFamily: isTextFontFamily(value.fontFamily)
        ? value.fontFamily
        : "sans",
      fontSize: isFiniteNumber(value.fontSize)
        ? clamp(value.fontSize, 4, 72)
        : 12,
      spacing: isFiniteNumber(value.spacing) ? clamp(value.spacing, -2, 12) : 0,
      lineSpacing: isFiniteNumber(value.lineSpacing)
        ? clamp(value.lineSpacing, 0, 24)
        : 4,
      isSolution: value.isSolution === true,
      ...(typeof solutionNumber === "number" &&
      Number.isInteger(solutionNumber) &&
      solutionNumber > 0
        ? { solutionNumber }
        : {}),
    };
  }
  if (value.kind === "maze") {
    const rows = value.rows;
    const cols = value.cols;
    const solutionNumber = value.solutionNumber;
    if (
      !isMazeDimension(rows) ||
      !isMazeDimension(cols) ||
      !isMazeCells(value.cells, rows, cols) ||
      !isMazePath(value.solutionPath, value.cells, rows, cols) ||
      !isMazeDifficulty(value.difficulty)
    ) {
      return null;
    }
    return {
      ...position,
      kind: "maze",
      rows,
      cols,
      cells: value.cells,
      solutionPath: value.solutionPath,
      difficulty: value.difficulty,
      lineWeight: isFiniteNumber(value.lineWeight)
        ? clamp(value.lineWeight, 0.5, 8)
        : 1.5,
      isSolution: value.isSolution === true,
      ...(typeof solutionNumber === "number" &&
      Number.isInteger(solutionNumber) &&
      solutionNumber > 0
        ? { solutionNumber }
        : {}),
    };
  }
  if (value.kind === "artwork" && isArtKey(value.artKey)) {
    return {
      ...position,
      kind: "artwork",
      artKey: value.artKey,
      strokeColor: isHexColor(value.strokeColor)
        ? value.strokeColor
        : "#1e293b",
      strokeWidth: isFiniteNumber(value.strokeWidth)
        ? clamp(value.strokeWidth, 0, 20)
        : 1.8,
      rotation: isFiniteNumber(value.rotation)
        ? clamp(value.rotation, -180, 180)
        : 0,
    };
  }
  if (value.kind === "shape") {
    const shapeType = normalizeShapeType(value.shapeType);
    if (!shapeType) return null;
    const wasRoundedRectangle =
      typeof value.shapeType === "string" &&
      value.shapeType.toLowerCase().replaceAll(" ", "-") ===
        "rounded-rectangle";
    return {
      ...position,
      kind: "shape",
      shapeType,
      lineStyle: isLineStyle(value.lineStyle) ? value.lineStyle : "thin",
      lineCap: isLineCapStyle(value.lineCap) ? value.lineCap : "round",
      width: Math.max(0.1, value.width),
      height: Math.max(0.1, value.height),
      fillColor: isHexColor(value.fillColor) ? value.fillColor : "#dce6d8",
      outlineColor:
        value.outlineColor === null
          ? null
          : isHexColor(value.outlineColor)
            ? value.outlineColor
            : null,
      outlineWidth: isFiniteNumber(value.outlineWidth)
        ? clamp(value.outlineWidth, 0, 20)
        : 2,
      rotation: isFiniteNumber(value.rotation)
        ? clamp(value.rotation, -180, 180)
        : 0,
      cornerRadius: isFiniteNumber(value.cornerRadius)
        ? clamp(value.cornerRadius, 0, 50)
        : wasRoundedRectangle
          ? 12
          : 0,
      starPoints: isFiniteNumber(value.starPoints)
        ? Math.round(clamp(value.starPoints, 3, 24))
        : 5,
      pentagonSides: isFiniteNumber(value.pentagonSides)
        ? Math.round(clamp(value.pentagonSides, 3, 12))
        : 5,
    };
  }
  return null;
}

function updatePageElements(
  pages: EditorPage[],
  pageId: string,
  update: (elements: EditorElement[]) => EditorElement[],
) {
  return pages.map((page) =>
    page.id === pageId ? { ...page, elements: update(page.elements) } : page,
  );
}

function updateElementPage(
  pages: EditorPage[],
  elementId: string,
  update: (elements: EditorElement[]) => EditorElement[],
) {
  const page = pages.find((candidate) =>
    candidate.elements.some((element) => element.id === elementId),
  );
  return page ? updatePageElements(pages, page.id, update) : pages;
}

function moveElementBetweenPages(
  pages: EditorPage[],
  elementId: string,
  position: { x: number; y: number; pageId?: string },
) {
  const sourcePage = pages.find((page) =>
    page.elements.some((element) => element.id === elementId),
  );
  const targetPage = position.pageId
    ? pages.find((page) => page.id === position.pageId)
    : sourcePage;
  const element = sourcePage?.elements.find(
    (candidate) => candidate.id === elementId,
  );
  if (!sourcePage || !targetPage || !element) return pages;

  if (sourcePage.id === targetPage.id) {
    return updatePageElements(pages, sourcePage.id, (elements) =>
      elements.map((candidate) =>
        candidate.id === elementId
          ? { ...candidate, x: position.x, y: position.y }
          : candidate,
      ),
    );
  }

  const topLayer = Math.max(
    -1,
    ...targetPage.elements.map((candidate) => candidate.zIndex),
  );
  return pages.map((page) => {
    if (page.id === sourcePage.id) {
      return {
        ...page,
        elements: page.elements.filter(
          (candidate) => candidate.id !== elementId,
        ),
      };
    }
    if (page.id === targetPage.id) {
      return {
        ...page,
        elements: [
          ...page.elements,
          { ...element, x: position.x, y: position.y, zIndex: topLayer + 1 },
        ],
      };
    }
    return page;
  });
}

function reorderElements(
  elements: EditorElement[],
  elementId: string,
  direction: -1 | 1,
) {
  const ordered = [...elements].sort(
    (first, second) => first.zIndex - second.zIndex,
  );
  const index = ordered.findIndex((element) => element.id === elementId);
  const nextIndex = clamp(index + direction, 0, ordered.length - 1);
  if (index < 0 || index === nextIndex) return elements;

  const [element] = ordered.splice(index, 1);
  ordered.splice(nextIndex, 0, element);
  return ordered.map((item, zIndex) => ({ ...item, zIndex }));
}

function isEditorDocument(value: unknown): value is EditorDocument {
  if (
    !isRecord(value) ||
    typeof value.bookName !== "string" ||
    !Array.isArray(value.pages) ||
    value.pages.length === 0
  )
    return false;
  return (
    value.pages.every(isEditorPage) &&
    typeof value.currentPageId === "string" &&
    value.pages.some((page) => page.id === value.currentPageId) &&
    (value.trimPreset === "letter" ||
      value.trimPreset === "paperback" ||
      value.trimPreset === "square") &&
    typeof value.bleedEnabled === "boolean" &&
    (value.zoom === "50%" ||
      value.zoom === "75%" ||
      value.zoom === "100%" ||
      value.zoom === "Fit") &&
    (value.spreadMode === "single" || value.spreadMode === "spread")
    && isBookDesignSettings(value.design)
  );
}

function isBookDesignSettings(value: unknown): value is BookDesignSettings {
  return (
    isRecord(value) &&
    isRecord(value.pageNumbers) &&
    typeof value.pageNumbers.enabled === "boolean" &&
    (value.pageNumbers.format === "arabic" ||
      value.pageNumbers.format === "roman-lower" ||
      value.pageNumbers.format === "roman-upper") &&
    isPageNumberPosition(value.pageNumbers.position) &&
    isTextFontFamily(value.pageNumbers.fontFamily) &&
    isFiniteNumber(value.pageNumbers.fontSize) &&
    value.pageNumbers.fontSize >= 6 &&
    value.pageNumbers.fontSize <= 48 &&
    isHexColor(value.pageNumbers.color) &&
    isRecord(value.pageBorder) &&
    typeof value.pageBorder.enabled === "boolean" &&
    isPageBorderStyle(value.pageBorder.style) &&
    isFiniteNumber(value.pageBorder.inset) &&
    value.pageBorder.inset >= 1 &&
    value.pageBorder.inset <= 15 &&
    isFiniteNumber(value.pageBorder.width) &&
    value.pageBorder.width >= 1 &&
    value.pageBorder.width <= 8 &&
    isHexColor(value.pageBorder.color) &&
    Array.isArray(value.excludedPageIds) &&
    value.excludedPageIds.every((pageId) => typeof pageId === "string") &&
    Array.isArray(value.elements) &&
    value.elements.every(
      (element) =>
        isEditorElement(element) &&
        (element.kind === "text" ||
          element.kind === "shape" ||
          element.kind === "artwork"),
    )
  );
}

function isPageNumberPosition(value: unknown): value is PageNumberPosition {
  return (
    value === "top-outer" ||
    value === "top-inner" ||
    value === "top-center" ||
    value === "bottom-outer" ||
    value === "bottom-inner" ||
    value === "bottom-center"
  );
}

function isPageBorderStyle(value: unknown): value is PageBorderStyle {
  return (
    value === "solid" ||
    value === "dashed" ||
    value === "dotted" ||
    value === "double"
  );
}

function isEditorPage(value: unknown): value is EditorPage {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    (value.aiPageType === undefined ||
      isAiBookPlanPageType(value.aiPageType)) &&
    (value.aiPageDescription === undefined ||
      typeof value.aiPageDescription === "string") &&
    (value.pageType === undefined ||
      value.pageType === "sudoku-solutions" ||
      value.pageType === "puzzle-solutions") &&
    Array.isArray(value.elements) &&
    value.elements.every(isEditorElement)
  );
}

function isGridDimension(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 5 &&
    value <= 30
  );
}

function isMazeDimension(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 5 &&
    value <= 40
  );
}

function isMazeDifficulty(value: unknown): value is MazeDifficulty {
  return (
    value === "easy" ||
    value === "medium" ||
    value === "hard" ||
    value === "insane"
  );
}

function isMazeCells(
  value: unknown,
  rows: number,
  cols: number,
): value is MazeCellWalls[][] {
  if (
    !Array.isArray(value) ||
    value.length !== rows ||
    !value.every(
      (row) =>
        Array.isArray(row) &&
        row.length === cols &&
        row.every(
          (cell) =>
            isRecord(cell) &&
            typeof cell.top === "boolean" &&
            typeof cell.right === "boolean" &&
            typeof cell.bottom === "boolean" &&
            typeof cell.left === "boolean",
        ),
    )
  ) {
    return false;
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cell = value[row][col] as MazeCellWalls;
      if (
        (row === 0 && !cell.top) ||
        (col === 0 && !cell.left) ||
        (row === rows - 1 && !cell.bottom) ||
        (col === cols - 1 && !cell.right) ||
        (col < cols - 1 && cell.right !== value[row][col + 1].left) ||
        (row < rows - 1 && cell.bottom !== value[row + 1][col].top)
      ) {
        return false;
      }
    }
  }
  return true;
}

function isMazePath(
  value: unknown,
  cells: unknown,
  rows: number,
  cols: number,
): value is MazePathCell[] {
  if (
    !isMazeCells(cells, rows, cols) ||
    !Array.isArray(value) ||
    value.length < 2 ||
    !value.every(
      (point) =>
        isRecord(point) &&
        isInteger(point.row) &&
        isInteger(point.col) &&
        point.row >= 0 &&
        point.row < rows &&
        point.col >= 0 &&
        point.col < cols,
    )
  ) {
    return false;
  }

  const path = value as MazePathCell[];
  if (
    path[0].row !== 0 ||
    path[0].col !== 0 ||
    path[path.length - 1].row !== rows - 1 ||
    path[path.length - 1].col !== cols - 1
  ) {
    return false;
  }

  return path.every((point, index) => {
    if (index === path.length - 1) return true;
    const next = path[index + 1];
    const rowDelta = next.row - point.row;
    const colDelta = next.col - point.col;
    if (Math.abs(rowDelta) + Math.abs(colDelta) !== 1) return false;
    const direction =
      rowDelta === -1
        ? "top"
        : rowDelta === 1
          ? "bottom"
          : colDelta === -1
            ? "left"
            : "right";
    return !cells[point.row][point.col][direction];
  });
}

function isWordSearchGrid(
  value: unknown,
  rows: number,
  cols: number,
): value is string[][] {
  return (
    Array.isArray(value) &&
    value.length === rows &&
    value.every(
      (row) =>
        Array.isArray(row) &&
        row.length === cols &&
        row.every((cell) => typeof cell === "string" && cell.length === 1),
    )
  );
}

function isWordSearchPlacements(
  value: unknown,
  rows: number,
  cols: number,
): value is WordSearchPlacement[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (placement) =>
        isRecord(placement) &&
        typeof placement.word === "string" &&
        placement.word.length > 0 &&
        typeof placement.clean === "string" &&
        placement.clean.length > 0 &&
        (placement.solutionColor === undefined ||
          isHexColor(placement.solutionColor)) &&
        Array.isArray(placement.path) &&
        placement.path.length === placement.clean.length &&
        placement.path.every(
          (point) =>
            isRecord(point) &&
            isInteger(point.x) &&
            isInteger(point.y) &&
            point.x >= 0 &&
            point.x < cols &&
            point.y >= 0 &&
            point.y < rows,
        ),
    )
  );
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isEditorElement(value: unknown): value is EditorElement {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !isFiniteNumber(value.x) ||
    !isFiniteNumber(value.y) ||
    !isFiniteNumber(value.width) ||
    !isFiniteNumber(value.height) ||
    !isFiniteNumber(value.zIndex)
  ) {
    return false;
  }
  if (value.kind === "text") {
    return (
      typeof value.content === "string" &&
      typeof value.textStyle === "string" &&
      textStyles.includes(value.textStyle as TextStyle) &&
      (value.fontFamily === "serif" ||
        value.fontFamily === "sans" ||
        value.fontFamily === "mono") &&
      isFiniteNumber(value.fontSize) &&
      typeof value.color === "string" &&
      isFiniteNumber(value.rotation) &&
      isFiniteNumber(value.lineSpacing) &&
      isFiniteNumber(value.tracking) &&
      typeof value.bold === "boolean" &&
      typeof value.italic === "boolean" &&
      (value.alignment === "left" ||
        value.alignment === "center" ||
        value.alignment === "right" ||
        value.alignment === "justify") &&
      isFiniteNumber(value.lineHeight)
    );
  }
  if (value.kind === "image") {
    return (
      typeof value.fileId === "string" &&
      typeof value.src === "string" &&
      typeof value.alt === "string" &&
      isHexColor(value.borderColor) &&
      isFiniteNumber(value.borderWidth) &&
      isFiniteNumber(value.borderRadius) &&
      isFiniteNumber(value.opacity) &&
      isFiniteNumber(value.rotation) &&
      isImageFilterSettings(value.filters)
    );
  }
  if (value.kind === "puzzle") return typeof value.puzzleType === "string";
  if (value.kind === "sudoku") {
    const squares = value.squares;
    const solutionNumber = value.solutionNumber;
    if (squares !== 2 && squares !== 3 && squares !== 4 && squares !== 5) {
      return false;
    }
    const sideLength = squares * squares;
    const boardLength = sideLength * sideLength;
    return (
      isSudokuDifficulty(value.difficulty) &&
      isSudokuBoard(value.puzzle, boardLength, true) &&
      isSudokuBoard(value.solution, boardLength, false) &&
      isFiniteNumber(value.hiddenSquares) &&
      isHexColor(value.color) &&
      isFiniteNumber(value.numberSize) &&
      typeof value.isSolution === "boolean" &&
      (solutionNumber === undefined ||
        (typeof solutionNumber === "number" &&
          Number.isInteger(solutionNumber) &&
          solutionNumber > 0))
    );
  }
  if (value.kind === "word-search") {
    const solutionNumber = value.solutionNumber;
    return (
      isGridDimension(value.rows) &&
      isGridDimension(value.cols) &&
      isWordSearchGrid(value.grid, value.rows, value.cols) &&
      isWordSearchPlacements(value.words, value.rows, value.cols) &&
      typeof value.dictionaryName === "string" &&
      value.dictionaryName.trim().length > 0 &&
      isHexColor(value.color) &&
      isFiniteNumber(value.letterSize) &&
      isFiniteNumber(value.lineWeight) &&
      typeof value.puzzleId === "string" &&
      value.puzzleId.length > 0 &&
      typeof value.isSolution === "boolean" &&
      (solutionNumber === undefined ||
        (typeof solutionNumber === "number" &&
          Number.isInteger(solutionNumber) &&
          solutionNumber > 0))
    );
  }
  if (value.kind === "word-search-words") {
    const solutionNumber = value.solutionNumber;
    return (
      typeof value.puzzleId === "string" &&
      value.puzzleId.length > 0 &&
      isWordSearchPlacements(value.words, 30, 30) &&
      isHexColor(value.color) &&
      isTextFontFamily(value.fontFamily) &&
      isFiniteNumber(value.fontSize) &&
      isFiniteNumber(value.spacing) &&
      isFiniteNumber(value.lineSpacing) &&
      typeof value.isSolution === "boolean" &&
      (solutionNumber === undefined ||
        (typeof solutionNumber === "number" &&
          Number.isInteger(solutionNumber) &&
          solutionNumber > 0))
    );
  }
  if (value.kind === "maze") {
    const solutionNumber = value.solutionNumber;
    return (
      isMazeDimension(value.rows) &&
      isMazeDimension(value.cols) &&
      isMazeCells(value.cells, value.rows, value.cols) &&
      isMazePath(value.solutionPath, value.cells, value.rows, value.cols) &&
      isMazeDifficulty(value.difficulty) &&
      isFiniteNumber(value.lineWeight) &&
      typeof value.isSolution === "boolean" &&
      (solutionNumber === undefined ||
        (typeof solutionNumber === "number" &&
          Number.isInteger(solutionNumber) &&
          solutionNumber > 0))
    );
  }
  if (value.kind === "artwork") {
    return (
      isArtKey(value.artKey) &&
      isHexColor(value.strokeColor) &&
      isFiniteNumber(value.strokeWidth) &&
      isFiniteNumber(value.rotation)
    );
  }
  if (value.kind === "shape") {
    return (
      isShapeType(value.shapeType) &&
      isLineStyle(value.lineStyle) &&
      isLineCapStyle(value.lineCap) &&
      isHexColor(value.fillColor) &&
      (value.outlineColor === null || isHexColor(value.outlineColor)) &&
      isFiniteNumber(value.outlineWidth) &&
      isFiniteNumber(value.rotation) &&
      isFiniteNumber(value.cornerRadius) &&
      Number.isInteger(value.starPoints) &&
      Number.isInteger(value.pentagonSides)
    );
  }
  return false;
}

function isSudokuBoard(
  value: unknown,
  boardLength: number,
  allowEmpty: boolean,
): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === boardLength &&
    value.every(
      (cell) =>
        Number.isInteger(cell) &&
        (allowEmpty ? cell >= -1 : cell >= 0) &&
        cell < Math.sqrt(boardLength),
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isTextFontFamily(
  value: unknown,
): value is TextEditorElement["fontFamily"] {
  return value === "serif" || value === "sans" || value === "mono";
}

function isTextAlignment(
  value: unknown,
): value is TextEditorElement["alignment"] {
  return (
    value === "left" ||
    value === "center" ||
    value === "right" ||
    value === "justify"
  );
}

function normalizeShapeType(value: unknown): ShapeType | null {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase().replaceAll(" ", "-");
  if (normalized === "rounded-rectangle") return "rectangle";
  if (normalized === "divider") return "line";
  return isShapeType(normalized) ? normalized : null;
}

function isShapeType(value: unknown): value is ShapeType {
  return typeof value === "string" && SHAPE_TYPES.includes(value as ShapeType);
}

function isLineStyle(value: unknown): value is LineStyle {
  return (
    value === "thin" ||
    value === "thick" ||
    value === "dashed" ||
    value === "dotted" ||
    value === "double" ||
    value === "ornament"
  );
}

function normalizeImageFilters(value: unknown): ImageFilterSettings {
  const filters = isRecord(value) ? value : {};
  return {
    brightness: isFiniteNumber(filters.brightness)
      ? clamp(filters.brightness, 0, 200)
      : defaultImageFilters.brightness,
    contrast: isFiniteNumber(filters.contrast)
      ? clamp(filters.contrast, 0, 200)
      : defaultImageFilters.contrast,
    saturation: isFiniteNumber(filters.saturation)
      ? clamp(filters.saturation, 0, 200)
      : defaultImageFilters.saturation,
    grayscale: isFiniteNumber(filters.grayscale)
      ? clamp(filters.grayscale, 0, 100)
      : defaultImageFilters.grayscale,
    sepia: isFiniteNumber(filters.sepia)
      ? clamp(filters.sepia, 0, 100)
      : defaultImageFilters.sepia,
    blur: isFiniteNumber(filters.blur)
      ? clamp(filters.blur, 0, 20)
      : defaultImageFilters.blur,
    hueRotation: isFiniteNumber(filters.hueRotation)
      ? clamp(filters.hueRotation, 0, 360)
      : defaultImageFilters.hueRotation,
  };
}

function isImageFilterSettings(value: unknown): value is ImageFilterSettings {
  return (
    isRecord(value) &&
    isFiniteNumber(value.brightness) &&
    isFiniteNumber(value.contrast) &&
    isFiniteNumber(value.saturation) &&
    isFiniteNumber(value.grayscale) &&
    isFiniteNumber(value.sepia) &&
    isFiniteNumber(value.blur) &&
    isFiniteNumber(value.hueRotation)
  );
}

function isArtKey(value: unknown): value is string {
  return (
    typeof value === "string" && ART_LIBRARY.some((item) => item.key === value)
  );
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[\da-f]{6}$/i.test(value);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function defaultSudokuNumberSize(squares: 2 | 3 | 4 | 5) {
  return clamp(Math.floor(112 / (squares * squares)), 6, 14);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown save error.";
}
