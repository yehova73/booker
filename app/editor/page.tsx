"use client";

import { useEffect } from "react";

import { EditorProvider, useEditorContext } from "./editor-context";
import { EditorHeader } from "./components/header";
import { LeftSidebar } from "./components/left-sidebar";
import { MainArea } from "./components/main-area";
import { PagesFooter } from "./components/pages-footer";
import { RightSidebar } from "./components/right-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function EditorPage() {
  return (
    <EditorProvider>
      <EditorWorkspace />
    </EditorProvider>
  );
}

function EditorWorkspace() {
  const editor = useEditorContext();
  const selectedElementId = editor.selectedElementId;
  const deleteElement = editor.deleteElement;

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
            onInsertText={editor.addTextElement}
            onInsertShape={editor.addShapeElement}
            onInsertArtwork={editor.addArtworkElement}
            onInsertImage={editor.addImageElement}
            onGenerateSudoku={editor.addSudokuPages}
            onGenerateWordSearch={editor.addWordSearchPages}
            onGenerateMaze={editor.addMazePages}
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
          <RightSidebar />
        </div>
        <PagesFooter
          pages={editor.pages}
          currentPageId={editor.currentPageId}
          onSelectPage={editor.selectPage}
          onAddPage={editor.addBlankPage}
          onClonePage={editor.clonePage}
          onDeletePage={editor.deletePage}
          onGenerateSolutions={editor.generatePuzzleSolutions}
        />
      </SidebarProvider>
    </TooltipProvider>
  );
}
