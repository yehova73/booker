"use client";

import { useEffect, useState } from "react";
import { toBlob } from "html-to-image";
import { toast } from "sonner";

import { deleteFilesAction } from "@/actions/files";
import { saveBookCoverAction } from "@/actions/books/save-book-cover";
import { uploadFileToS3 } from "@/utils/file-upload";
import { EditorProvider, useEditorContext } from "../editor-context";
import { EditorHeader } from "../components/header";
import { LeftSidebar } from "../components/left-sidebar";
import { MainArea } from "../components/main-area";
import { PagesFooter } from "../components/pages-footer";
import { RightSidebar } from "../components/right-sidebar";
import type { EditorPage, TrimPreset } from "../components/editor-types";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export function EditorWorkspacePage({
  bookId,
  bookTitle,
  initialBookData,
  initialTrimPreset,
  initialCoverPageId,
}: {
  bookId: string;
  bookTitle: string;
  initialBookData: unknown;
  initialTrimPreset: TrimPreset;
  initialCoverPageId: string | null;
}) {
  return (
    <EditorProvider
      key={bookId}
      bookId={bookId}
      bookTitle={bookTitle}
      initialBookData={initialBookData}
      initialTrimPreset={initialTrimPreset}
    >
      <EditorWorkspace
        bookId={bookId}
        initialCoverPageId={initialCoverPageId}
      />
    </EditorProvider>
  );
}

function EditorWorkspace({
  bookId,
  initialCoverPageId,
}: {
  bookId: string;
  initialCoverPageId: string | null;
}) {
  const editor = useEditorContext();
  const [coloringDialogOpen, setColoringDialogOpen] = useState(false);
  const [uploadsDialogOpen, setUploadsDialogOpen] = useState(false);
  const [coverPageId, setCoverPageId] = useState(initialCoverPageId);
  const [coverSavingPageId, setCoverSavingPageId] = useState<string | null>(
    null,
  );
  const selectedElementId = editor.selectedElementId;
  const deleteElement = editor.deleteElement;

  async function setCover(page: EditorPage) {
    if (coverSavingPageId) return;

    setCoverSavingPageId(page.id);
    editor.selectPage(page.id);
    let uploadedFileId: string | null = null;
    try {
      await waitForPaint();
      const canvas = Array.from(
        document.querySelectorAll<HTMLElement>("[data-page-canvas]"),
      ).find((element) => element.dataset.pageId === page.id);
      if (!canvas) {
        throw new Error("The selected page could not be rendered.");
      }

      const blob = await renderCoverCanvas(canvas, bookId);

      const uploaded = await uploadFileToS3(
        bookId,
        new File([blob], "book-cover.png", { type: "image/png" }),
      );
      uploadedFileId = uploaded.fileId;
      const result = await saveBookCoverAction(
        bookId,
        page.id,
        uploaded.fileId,
      );
      if (result.status !== "ok" || !result.data) {
        throw new Error(
          result.message?.description ??
            result.message?.title ??
            "The cover could not be saved.",
        );
      }

      setCoverPageId(result.data.coverPageId);
      toast.success("Book cover saved");
      uploadedFileId = null;
    } catch (error) {
      let description =
        error instanceof Error
          ? error.message
          : "The cover could not be saved.";
      if (uploadedFileId) {
        try {
          const cleanup = await deleteFilesAction([uploadedFileId]);
          if (cleanup.status !== "ok") {
            description += ` ${cleanup.message?.description ?? cleanup.message?.title ?? "The unused cover image could not be removed."}`;
          }
        } catch (cleanupError) {
          description += ` ${cleanupError instanceof Error ? cleanupError.message : "The unused cover image could not be removed."}`;
        }
      }
      toast.error("Cover update failed", {
        description,
      });
    } finally {
      setCoverSavingPageId(null);
    }
  }

  function deletePage(pageId: string) {
    editor.deletePage(pageId);
    if (coverPageId === pageId) setCoverPageId(null);
  }

  useEffect(() => {
    if (!selectedElementId) return;

    const elementId = selectedElementId;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest("input, textarea, select, [contenteditable='true']"))
      ) {
        return;
      }
      event.preventDefault();
      deleteElement(elementId);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteElement, selectedElementId]);

  return (
    <TooltipProvider>
      <SidebarProvider
        className="h-screen min-h-[640px] flex-col overflow-hidden bg-[#f5f6f3] text-[#1f2925]"
        defaultOpen={{ left: true, right: true }}
        keyboardShortcutSidebar="left"
      >
        <EditorHeader
          bookName={editor.bookName}
          onBookNameChange={editor.setBookName}
          trimPreset={editor.trimPreset}
          onTrimPresetChange={editor.setTrimPreset}
          bleedEnabled={editor.bleedEnabled}
          onBleedChange={editor.setBleedEnabled}
          currentPage={editor.currentPageNumber}
          pageCount={editor.pages.length}
          onPageChange={editor.changePage}
          zoom={editor.zoom}
          onZoomChange={editor.setZoom}
          spreadMode={editor.spreadMode}
          onSpreadModeChange={editor.setSpreadMode}
          saveStatus={editor.saveStatus}
          saveError={editor.saveError}
        />
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <LeftSidebar
            bookId={bookId}
            onInsertText={editor.addTextElement}
            onInsertShape={editor.addShapeElement}
            onInsertArtwork={editor.addArtworkElement}
            onInsertImage={editor.addImageElement}
            onGenerateSudoku={editor.addSudokuPages}
            onGenerateWordSearch={editor.addWordSearchPages}
            onGenerateMaze={editor.addMazePages}
            onOpenColoringPage={() => setColoringDialogOpen(true)}
            onOpenUploads={() => setUploadsDialogOpen(true)}
          />
          <SidebarInset className="min-h-0 min-w-0 overflow-hidden bg-[#f5f6f3]">
            <div className="flex min-h-0 flex-1">
              <MainArea
                page={editor.currentPage}
                pageNumber={editor.currentPageNumber}
                selectedElementId={editor.selectedElementId}
                trimPreset={editor.trimPreset}
                bleedEnabled={editor.bleedEnabled}
                zoom={editor.zoom}
                spreadMode={editor.spreadMode}
                onSelectElement={editor.selectElement}
                onMoveElement={editor.moveElement}
                onResizeElement={editor.resizeElement}
                onRotateElement={editor.rotateElement}
                onUpdateText={editor.updateTextContent}
              />
            </div>
          </SidebarInset>
          <RightSidebar
            bookId={bookId}
            coloringDialogOpen={coloringDialogOpen}
            onColoringDialogOpenChange={setColoringDialogOpen}
            uploadsDialogOpen={uploadsDialogOpen}
            onUploadsDialogOpenChange={setUploadsDialogOpen}
          />
        </div>
        <PagesFooter
          pages={editor.pages}
          currentPageId={editor.currentPageId}
          onSelectPage={editor.selectPage}
          onAddPage={editor.addBlankPage}
          onClonePage={editor.clonePage}
          onDeletePage={deletePage}
          coverPageId={coverPageId}
          onSetCover={(page) => void setCover(page)}
          coverSavingPageId={coverSavingPageId}
          onGenerateSolutions={editor.generatePuzzleSolutions}
        />
      </SidebarProvider>
    </TooltipProvider>
  );
}

function waitForPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

async function renderCoverCanvas(canvas: HTMLElement, bookId: string) {
  const bounds = canvas.getBoundingClientRect();
  if (bounds.width === 0 || bounds.height === 0) {
    throw new Error("The selected page has no rendered dimensions.");
  }

  const host = document.createElement("div");
  Object.assign(host.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: `${bounds.width}px`,
    height: `${bounds.height}px`,
    overflow: "hidden",
  });

  const captureCanvas = canvas.cloneNode(true) as HTMLElement;
  console.log("Cloned canvas for cover rendering:", captureCanvas);
  Object.assign(captureCanvas.style, {
    position: "relative",
    inset: "auto",
    display: "block",
    width: `${bounds.width}px`,
    height: `${bounds.height}px`,
    margin: "0",
    boxShadow: "none",
  });
  for (const image of captureCanvas.querySelectorAll<HTMLImageElement>("img")) {
    const fileId = image.closest<HTMLElement>("[data-file-id]")?.dataset.fileId;
    if (fileId) {
      image.removeAttribute("srcset");
      image.src = `/api/books/${encodeURIComponent(bookId)}/files/${encodeURIComponent(fileId)}`;
    }
  }
  host.append(captureCanvas);
  document.body.append(host);

  try {
    await waitForPaint();
    await Promise.all(
      Array.from(captureCanvas.querySelectorAll("img")).map((image) =>
        image.decode(),
      ),
    );

    const blob = await toBlob(captureCanvas, {
      backgroundColor: "#fffefa",
      pixelRatio: Math.min(5, 1200 / bounds.width),
      filter: (node) =>
        !(node instanceof HTMLElement && node.dataset.coverExclude === "true"),
      style: { boxShadow: "none" },
    });
    if (!blob || blob.size === 0) {
      throw new Error("The cover image could not be created.");
    }
    return blob;
  } finally {
    host.remove();
  }
}
