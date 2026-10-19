"use client";

import {
  AlignVerticalSpaceAround,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Image as ImageIcon,
  Puzzle,
  Shapes,
  Sparkles,
  Trash2,
  Type,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ART_LIBRARY } from "@/lib/designAssets";
import { useEditorContext } from "../editor-context";
import { ArtworkElementOptions } from "./artwork-element-options";
import { ColoringPageDialog } from "./coloring-page-dialog";
import type { EditorElement } from "./editor-types";
import { ImageElementOptions } from "./image-element-options";
import { MazeElementOptions } from "./maze-element-options";
import { ShapeElementOptions } from "./shape-element-options";
import { SudokuElementOptions } from "./sudoku-element-options";
import { TextElementOptions } from "./text-element-options";
import { UploadsDialog } from "./uploads-dialog";
import {
  WordSearchGridElementOptions,
  WordSearchWordsElementOptions,
} from "./word-search-element-options";

export function RightSidebar({
  bookId,
  coloringDialogOpen,
  onColoringDialogOpenChange,
  uploadsDialogOpen,
  onUploadsDialogOpenChange,
}: {
  bookId: string;
  coloringDialogOpen: boolean;
  onColoringDialogOpenChange: (open: boolean) => void;
  uploadsDialogOpen: boolean;
  onUploadsDialogOpenChange: (open: boolean) => void;
}) {
  const editor = useEditorContext();
  const layers = [...editor.currentPage.elements].sort(
    (first, second) => second.zIndex - first.zIndex,
  );
  const selectedElement = layers.find(
    (element) => element.id === editor.selectedElementId,
  );

  return (
    <Sidebar
      aria-label="Page settings"
      className="absolute inset-y-0 h-auto border-[#e5e8e3] bg-white"
      side="right"
      sidebarKey="right"
      width="292px"
    >
      <SidebarContent className="bg-white p-0">
        <Tabs
          className="flex min-h-0 flex-1 flex-col gap-0"
          defaultValue="current-page"
        >
          <div className="border-b border-[#edf0ec] ">
            <TabsList className="grid h-9 w-full grid-cols-2 bg-transparent">
              <TabsTrigger className="text-xs" value="current-page">
                Current page
              </TabsTrigger>
              <TabsTrigger className="text-xs" value="design">
                Design
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent className="min-h-0 overflow-y-auto" value="current-page">
            <div className="space-y-2 p-3 flex flex-col h-full flex flex-col">
              {!selectedElement && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-[#3d4b41]">
                      {editor.currentPage.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#929b94]">
                      {layers.length}{" "}
                      {layers.length === 1 ? "element" : "elements"} on this
                      page
                    </p>
                  </div>
                  <section
                    aria-label="Page layers"
                    className="flex flex-col grow"
                  >
                    <div className="space-y-1">
                      {layers.length === 0 ? (
                        <p className="rounded-lg bg-[#f7f8f6] py-2 text-[11px] text-[#8d9790]">
                          Add an element to start building this page.
                        </p>
                      ) : (
                        layers.map((element, index) => (
                          <LayerRow
                            element={element}
                            key={element.id}
                            selected={element.id === editor.selectedElementId}
                            canMoveUp={index > 0}
                            canMoveDown={index < layers.length - 1}
                            onSelect={() => editor.selectElement(element.id)}
                            onMoveUp={() =>
                              editor.reorderElement(element.id, 1)
                            }
                            onMoveDown={() =>
                              editor.reorderElement(element.id, -1)
                            }
                            onDelete={() => editor.deleteElement(element.id)}
                          />
                        ))
                      )}
                    </div>
                    <div className="mt-auto flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg bg-[#f7f8f6] px-4 text-center">
                      <AlignVerticalSpaceAround className="size-4 text-[#91a092]" />
                      <p className="text-[11px] leading-relaxed text-[#89938c]">
                        Select an element on the page or in Layers to edit its
                        settings.
                      </p>
                    </div>
                  </section>{" "}
                </>
              )}

              {selectedElement && (
                <section aria-label="Selected element options">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-[#46534a] flex items-center gap-1 -ml-2">
                      <Button
                        size="icon-xs"
                        variant={"ghost"}
                        onClick={() => editor.selectElement(null)}
                      >
                        <ArrowLeft />
                      </Button>
                      Element options
                    </h3>
                    <span className="rounded-md bg-[#f2f5f1] px-2 py-1 text-[10px] capitalize text-[#738076]">
                      {selectedElement.kind}
                    </span>
                  </div>
                  {selectedElement.kind === "text" ? (
                    <TextElementOptions
                      element={selectedElement}
                      onChange={(updates) =>
                        editor.updateTextElement(selectedElement.id, updates)
                      }
                    />
                  ) : selectedElement.kind === "shape" ? (
                    <ShapeElementOptions
                      element={selectedElement}
                      trimPreset={editor.trimPreset}
                      onChange={(updates) =>
                        editor.updateShapeElement(selectedElement.id, updates)
                      }
                    />
                  ) : selectedElement.kind === "artwork" ? (
                    <ArtworkElementOptions
                      element={selectedElement}
                      trimPreset={editor.trimPreset}
                      onChange={(updates) =>
                        editor.updateArtworkElement(selectedElement.id, updates)
                      }
                    />
                  ) : selectedElement.kind === "image" ? (
                    <ImageElementOptions
                      element={selectedElement}
                      trimPreset={editor.trimPreset}
                      onChange={(updates) =>
                        editor.updateImageElement(selectedElement.id, updates)
                      }
                    />
                  ) : selectedElement.kind === "sudoku" ? (
                    <SudokuElementOptions
                      element={selectedElement}
                      trimPreset={editor.trimPreset}
                      onChange={(updates) =>
                        editor.updateSudokuElement(selectedElement.id, updates)
                      }
                      onDifficultyChange={(difficulty) =>
                        editor.setSudokuDifficulty(
                          selectedElement.id,
                          difficulty,
                        )
                      }
                    />
                  ) : selectedElement.kind === "word-search" ? (
                    <WordSearchGridElementOptions
                      element={selectedElement}
                      onChange={(updates) =>
                        editor.updateWordSearchGridElement(
                          selectedElement.id,
                          updates,
                        )
                      }
                    />
                  ) : selectedElement.kind === "word-search-words" ? (
                    <WordSearchWordsElementOptions
                      element={selectedElement}
                      onChange={(updates) =>
                        editor.updateWordSearchWordsElement(
                          selectedElement.id,
                          updates,
                        )
                      }
                    />
                  ) : selectedElement.kind === "maze" ? (
                    <MazeElementOptions
                      element={selectedElement}
                      trimPreset={editor.trimPreset}
                      onChange={(updates) =>
                        editor.updateMazeElement(selectedElement.id, updates)
                      }
                    />
                  ) : (
                    <p className="text-[11px] text-[#909991]">
                      Options for this element are coming soon.
                    </p>
                  )}
                </section>
              )}
            </div>
          </TabsContent>

          <TabsContent
            className="m-3 space-y-3 rounded-lg bg-[#f7f8f6] p-4 text-[11px] leading-relaxed text-[#879189]"
            value="design"
          >
            <div>
              <h3 className="text-xs font-semibold text-[#46534a]">
                Coloring pages
              </h3>
              <p className="mt-1">
                Create a page from your own images or preview mock AI-generated
                ideas.
              </p>
            </div>
            <Button
              className="w-full justify-start"
              onClick={() => onUploadsDialogOpenChange(true)}
              type="button"
              variant="outline"
            >
              <Upload />
              Browse uploads
            </Button>
            <Button
              className="w-full justify-start"
              onClick={() => onColoringDialogOpenChange(true)}
              type="button"
            >
              <Sparkles />
              Create coloring pages
            </Button>
          </TabsContent>
        </Tabs>
      </SidebarContent>
      <ColoringPageDialog
        bookId={bookId}
        open={coloringDialogOpen}
        onOpenChange={onColoringDialogOpenChange}
        onAddPages={editor.addColoringPages}
      />
      <UploadsDialog
        open={uploadsDialogOpen}
        onOpenChange={onUploadsDialogOpenChange}
        onAddImage={editor.addImageElement}
      />
    </Sidebar>
  );
}

function LayerRow({
  element,
  selected,
  canMoveUp,
  canMoveDown,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  element: EditorElement;
  selected: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const Icon =
    element.kind === "text"
      ? Type
      : element.kind === "image"
        ? ImageIcon
        : element.kind === "puzzle" ||
            element.kind === "sudoku" ||
            element.kind === "word-search" ||
            element.kind === "word-search-words" ||
            element.kind === "maze"
          ? Puzzle
          : element.kind === "artwork"
            ? ImageIcon
            : Shapes;

  return (
    <div
      className={`flex items-center gap-1 rounded-lg border -mx-2 px-1 py-0 ${
        selected
          ? "border-[#cbdccc] bg-[#f2f7f2]"
          : "border-transparent hover:bg-[#f7f8f6]"
      }`}
    >
      <Button
        className="h-8 min-w-0 flex-1 justify-start gap-2 px-1.5 text-left text-[11px] text-[#59655d]"
        onClick={onSelect}
        title={elementLabel(element)}
        variant="ghost"
      >
        <Icon className="size-3.5 shrink-0 text-[#7e9380]" />
        <span className="truncate">{elementLabel(element)}</span>
      </Button>
      <div className="flex shrink-0">
        <Button
          aria-label={`Move ${elementLabel(element)} layer up`}
          className="size-6 text-[#859087]"
          disabled={!canMoveUp}
          onClick={onMoveUp}
          size="icon"
          variant="ghost"
        >
          <ArrowUp />
        </Button>
        <Button
          aria-label={`Move ${elementLabel(element)} layer down`}
          className="size-6 text-[#859087]"
          disabled={!canMoveDown}
          onClick={onMoveDown}
          size="icon"
          variant="ghost"
        >
          <ArrowDown />
        </Button>
        <Button
          aria-label={`Delete ${elementLabel(element)}`}
          className="size-6 text-[#859087] hover:text-red-600"
          onClick={onDelete}
          size="icon"
          variant="ghost"
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}

function elementLabel(element: EditorElement) {
  if (element.kind === "text") {
    const content = element.content.split("\n")[0].trim();
    return content || `${element.textStyle} text`;
  }
  if (element.kind === "image") return element.alt || "Image";
  if (element.kind === "puzzle") return element.puzzleType;
  if (element.kind === "sudoku") return "Sudoku";
  if (element.kind === "word-search") return "Word Search Grid";
  if (element.kind === "word-search-words") return "Word Search Words";
  if (element.kind === "maze") return "Maze";
  if (element.kind === "artwork") {
    return (
      ART_LIBRARY.find((artwork) => artwork.key === element.artKey)?.label ??
      "Artwork"
    );
  }
  return element.shapeType;
}
