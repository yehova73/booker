"use client";

import { FileCheck2, Plus } from "lucide-react";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import type { EditorPage } from "./editor-types";
import { PageThumbnail } from "./page-thumbnail";

type PagesFooterProps = {
  pages: EditorPage[];
  currentPageId: string;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
  onClonePage: (pageId: string) => void;
  onDeletePage: (pageId: string) => void;
  onGenerateSolutions: () => void;
};

export function PagesFooter({
  pages,
  currentPageId,
  onSelectPage,
  onAddPage,
  onClonePage,
  onDeletePage,
  onGenerateSolutions,
}: PagesFooterProps) {
  const hasPuzzles = pages.some((page) =>
    page.elements.some(
      (element) =>
        (element.kind === "sudoku" || element.kind === "word-search") &&
        !element.isSolution,
    ),
  );

  return (
    <footer className="h-[124px] shrink-0 border-t border-[#e2e7e2] bg-white px-5">
      {/* <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-[#435047]">Pages</h2>
          <span className="text-[11px] text-[#929b94]">{pages.length} total</span>
        </div>
        <Button
          className="h-7 gap-1.5 border-[#dfe6df] px-2.5 text-[11px] text-[#45684d]"
          onClick={onAddPage}
          size="sm"
          variant="outline"
        >
          <Plus className="size-3.5" />
          Blank page
        </Button>
      </div> */}

      <ScrollArea className="h-full w-full overflow-y-hidden">
        <div className="flex w-max min-w-full items-start overflow-y-hidden gap-3 pb-2 py-2">
          {hasPuzzles && (
            <button
              aria-label="Generate solutions"
              className="flex h-[84px] w-[78px] cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-[#e2e7e2] transition hover:border-[#6b9076]"
              onClick={onGenerateSolutions}
              type="button"
            >
              <FileCheck2 className="size-4 text-[#6b9076]" />
              <span className="text-center text-[10px] leading-tight text-[#929b94]">
                Generate solutions
              </span>
            </button>
          )}
          <button
            aria-label={`Blank Page`}
            className=" flex w-[68px] flex-col items-center justify-center gap-1 rounded-md h-[84px] border border-dashed border-[#e2e7e2] hover:border-[#6b9076] cursor-pointer transition"
            onClick={onAddPage}
            type="button"
          >
            <Plus className="size-4 text-[#6b9076]" />
            <span className="text-[11px] text-[#929b94]">Blank Page</span>
          </button>
          {pages.map((page, index) => (
            <PageThumbnail
              key={page.id}
              page={page}
              pageNumber={index + 1}
              selected={page.id === currentPageId}
              onClick={() => onSelectPage(page.id)}
              onClone={() => onClonePage(page.id)}
              onDelete={() => onDeletePage(page.id)}
              canDelete={pages.length > 1}
            />
          ))}
        </div>
        <ScrollBar className="h-1.5" orientation="horizontal" />
      </ScrollArea>
    </footer>
  );
}
