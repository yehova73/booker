"use client";

import { CopyPlus, Trash2 } from "lucide-react";

import type { EditorPage } from "./editor-types";
import { ShapeGraphic } from "./shape-graphic";

export function PageThumbnail({
  page,
  pageNumber,
  selected,
  onClick,
  onClone,
  onDelete,
  canDelete,
}: {
  page: EditorPage;
  pageNumber: number;
  selected: boolean;
  onClick: () => void;
  onClone: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  return (
    <div className="group relative w-[68px] shrink-0 transition-transform duration-150 hover:-translate-y-0.5">
      <button
        aria-label={`Select page ${pageNumber}`}
        aria-pressed={selected}
        className="flex w-full cursor-pointer flex-col items-center gap-1 rounded-md p-1 text-left transition-colors hover:bg-[#f7f8f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#78967d]"
        onClick={onClick}
        type="button"
      >
        <span
          className={`relative block h-[78px] w-[58px] overflow-hidden bg-[#fffefa] shadow-sm ring-1 ${
            selected
              ? "ring-2 ring-[#4f795a]"
              : "ring-[#d9dfd8] group-hover:ring-[#9bac9d]"
          }`}
        >
          <span className="absolute inset-[9%] border border-[#e7ebe4]" />
          {page.elements.slice(0, 10).map((element) => (
            <span
              className={
                element.kind === "text"
                  ? "absolute block overflow-hidden font-serif leading-tight text-[#526454]"
                  : element.kind === "shape"
                    ? "absolute block overflow-visible"
                    : "absolute block rounded-[1px] bg-[#dce6d8]"
              }
              key={element.id}
              style={{
                left: `${element.x}%`,
                top: `${element.y}%`,
                width: `${element.width}%`,
                height:
                  element.kind === "text"
                    ? "5px"
                    : `${Math.max(4, element.height)}%`,
                fontSize: "3px",
                transform:
                  element.kind === "shape"
                    ? `rotate(${element.rotation}deg)`
                    : undefined,
              }}
            >
              {element.kind === "text" ? (
                element.content
              ) : element.kind === "shape" ? (
                <ShapeGraphic element={element} />
              ) : null}
            </span>
          ))}
        </span>
        <span
          className={`text-[10px] ${
            selected ? "font-semibold text-[#42634a]" : "text-[#7f8982]"
          }`}
        >
          {pageNumber}
        </span>
      </button>
      <div className="pointer-events-none absolute bottom-5 left-0 right-0 z-10 flex justify-center translate-y-1 items-center gap-1 rounded-b-md border border-[#e5e8e3] bg-gray-500/20 p-1 opacity-0 shadow-md backdrop-blur-sm transition-all duration-150 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
        <button
          aria-label={`Clone page ${pageNumber}`}
          className="flex size-5 cursor-pointer items-center justify-center rounded text-[#637067] transition-colors hover:bg-[#f1f5f0] hover:text-[#315d44]"
          onClick={onClone}
          title={`Clone page ${pageNumber}`}
          type="button"
        >
          <CopyPlus className="size-3" />
        </button>
        <button
          aria-label={`Delete page ${pageNumber}`}
          className="flex size-5 cursor-pointer items-center justify-center rounded text-[#9a5a4d] transition-colors hover:bg-[#f9efed] hover:text-[#8c3e30] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!canDelete}
          onClick={onDelete}
          title={
            canDelete ? `Delete page ${pageNumber}` : "Keep at least one page"
          }
          type="button"
        >
          <Trash2 className="size-3" />
        </button>
      </div>
    </div>
  );
}
