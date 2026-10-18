"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import type {
  EditorElement,
  EditorPage,
  SaveStatus,
  ShapeEditorElement,
  ShapeElementUpdates,
  ShapeType,
  SpreadMode,
  TextEditorElement,
  TextElementUpdates,
  TextStyle,
  TrimPreset,
  ZoomLevel,
} from "./components/editor-types";

const storageKey = "booker-editor-document";
const initialDocument: EditorDocument = {
  bookName: "Untitled Book",
  pages: [{ id: "page-1", title: "Page 1", elements: [] }],
  currentPageId: "page-1",
  trimPreset: "letter",
  bleedEnabled: false,
  zoom: "Fit",
  spreadMode: "single",
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
const initialSnapshot = JSON.stringify({
  ready: false,
  value: null,
  error: null,
});

type EditorDocument = {
  bookName: string;
  pages: EditorPage[];
  currentPageId: string;
  trimPreset: TrimPreset;
  bleedEnabled: boolean;
  zoom: ZoomLevel;
  spreadMode: SpreadMode;
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
  addShapeElement: (shapeType: ShapeType) => void;
  updateTextContent: (elementId: string, content: string) => void;
  updateTextElement: (elementId: string, updates: TextElementUpdates) => void;
  updateShapeElement: (elementId: string, updates: ShapeElementUpdates) => void;
  moveElement: (elementId: string, position: { x: number; y: number }) => void;
  resizeElement: (
    elementId: string,
    size: { width: number; height: number },
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

const shapeTypes: ShapeType[] = [
  "rectangle",
  "circle",
  "ellipse",
  "triangle",
  "star",
  "pentagon",
  "line",
  "arrow",
  "speech-bubble",
  "divider",
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

export function EditorProvider({ children }: { children: ReactNode }) {
  const rawSnapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => initialSnapshot,
  );
  const snapshot = JSON.parse(rawSnapshot) as StorageSnapshot;
  const parsed = useMemo(() => parseDocument(snapshot), [snapshot]);
  const [selectedElementId, selectElement] = useState<string | null>(null);
  const document = parsed.document;
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
          saveDocument({ ...document, currentPageId: pageId });
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
        const pageIndex = document.pages.findIndex((page) => page.id === pageId);
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

        const pageIndex = document.pages.findIndex((page) => page.id === pageId);
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
        const isLine = shapeType === "line" || shapeType === "divider";
        const element: ShapeEditorElement = {
          id: crypto.randomUUID(),
          kind: "shape",
          shapeType,
          fillColor: "#dce6d8",
          outlineColor: null,
          outlineWidth: 2,
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
      updateTextContent: (elementId, content) => {
        saveDocument({
          ...document,
          pages: updatePageElements(
            document.pages,
            currentPage.id,
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
          pages: updatePageElements(
            document.pages,
            currentPage.id,
            (elements) =>
              elements.map((element) => {
                if (element.id !== elementId || element.kind !== "shape")
                  return element;
                const updated = { ...element, ...updates };
                return {
                  ...updated,
                  width: clamp(updated.width, 8, 100 - updated.x),
                  height: clamp(updated.height, 5, 100 - updated.y),
                  rotation: clamp(updated.rotation, -180, 180),
                  outlineWidth: clamp(updated.outlineWidth, 0, 20),
                  cornerRadius: clamp(updated.cornerRadius, 0, 50),
                  starPoints: Math.round(clamp(updated.starPoints, 3, 24)),
                  pentagonSides: Math.round(
                    clamp(updated.pentagonSides, 3, 12),
                  ),
                };
              }),
          ),
        });
      },
      updateTextElement: (elementId, updates) => {
        saveDocument({
          ...document,
          pages: updatePageElements(
            document.pages,
            currentPage.id,
            (elements) =>
              elements.map((element) =>
                element.id === elementId && element.kind === "text"
                  ? { ...element, ...updates }
                  : element,
              ),
          ),
        });
      },
      moveElement: (elementId, position) => {
        saveDocument({
          ...document,
          pages: updatePageElements(
            document.pages,
            currentPage.id,
            (elements) =>
              elements.map((element) =>
                element.id === elementId
                  ? { ...element, x: position.x, y: position.y }
                  : element,
              ),
          ),
        });
      },
      resizeElement: (elementId, size) => {
        saveDocument({
          ...document,
          pages: updatePageElements(
            document.pages,
            currentPage.id,
            (elements) =>
              elements.map((element) =>
                element.id === elementId
                  ? {
                      ...element,
                      width: clamp(size.width, 8, 100 - element.x),
                      height: clamp(size.height, 5, 100 - element.y),
                    }
                  : element,
              ),
          ),
        });
      },
      reorderElement: (elementId, direction) => {
        saveDocument({
          ...document,
          pages: updatePageElements(
            document.pages,
            currentPage.id,
            (elements) => reorderElements(elements, elementId, direction),
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
        saveDocument({
          ...document,
          currentPageId: document.pages[nextIndex].id,
        });
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
    ],
  );

  return (
    <editorContext.Provider value={value}>{children}</editorContext.Provider>
  );
}

export function useEditorContext() {
  const context = useContext(editorContext);
  if (!context)
    throw new Error("useEditorContext must be used within an EditorProvider.");
  return context;
}

function subscribe(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  listeners.add(listener);
  window.addEventListener("storage", handleStorageEvent);
  getSnapshot();
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorageEvent);
  };
}

let cachedSnapshot = initialSnapshot;
let hasReadStorage = false;
const listeners = new Set<() => void>();

function getSnapshot() {
  if (typeof window === "undefined") return initialSnapshot;
  if (!hasReadStorage) {
    hasReadStorage = true;
    try {
      cachedSnapshot = serializeSnapshot(
        window.localStorage.getItem(storageKey),
        null,
        true,
      );
    } catch (error) {
      cachedSnapshot = serializeSnapshot(null, errorMessage(error), true);
    }
  }
  return cachedSnapshot;
}

function handleStorageEvent(event: StorageEvent) {
  if (event.key !== storageKey && event.key !== null) return;
  cachedSnapshot = serializeSnapshot(
    event.key === null ? null : event.newValue,
    null,
    true,
  );
  hasReadStorage = true;
  listeners.forEach((listener) => listener());
}

function saveDocument(document: EditorDocument) {
  const serialized = JSON.stringify(document);
  let error: string | null = null;
  try {
    window.localStorage.setItem(storageKey, serialized);
  } catch (reason) {
    error = errorMessage(reason);
  }
  cachedSnapshot = serializeSnapshot(serialized, error, true);
  hasReadStorage = true;
  listeners.forEach((listener) => listener());
}

function serializeSnapshot(
  value: string | null,
  error: string | null,
  ready: boolean,
) {
  return JSON.stringify({ ready, value, error });
}

function parseDocument(snapshot: StorageSnapshot) {
  if (snapshot.value === null) {
    return { document: initialDocument, error: null };
  }
  try {
    const value: unknown = JSON.parse(snapshot.value);
    const document = normalizeDocument(value);
    if (!document)
      throw new Error("The saved book data has an invalid format.");
    return { document, error: null };
  } catch (error) {
    return {
      document: initialDocument,
      error: `Could not read this book from browser storage: ${errorMessage(error)}`,
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
    pages.push({
      id: pageValue.id,
      title:
        typeof pageValue.title === "string"
          ? pageValue.title
          : `Page ${pageIndex + 1}`,
      elements,
    });
  }

  const document: EditorDocument = {
    bookName:
      typeof value.bookName === "string" && value.bookName.trim()
        ? value.bookName
        : initialDocument.bookName,
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
  };
  return isEditorDocument(document) ? document : null;
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

  const x = clamp(value.x, 0, 99);
  const y = clamp(value.y, 0, 99);
  const position = {
    id: value.id,
    x,
    y,
    width: clamp(value.width, 8, 100 - x),
    height: clamp(value.height, 5, 100 - y),
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
    typeof value.src === "string" &&
    typeof value.alt === "string"
  ) {
    return { ...position, kind: "image", src: value.src, alt: value.alt };
  }
  if (value.kind === "puzzle" && typeof value.puzzleType === "string") {
    return { ...position, kind: "puzzle", puzzleType: value.puzzleType };
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
  );
}

function isEditorPage(value: unknown): value is EditorPage {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    Array.isArray(value.elements) &&
    value.elements.every(isEditorElement)
  );
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
    return typeof value.src === "string" && typeof value.alt === "string";
  }
  if (value.kind === "puzzle") return typeof value.puzzleType === "string";
  if (value.kind === "shape") {
    return (
      isShapeType(value.shapeType) &&
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
  return isShapeType(normalized) ? normalized : null;
}

function isShapeType(value: unknown): value is ShapeType {
  return typeof value === "string" && shapeTypes.includes(value as ShapeType);
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[\da-f]{6}$/i.test(value);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown storage error.";
}
