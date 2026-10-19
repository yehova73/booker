"use client";

import { useRef, useState, type ChangeEvent } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ChevronRight,
  Circle,
  Image as ImageIcon,
  Layers2,
  Minus,
  Puzzle,
  Shapes,
  Sparkles,
  Type,
  Upload,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarMenuButton,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type {
  MazeGenerationSettings,
  ShapeType,
  SudokuDifficulty,
  TextStyle,
  WordSearchGenerationSettings,
} from "./editor-types";
import { ART_LIBRARY, SHAPE_LIBRARY } from "@/lib/designAssets";
import { SudokuGeneratorDialog } from "./sudoku-generator-dialog";
import { WordSearchGeneratorDialog } from "./word-search-generator-dialog";
import { MazeGeneratorDialog } from "./maze-generator-dialog";
import { uploadFileToS3 } from "@/utils/file-upload";

const textOptions: { label: string; style: TextStyle }[] = [
  { label: "Paragraph", style: "paragraph" },
  { label: "Heading", style: "heading" },
  { label: "Subheading", style: "subheading" },
  { label: "Body text", style: "body" },
  { label: "Bullet list", style: "bullet-list" },
  { label: "Numbered list", style: "numbered-list" },
  { label: "Pull quote", style: "pull-quote" },
  { label: "Caption", style: "caption" },
  { label: "Chapter title", style: "chapter-title" },
];

const categories: { title: string; icon: LucideIcon; items: string[] }[] = [
  { title: "Text", icon: Type, items: textOptions.map(({ label }) => label) },
  {
    title: "Shapes",
    icon: Shapes,
    items: SHAPE_LIBRARY.map(({ label }) => label),
  },
  {
    title: "Artwork",
    icon: ImageIcon,
    items: ART_LIBRARY.map(({ label }) => label),
  },
  {
    title: "Puzzles",
    icon: Puzzle,
    items: [
      "Sudoku",
      "Word search",
      "Maze",
      "Crossword",
      "Word scramble",
      "Logic puzzle",
      "Coloring page",
    ],
  },
];

export function LeftSidebar({
  onInsertText,
  onInsertShape,
  onInsertArtwork,
  onInsertImage,
  onGenerateSudoku,
  onGenerateWordSearch,
  onGenerateMaze,
  onOpenColoringPage,
}: {
  onInsertText: (style: TextStyle) => void;
  onInsertShape: (shapeType: ShapeType) => void;
  onInsertArtwork: (artKey: string) => void;
  onInsertImage: (fileId: string, src: string, alt: string) => void;
  onGenerateSudoku: (
    squares: 2 | 3 | 4 | 5,
    difficulty: SudokuDifficulty,
    pageCount: number,
  ) => Promise<void>;
  onGenerateWordSearch: (
    settings: WordSearchGenerationSettings,
  ) => Promise<void>;
  onGenerateMaze: (settings: MazeGenerationSettings) => Promise<void>;
  onOpenColoringPage: () => void;
}) {
  const { open } = useSidebar("left");
  const [sudokuDialogOpen, setSudokuDialogOpen] = useState(false);
  const [wordSearchDialogOpen, setWordSearchDialogOpen] = useState(false);
  const [mazeDialogOpen, setMazeDialogOpen] = useState(false);
  return (
    <Sidebar
      aria-label="Book content"
      className="absolute inset-y-0 h-auto border-[#e5e8e3] bg-white"
      sidebarKey="left"
      collapsible="icon"
      width="248px"
    >
      <SidebarContent className="bg-white px-2.5 py-3">
        <nav aria-label="Book content" className="flex-1">
          <div className="space-y-1">
            {categories.map(({ title, icon: Icon, items }) => (
              <div key={title}>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <SidebarMenuButton className="cursor-pointer h-10 w-full justify-start gap-3 px-2.5 text-[13px] font-medium text-[#46524a] hover:bg-[#f3f6f2] hover:text-[#315d44] max-sm:justify-center max-sm:px-0" />
                    }
                  >
                    <span
                      className={cn(
                        "flex size-7 items-center justify-center rounded-lg transition",
                        open && "bg-[#f3f5f2] text-[#718077]",
                      )}
                    >
                      <Icon className="size-4" strokeWidth={1.8} />
                    </span>
                    <span className="flex-1 text-left max-sm:hidden">
                      {title}
                    </span>
                    <ChevronRight className="size-3.5 text-[#9aa39d] max-sm:hidden" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-60"
                    side="right"
                  >
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="px-2 py-1.5">
                        {title === "Text"
                          ? "Add text"
                          : title === "Shapes"
                            ? "Add shape"
                            : title === "Artwork"
                              ? "Add artwork"
                                  : title === "Puzzles"
                                    ? "Add puzzle"
                                  : "Coming soon"}
                      </DropdownMenuLabel>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      {items.map((item) => (
                        <DropdownMenuItem
                          className="cursor-pointer gap-2 px-2 py-2"
                          disabled={
                            title !== "Text" &&
                            title !== "Shapes" &&
                            title !== "Artwork" &&
                            !(
                              title === "Puzzles" &&
                              (item === "Sudoku" ||
                                item === "Word search" ||
                                item === "Maze" ||
                                item === "Coloring page")
                            )
                          }
                          key={item}
                          onClick={() => {
                            if (title === "Text") {
                              const option = textOptions.find(
                                (candidate) => candidate.label === item,
                              );
                              if (option) onInsertText(option.style);
                            } else if (title === "Shapes") {
                              const option = SHAPE_LIBRARY.find(
                                (candidate) => candidate.label === item,
                              );
                              if (option) onInsertShape(option.shapeType);
                            } else if (title === "Artwork") {
                              const option = ART_LIBRARY.find(
                                (candidate) => candidate.label === item,
                              );
                              if (option) onInsertArtwork(option.key);
                            } else if (
                              title === "Puzzles" &&
                              item === "Sudoku"
                            ) {
                              setSudokuDialogOpen(true);
                            } else if (
                              title === "Puzzles" &&
                              item === "Word search"
                            ) {
                              setWordSearchDialogOpen(true);
                            } else if (
                              title === "Puzzles" &&
                              item === "Maze"
                            ) {
                              setMazeDialogOpen(true);
                            } else if (
                              title === "Puzzles" &&
                              item === "Coloring page"
                            ) {
                              onOpenColoringPage();
                            }
                          }}
                        >
                          <span className="flex size-6 items-center justify-center rounded-md bg-[#f3f6f2] text-[#66816d]">
                            <InsertIcon item={item} />
                          </span>
                          {item}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                {title === "Artwork" && (
                  <ImageMenuButton
                    onInsertImage={onInsertImage}
                    open={open}
                  />
                )}
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          <SidebarGroupLabel className="-mt-1 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a0a8a2] max-sm:hidden">
            Your library
          </SidebarGroupLabel>
          <div className="space-y-1">
            <LibraryButton icon={Upload} label="Uploads" open={open} />
            <LibraryButton icon={Layers2} label="Templates" open={open} />
          </div>
        </nav>
      </SidebarContent>
      <SudokuGeneratorDialog
        open={sudokuDialogOpen}
        onOpenChange={setSudokuDialogOpen}
        onGenerate={onGenerateSudoku}
      />
      <WordSearchGeneratorDialog
        open={wordSearchDialogOpen}
        onOpenChange={setWordSearchDialogOpen}
        onGenerate={onGenerateWordSearch}
      />
      <MazeGeneratorDialog
        open={mazeDialogOpen}
        onOpenChange={setMazeDialogOpen}
        onGenerate={onGenerateMaze}
      />
    </Sidebar>
  );
}

function ImageMenuButton({
  onInsertImage,
  open,
}: {
  onInsertImage: (fileId: string, src: string, alt: string) => void;
  open: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setUploadError(null);
    setIsUploading(true);
    try {
      const image = await uploadFileToS3(file);
      onInsertImage(image.fileId, image.src, file.name);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "The image could not be uploaded.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleGenerateImage() {
    const description = window.prompt("Describe the image you want to generate:");
    const prompt = description?.trim();
    if (!prompt) return;

    setUploadError(null);
    setIsGenerating(true);
    try {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f3f6f2"/><rect x="20" y="20" width="472" height="472" fill="none" stroke="#66816d" stroke-width="8"/><text x="256" y="256" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="600" fill="#315d44">AI Generated</text></svg>`;
      const file = await svgToPngFile(svg, "generated-image.png");
      const image = await uploadFileToS3(file);
      onInsertImage(image.fileId, image.src, `AI generated: ${prompt}`);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "The image could not be generated.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div>
      <input
        accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
        aria-hidden="true"
        className="sr-only"
        onChange={handleFileChange}
        ref={inputRef}
        disabled={isUploading}
        tabIndex={-1}
        type="file"
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <SidebarMenuButton className="h-10 w-full justify-start gap-3 px-2.5 text-[13px] font-medium text-[#46524a] hover:bg-[#f3f6f2] hover:text-[#315d44] max-sm:justify-center max-sm:px-0" />
          }
        >
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-lg transition",
              open && "bg-[#f3f5f2] text-[#718077]",
            )}
          >
            <ImageIcon className="size-4" strokeWidth={1.8} />
          </span>
          <span className="flex-1 text-left max-sm:hidden">Image</span>
          <ChevronRight className="size-3.5 text-[#9aa39d] max-sm:hidden" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60" side="right">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2 py-1.5">
              Add image
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              className="cursor-pointer gap-2 px-2 py-2"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
            >
              <span className="flex size-6 items-center justify-center rounded-md bg-[#f3f6f2] text-[#66816d]">
                <Upload className="size-3.5" />
              </span>
              Upload image
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-2 px-2 py-2"
              disabled={isGenerating || isUploading}
              onClick={handleGenerateImage}
            >
              <span className="flex size-6 items-center justify-center rounded-md bg-[#f3f6f2] text-[#66816d]">
                <Sparkles className="size-3.5" />
              </span>
              {isGenerating ? "Generating..." : "Generate with AI"}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {uploadError && (
        <p aria-live="polite" className="px-2 py-1 text-[10px] text-red-600">
          {uploadError}
        </p>
      )}
    </div>
  );
}

async function svgToPngFile(svg: string, fileName: string) {
  const objectUrl = URL.createObjectURL(
    new Blob([svg], { type: "image/svg+xml" }),
  );
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("The generated image could not be prepared.");
    context.drawImage(image, 0, 0);

    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("The generated image could not be prepared."));
      }, "image/png");
    });
    return new File([png], fileName, { type: "image/png" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function LibraryButton({
  icon: Icon,
  label,
  open,
}: {
  icon: LucideIcon;
  label: string;
  open?: boolean;
}) {
  return (
    <SidebarMenuButton
      className="h-10 w-full justify-start gap-3 px-2.5 text-[13px] font-medium text-[#647067] hover:bg-[#f3f6f2] max-sm:justify-center max-sm:px-0"
      disabled
    >
      <span
        className={cn(
          "flex size-7 items-center justify-center rounded-lg transition",
          open && "bg-[#f3f5f2] text-[#718077]",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="max-sm:hidden">{label}</span>
    </SidebarMenuButton>
  );
}

function InsertIcon({ item }: { item: string }) {
  const name = item.toLowerCase();
  if (name.includes("image") || name.includes("illustration"))
    return <ImageIcon className="size-3.5" />;
  if (name.includes("circle") || name.includes("ellipse"))
    return <Circle className="size-3.5" />;
  if (
    [
      "sudoku",
      "word search",
      "maze",
      "crossword",
      "word scramble",
      "logic puzzle",
    ].includes(name)
  ) {
    return <Puzzle className="size-3.5" />;
  }
  if (name.includes("text") || name.includes("heading"))
    return <Type className="size-3.5" />;
  if (name.includes("divider") || name === "line")
    return <Minus className="size-3.5" />;
  return <Shapes className="size-3.5" />;
}
