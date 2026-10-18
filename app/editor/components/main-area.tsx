"use client";

import { Check, Frame } from "lucide-react";

import type { EditorElement, EditorPage, SpreadMode, TrimPreset, ZoomLevel } from "./editor-types";
import { CanvasElement } from "./canvas-element";

type MainAreaProps = {
  page: EditorPage;
  pageNumber: number;
  selectedElementId: string | null;
  trimPreset: TrimPreset;
  bleedEnabled: boolean;
  zoom: ZoomLevel;
  spreadMode: SpreadMode;
  onSelectElement: (id: string | null) => void;
  onMoveElement: (id: string, position: { x: number; y: number }) => void;
  onResizeElement: (id: string, size: { width: number; height: number }) => void;
  onUpdateText: (id: string, content: string) => void;
};

const trimDimensions: Record<TrimPreset, string> = {
  letter: '8.5" × 11"',
  paperback: '6" × 9"',
  square: '8.25" × 8.25"',
};

export function MainArea({
  page,
  pageNumber,
  selectedElementId,
  trimPreset,
  bleedEnabled,
  zoom,
  spreadMode,
  onSelectElement,
  onMoveElement,
  onResizeElement,
  onUpdateText,
}: MainAreaProps) {
  const width = getPageWidth(zoom, spreadMode);

  return (
    <section aria-label="Page editor" className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#e7e9e5] bg-[#fafbf9] px-5">
        <div className="flex items-center gap-2 text-[11px] text-[#869089]">
          <span>Interior</span>
          <span className="text-[#c2c8c3]">/</span>
          <span className="font-medium text-[#59655e]">{page.title}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[#89938c]">
          <span className="hidden sm:inline">Page size</span>
          <span className="font-medium text-[#59655e]">{trimDimensions[trimPreset]}</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center overflow-auto px-5 py-5">
        <div className="mb-3 flex w-full max-w-[980px] items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-white text-[#6c7c70] shadow-sm ring-1 ring-[#e7eae6]">
              <Frame className="size-3.5" />
            </span>
            <span className="text-[11px] font-medium text-[#67736b]">
              {spreadMode === "single" ? "Single page" : "Booklet spread"}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[#98a19b]">
            {bleedEnabled && <span className="text-[#a77456]">Bleed guides on</span>}
            <span>{zoom} zoom</span>
          </div>
        </div>

        <article
          aria-label={`Book page ${pageNumber}`}
          className="relative isolate shrink-0 overflow-hidden bg-[#fffefa] shadow-[0_12px_40px_rgba(34,48,38,0.12),0_2px_6px_rgba(34,48,38,0.08)] ring-1 ring-[#e5e2d9]"
          data-page-canvas
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) onSelectElement(null);
          }}
          style={{
            aspectRatio:
              trimPreset === "square" ? "1 / 1" : trimPreset === "paperback" ? "2 / 3" : "8.5 / 11",
            width,
            maxWidth: "100%",
          }}
        >
          {bleedEnabled && (
            <div className="pointer-events-none absolute inset-[3%] z-10 border border-dashed border-[#c8845d]/60" />
          )}
          <div className="pointer-events-none absolute inset-[9%] z-0 border border-dashed border-[#dce4dc]" />
          {page.elements.length === 0 && (
            <p className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center px-8 text-center font-serif text-sm italic text-[#a3aaa2]">
              Add content from the sidebar to start your page.
            </p>
          )}
          {page.elements.map((element: EditorElement) => (
            <CanvasElement
              key={element.id}
              element={element}
              selected={selectedElementId === element.id}
              onSelect={() => onSelectElement(element.id)}
              onMove={(position) => onMoveElement(element.id, position)}
              onResize={(size) => onResizeElement(element.id, size)}
              onUpdateText={(content) => onUpdateText(element.id, content)}
            />
          ))}
        </article>

        <div className="mt-3 flex w-full max-w-[980px] shrink-0 items-center justify-between border-t border-[#e7e9e5] pt-2 text-[10px] text-[#9aa29c]">
          <span>Drag to position · Resize selected elements · Double-click text to edit</span>
          <span className="flex items-center gap-1.5">
            <Check className="size-3 text-[#6c9673]" />
            {bleedEnabled ? "Bleed included in preview" : "Print-safe area shown"}
          </span>
        </div>
      </div>
    </section>
  );
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
