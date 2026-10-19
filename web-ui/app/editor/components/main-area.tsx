"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import type {
  EditorElement,
  EditorPage,
  SpreadMode,
  TrimPreset,
  ZoomLevel,
} from "./editor-types";
import { CanvasElement } from "./canvas-element";

type MainAreaProps = {
  page: EditorPage;
  pageNumber: number;
  spreadPages: [EditorPage | null, EditorPage | null];
  spreadPageNumbers: [number | null, number | null];
  selectedElementId: string | null;
  trimPreset: TrimPreset;
  bleedEnabled: boolean;
  zoom: ZoomLevel;
  spreadMode: SpreadMode;
  onSelectElement: (id: string | null) => void;
  onMoveElement: (
    id: string,
    position: { x: number; y: number; pageId?: string },
  ) => void;
  onResizeElement: (
    id: string,
    size: { x: number; y: number; width: number; height: number },
  ) => void;
  onRotateElement: (id: string, rotation: number) => void;
  onUpdateText: (id: string, content: string) => void;
};

export function MainArea({
  page,
  pageNumber,
  spreadPages,
  spreadPageNumbers,
  selectedElementId,
  trimPreset,
  bleedEnabled,
  zoom,
  spreadMode,
  onSelectElement,
  onMoveElement,
  onResizeElement,
  onRotateElement,
  onUpdateText,
}: MainAreaProps) {
  const pageWidth = getPageWidth(zoom, spreadMode);
  const visiblePages =
    spreadMode === "spread"
      ? spreadPages.map((spreadPage, index) => ({
          page: spreadPage,
          pageNumber: spreadPageNumbers[index],
          side: index === 0 ? "left" : "right",
        }))
      : [{ page, pageNumber, side: "single" }];

  return (
    <section
      aria-label="Page editor"
      className="flex min-w-0 flex-1 flex-col overflow-hidden"
    >
      <div className="editor-canvas-scroll flex min-h-0 flex-1 flex-col items-center overflow-auto">
        <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-5">
          <div className="flex w-max shrink-0 items-center gap-3">
            {visiblePages.map(({ page: canvasPage, pageNumber: canvasPageNumber, side }) =>
              canvasPage ? (
                <PageCanvas
                  key={canvasPage.id}
                  page={canvasPage}
                  pageNumber={canvasPageNumber ?? pageNumber}
                  width={pageWidth}
                  trimPreset={trimPreset}
                  bleedEnabled={bleedEnabled}
                  selectedElementId={selectedElementId}
                  onSelectElement={onSelectElement}
                  onMoveElement={onMoveElement}
                  onResizeElement={onResizeElement}
                  onRotateElement={onRotateElement}
                  onUpdateText={onUpdateText}
                />
              ) : (
                <div
                  key={`blank-${side}`}
                  aria-label={side === "left" ? "Blank left page" : "Next page is not created"}
                  className="flex shrink-0 items-center justify-center bg-[#fffefa] text-center font-serif text-sm italic text-[#a3aaa2] shadow-[0_12px_40px_rgba(34,48,38,0.12),0_2px_6px_rgba(34,48,38,0.08)] ring-1 ring-[#e5e2d9]"
                  style={{
                    aspectRatio: getPageAspectRatio(trimPreset),
                    width: pageWidth,
                  }}
                >
                  {side === "right" && "Add a page to continue the spread."}
                </div>
              ),
            )}
          </div>
        </div>
        <div className="mt-auto flex w-full shrink-0 items-center justify-between border-t border-[#e7e9e5] px-4 pb-2 pt-2 text-[10px] text-[#9aa29c]">
          <span>
            Drag to position · Resize selected elements · Double-click text to
            edit
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="size-3 text-[#6c9673]" />
            {bleedEnabled
              ? "Bleed included in preview"
              : "Print-safe area shown"}
          </span>
        </div>
      </div>
    </section>
  );
}

function PageCanvas({
  page,
  pageNumber,
  width,
  trimPreset,
  bleedEnabled,
  selectedElementId,
  onSelectElement,
  onMoveElement,
  onResizeElement,
  onRotateElement,
  onUpdateText,
}: Omit<
  MainAreaProps,
  | "page"
  | "pageNumber"
  | "spreadPages"
  | "spreadPageNumbers"
  | "spreadMode"
  | "zoom"
> & {
  page: EditorPage;
  pageNumber: number;
  width: string;
}) {
  const [pageOverlay, setPageOverlay] = useState<HTMLDivElement | null>(null);

  return (
    <div
      className="relative isolate shrink-0"
      style={{
        aspectRatio: getPageAspectRatio(trimPreset),
        width,
      }}
    >
      <article
        aria-label={`Book page ${pageNumber}`}
        className="absolute inset-0 isolate overflow-hidden bg-[#fffefa] shadow-[0_12px_40px_rgba(34,48,38,0.12),0_2px_6px_rgba(34,48,38,0.08)] ring-1 ring-[#e5e2d9]"
        data-page-canvas
        data-page-id={page.id}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) onSelectElement(null);
        }}
      >
        {bleedEnabled && (
          <div
            className="pointer-events-none absolute inset-[3%] z-10 border border-dashed border-[#c8845d]/60"
            data-cover-exclude="true"
          />
        )}
        {page.elements.length === 0 && (
          <p
            className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center px-8 text-center font-serif text-sm italic text-[#a3aaa2]"
            data-cover-exclude="true"
          >
            Add content from the sidebar to start your page.
          </p>
        )}
        {page.elements.map((element: EditorElement) => (
          <CanvasElement
            key={element.id}
            element={element}
            selected={selectedElementId === element.id}
            overlayTarget={pageOverlay}
            onSelect={() => onSelectElement(element.id)}
            onMove={(position) => onMoveElement(element.id, position)}
            onResize={(size) => onResizeElement(element.id, size)}
            onRotate={(rotation) => onRotateElement(element.id, rotation)}
            onUpdateText={(content) => onUpdateText(element.id, content)}
          />
        ))}
      </article>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        ref={setPageOverlay}
      />
    </div>
  );
}

function getPageAspectRatio(trimPreset: TrimPreset) {
  if (trimPreset === "square") return "1 / 1";
  if (trimPreset === "paperback") return "2 / 3";
  return "8.5 / 11";
}

function getPageWidth(zoom: ZoomLevel, spreadMode: SpreadMode) {
  const width = spreadMode === "single" ? 438 : 340;
  const scale: Record<ZoomLevel, number> = {
    "50%": 0.55,
    "75%": 0.75,
    "100%": 1,
    Fit: spreadMode === "single" ? 0.92 : 0.84,
  };
  return `${Math.round(width * scale[zoom])}px`;
}
