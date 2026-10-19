"use client";

import { useEffect, useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { PDFDocument } from "pdf-lib";
import { toast } from "sonner";

import { deleteFilesAction } from "@/actions/files";
import {
  createKdpPdfUploadAction,
  saveBookKdpExportAction,
} from "@/actions/books/kdp-export";
import { saveBookCoverAction } from "@/actions/books/save-book-cover";
import { uploadFileToS3 } from "@/utils/file-upload";
import { EditorProvider, useEditorContext } from "../editor-context";
import { EditorHeader } from "../components/header";
import { LeftSidebar } from "../components/left-sidebar";
import { MainArea } from "../components/main-area";
import { PagesFooter } from "../components/pages-footer";
import { RightSidebar } from "../components/right-sidebar";
import {
  getKdpPdfPageDimensions,
  KdpExportCanvas,
} from "../components/kdp-export-canvas";
import type { EditorPage, TrimPreset } from "../components/editor-types";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

const maxKdpPdfSize = 650_000_000;
const kdpPdfDpi = 300;

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
  const currentPageIndex = editor.currentPageNumber - 1;
  const spreadLeftIndex =
    currentPageIndex === 0
      ? -1
      : currentPageIndex % 2 === 1
        ? currentPageIndex
        : currentPageIndex - 1;
  const spreadPages: [EditorPage | null, EditorPage | null] = [
    spreadLeftIndex >= 0 ? (editor.pages[spreadLeftIndex] ?? null) : null,
    editor.pages[spreadLeftIndex + 1] ?? null,
  ];
  const spreadPageNumbers: [number | null, number | null] = [
    spreadLeftIndex >= 0 ? spreadLeftIndex + 1 : null,
    spreadLeftIndex + 1 < editor.pages.length
      ? spreadLeftIndex + 2
      : null,
  ];
  const spreadPageIds = spreadPages.flatMap((page) =>
    page ? [page.id] : [],
  );
  const pageNumberById = Object.fromEntries(
    editor.pages.map((page, index) => [page.id, index + 1]),
  );
  const [coloringDialogOpen, setColoringDialogOpen] = useState(false);
  const [uploadsDialogOpen, setUploadsDialogOpen] = useState(false);
  const [coverPageId, setCoverPageId] = useState(initialCoverPageId);
  const [selectedDesignElement, setSelectedDesignElement] = useState<{
    id: string;
    pageId: string;
  } | null>(null);
  const [coverSavingPageId, setCoverSavingPageId] = useState<string | null>(
    null,
  );
  const [kdpPdfExporting, setKdpPdfExporting] = useState(false);
  const kdpPdfExportInProgressRef = useRef(false);
  const [kdpExportPage, setKdpExportPage] = useState<{
    page: EditorPage;
    pageIndex: number;
    trimPreset: TrimPreset;
    bleedEnabled: boolean;
    pageNumber: number;
    pageNumberById: Record<string, number>;
    coverPageId: string | null;
    design: typeof editor.design;
  } | null>(null);
  const pendingKdpCanvasResolverRef = useRef<
    ((canvas: HTMLDivElement) => void) | null
  >(null);
  const coverSaveInProgressRef = useRef(false);
  const pendingAutomaticCoverRef = useRef<EditorPage | null>(null);
  const lastCoverRevisionRef = useRef<{
    pageId: string;
    revision: string;
  } | null>(null);
  const coverPage =
    editor.pages.find((page) => page.id === coverPageId) ?? null;
  const coverPageRef = useRef(coverPage);
  const selectPageRef = useRef(editor.selectPage);
  const activeCoverPageId = coverPage?.id;
  const coverRevision = coverPage
    ? JSON.stringify([editor.trimPreset, coverPage.elements])
    : null;
  const selectedElementId = editor.selectedElementId;
  const deleteElement = editor.deleteElement;
  const selectDesignElement = (id: string | null, pageId?: string) => {
    editor.selectElement(null);
    setSelectedDesignElement(
      id ? { id, pageId: pageId ?? editor.currentPageId } : null,
    );
  };
  const selectPageElement = (id: string | null) => {
    setSelectedDesignElement(null);
    editor.selectElement(id);
  };
  const moveDesignElement = (
    elementId: string,
    position: { x: number; y: number; pageId?: string },
  ) => {
    const element = editor.design.elements.find(
      (candidate) => candidate.id === elementId,
    );
    if (element) {
      editor.updateDesignElement(elementId, {
        ...element,
        x: position.x,
        y: position.y,
      });
    }
  };
  const resizeDesignElement = (
    elementId: string,
    size: { x: number; y: number; width: number; height: number },
  ) => {
    const element = editor.design.elements.find(
      (candidate) => candidate.id === elementId,
    );
    if (element) editor.updateDesignElement(elementId, { ...element, ...size });
  };
  const rotateDesignElement = (elementId: string, rotation: number) => {
    const element = editor.design.elements.find(
      (candidate) => candidate.id === elementId,
    );
    if (element) {
      editor.updateDesignElement(elementId, { ...element, rotation });
    }
  };
  const updateDesignText = (elementId: string, content: string) => {
    const element = editor.design.elements.find(
      (candidate) => candidate.id === elementId,
    );
    if (element?.kind === "text") {
      editor.updateDesignElement(elementId, { ...element, content });
    }
  };

  async function setCover(page: EditorPage, automatic = false) {
    if (coverSaveInProgressRef.current) {
      if (automatic) pendingAutomaticCoverRef.current = page;
      return;
    }

    coverSaveInProgressRef.current = true;
    setCoverSavingPageId(page.id);
    selectPageRef.current(page.id);
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
      if (!automatic) toast.success("Book cover saved");
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
      coverSaveInProgressRef.current = false;
      const pendingPage = pendingAutomaticCoverRef.current;
      pendingAutomaticCoverRef.current = null;
      if (pendingPage) void setCover(pendingPage, true);
    }
  }

  const setCoverRef = useRef(setCover);

  useEffect(() => {
    coverPageRef.current = coverPage;
    selectPageRef.current = editor.selectPage;
    setCoverRef.current = setCover;
  });

  useEffect(() => {
    if (activeCoverPageId === undefined || coverRevision === null) {
      lastCoverRevisionRef.current = null;
      pendingAutomaticCoverRef.current = null;
      return;
    }

    const lastCoverRevision = lastCoverRevisionRef.current;
    if (lastCoverRevision?.pageId !== activeCoverPageId) {
      lastCoverRevisionRef.current = {
        pageId: activeCoverPageId,
        revision: coverRevision,
      };
      pendingAutomaticCoverRef.current = null;
      return;
    }
    if (lastCoverRevision.revision === coverRevision) return;

    lastCoverRevision.revision = coverRevision;
    pendingAutomaticCoverRef.current = null;
    const timeout = setTimeout(() => {
      const latestCoverPage = coverPageRef.current;
      if (latestCoverPage?.id === activeCoverPageId) {
        void setCoverRef.current(latestCoverPage, true);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [activeCoverPageId, coverRevision]);

  function deletePage(pageId: string) {
    editor.deletePage(pageId);
    if (coverPageId === pageId) setCoverPageId(null);
  }

  function waitForKdpCanvas(
    exportPage: NonNullable<typeof kdpExportPage>,
  ): Promise<HTMLDivElement> {
    return new Promise((resolve) => {
      pendingKdpCanvasResolverRef.current = resolve;
      setKdpExportPage(exportPage);
    });
  }

  function handleKdpCanvasReady(canvas: HTMLDivElement) {
    const resolve = pendingKdpCanvasResolverRef.current;
    if (!resolve) return;
    pendingKdpCanvasResolverRef.current = null;
    resolve(canvas);
  }

  async function exportKdpPdf() {
    if (kdpPdfExportInProgressRef.current) return;

    const bookName = editor.bookName;
    const trimPreset = editor.trimPreset;
    const bleedEnabled = editor.bleedEnabled;
    const coverPage = editor.pages.find((page) => page.id === coverPageId);
    const exportPages = coverPage
      ? [
          coverPage,
          ...editor.pages.filter((page) => page.id !== coverPage.id),
        ]
      : [...editor.pages];

    kdpPdfExportInProgressRef.current = true;
    setKdpPdfExporting(true);
    let uploadedFileId: string | null = null;
    try {
      const pdf = await PDFDocument.create();
      pdf.setTitle(bookName);
      pdf.setCreator("Booker");
      pdf.setSubject("KDP print PDF with cover page");

      for (const [pageIndex, page] of exportPages.entries()) {
        const canvas = await waitForKdpCanvas({
          page,
          pageIndex,
          trimPreset,
          bleedEnabled,
          pageNumber: pageNumberById[page.id] ?? pageIndex + 1,
          pageNumberById,
          coverPageId,
          design: editor.design,
        });
        await document.fonts.ready;
        await waitForCanvasImages(canvas, bookId);

        const pageBlob = await toBlob(canvas, {
          backgroundColor: "#fffefa",
          pixelRatio: kdpPdfDpi / 96,
        });
        if (!pageBlob || pageBlob.size === 0) {
          throw new Error(`Page ${pageIndex + 1} could not be rendered.`);
        }

        const dimensions = getKdpPdfPageDimensions(trimPreset, bleedEnabled);
        const pageWidth = dimensions.width * 72;
        const pageHeight = dimensions.height * 72;
        const image = await pdf.embedPng(await pageBlob.arrayBuffer());
        const pdfPage = pdf.addPage([pageWidth, pageHeight]);
        pdfPage.drawImage(image, {
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
        });
      }

      const pdfBytes = await pdf.save();
      if (pdfBytes.byteLength > maxKdpPdfSize) {
        throw new Error("The PDF exceeds KDP's 650 MB file-size limit.");
      }
      const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength);
      new Uint8Array(pdfBuffer).set(pdfBytes);

      const upload = await createKdpPdfUploadAction(
        bookId,
        pdfBuffer.byteLength,
      );
      if (upload.status !== "ok" || !upload.data) {
        throw new Error(
          upload.message?.description ??
            upload.message?.title ??
            "The PDF upload could not be prepared.",
        );
      }
      uploadedFileId = upload.data.fileId;

      const uploadResponse = await fetch(upload.data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: pdfBuffer,
      });
      if (!uploadResponse.ok) {
        throw new Error(
          `PDF upload failed with HTTP ${uploadResponse.status}.`,
        );
      }

      const saved = await saveBookKdpExportAction(
        bookId,
        uploadedFileId,
        trimPreset,
        bleedEnabled,
      );
      if (saved.status !== "ok" || !saved.data) {
        throw new Error(
          saved.message?.description ??
            saved.message?.title ??
            "The PDF could not be linked to this book.",
        );
      }
      uploadedFileId = null;

      downloadPdf(
        new Blob([pdfBuffer], { type: "application/pdf" }),
        getKdpPdfFilename(bookName),
      );
      toast.success("KDP PDF exported", {
        description: `${exportPages.length} page${exportPages.length === 1 ? "" : "s"} saved to this book.`,
      });
    } catch (error) {
      let description =
        error instanceof Error
          ? error.message
          : "The KDP PDF could not be exported.";
      if (uploadedFileId) {
        try {
          const cleanup = await deleteFilesAction([uploadedFileId]);
          if (cleanup.status !== "ok") {
            description += ` ${cleanup.message?.description ?? cleanup.message?.title ?? "The unused PDF could not be removed."}`;
          }
        } catch (cleanupError) {
          description += ` ${cleanupError instanceof Error ? cleanupError.message : "The unused PDF could not be removed."}`;
        }
      }
      toast.error("KDP PDF export failed", { description });
    } finally {
      setKdpExportPage(null);
      kdpPdfExportInProgressRef.current = false;
      setKdpPdfExporting(false);
    }
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
          onPageChange={(direction) => {
            setSelectedDesignElement(null);
            editor.changePage(direction);
          }}
          zoom={editor.zoom}
          onZoomChange={editor.setZoom}
          spreadMode={editor.spreadMode}
          onSpreadModeChange={editor.setSpreadMode}
          saveStatus={editor.saveStatus}
          saveError={editor.saveError}
          exportingKdpPdf={kdpPdfExporting}
          onExportKdpPdf={() => void exportKdpPdf()}
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
                spreadPages={spreadPages}
                spreadPageNumbers={spreadPageNumbers}
                pageNumberById={pageNumberById}
                design={editor.design}
                coverPageId={coverPageId}
                selectedElementId={editor.selectedElementId}
                selectedDesignElementId={selectedDesignElement?.id ?? null}
                selectedDesignPageId={selectedDesignElement?.pageId ?? null}
                trimPreset={editor.trimPreset}
                bleedEnabled={editor.bleedEnabled}
                zoom={editor.zoom}
                spreadMode={editor.spreadMode}
                onSelectElement={selectPageElement}
                onSelectDesignElement={selectDesignElement}
                onMoveElement={editor.moveElement}
                onResizeElement={editor.resizeElement}
                onRotateElement={editor.rotateElement}
                onUpdateText={editor.updateTextContent}
                onMoveDesignElement={moveDesignElement}
                onResizeDesignElement={resizeDesignElement}
                onRotateDesignElement={rotateDesignElement}
                onUpdateDesignText={updateDesignText}
              />
            </div>
          </SidebarInset>
          <RightSidebar
            bookId={bookId}
            coverPageId={coverPageId}
            selectedDesignElementId={selectedDesignElement?.id ?? null}
            onSelectDesignElement={selectDesignElement}
            coloringDialogOpen={coloringDialogOpen}
            onColoringDialogOpenChange={setColoringDialogOpen}
            uploadsDialogOpen={uploadsDialogOpen}
            onUploadsDialogOpenChange={setUploadsDialogOpen}
          />
        </div>
        <PagesFooter
          pages={editor.pages}
          currentPageId={editor.currentPageId}
          inViewPageIds={
            editor.spreadMode === "spread"
              ? spreadPageIds
              : [editor.currentPageId]
          }
          onSelectPage={(pageId) => {
            setSelectedDesignElement(null);
            editor.selectPage(pageId);
          }}
          onAddPage={editor.addBlankPage}
          onClonePage={editor.clonePage}
          onDeletePage={deletePage}
          coverPageId={coverPageId}
          onSetCover={(page) => void setCover(page)}
          coverSavingPageId={coverSavingPageId}
          onGenerateSolutions={editor.generatePuzzleSolutions}
        />
        {kdpExportPage && (
          <KdpExportCanvas
            key={`${kdpExportPage.pageIndex}-${kdpExportPage.page.id}`}
            page={kdpExportPage.page}
            pageIndex={kdpExportPage.pageIndex}
            trimPreset={kdpExportPage.trimPreset}
            bleedEnabled={kdpExportPage.bleedEnabled}
            pageNumber={kdpExportPage.pageNumber}
            pageNumberById={kdpExportPage.pageNumberById}
            coverPageId={kdpExportPage.coverPageId}
            design={kdpExportPage.design}
            onReady={handleKdpCanvasReady}
          />
        )}
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

async function waitForCanvasImages(canvas: HTMLElement, bookId: string) {
  const images = Array.from(canvas.querySelectorAll<HTMLImageElement>("img"));
  for (const image of images) {
    const fileId = image.closest<HTMLElement>("[data-file-id]")?.dataset
      .fileId;
    if (fileId) {
      image.removeAttribute("srcset");
      image.src = `/api/books/${encodeURIComponent(bookId)}/files/${encodeURIComponent(fileId)}`;
    }
  }
  await Promise.all(images.map((image) => image.decode()));
}

function getKdpPdfFilename(bookName: string) {
  const safeName =
    bookName.replace(/[\u0000-\u001f<>:"/\\|?*]/g, "-").trim() || "book";
  return `${safeName}-kdp.pdf`;
}

function downloadPdf(file: Blob, filename: string) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
