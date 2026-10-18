"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  ChevronRight,
  Circle,
  Image as ImageIcon,
  Layers2,
  LayoutTemplate,
  Minus,
  Puzzle,
  Shapes,
  Sparkles,
  Type,
  Upload,
  WandSparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
  SidebarFooter,
  SidebarMenuButton,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { ShapeType, TextStyle } from "./editor-types";

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

const shapeOptions: { label: string; shapeType: ShapeType }[] = [
  { label: "Rectangle", shapeType: "rectangle" },
  { label: "Circle", shapeType: "circle" },
  { label: "Ellipse", shapeType: "ellipse" },
  { label: "Triangle", shapeType: "triangle" },
  { label: "Star", shapeType: "star" },
  { label: "Pentagon", shapeType: "pentagon" },
  { label: "Line", shapeType: "line" },
  { label: "Arrow", shapeType: "arrow" },
  { label: "Speech bubble", shapeType: "speech-bubble" },
  { label: "Divider", shapeType: "divider" },
];

const categories: { title: string; icon: LucideIcon; items: string[] }[] = [
  { title: "Text", icon: Type, items: textOptions.map(({ label }) => label) },
  {
    title: "Shapes",
    icon: Shapes,
    items: shapeOptions.map(({ label }) => label),
  },
  {
    title: "Image",
    icon: ImageIcon,
    items: ["Upload image", "Image frame", "Illustration", "Background image"],
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
  {
    title: "Decor & extras",
    icon: Sparkles,
    items: [
      "Sticker",
      "Icon",
      "Border",
      "Page number",
      "Running header",
      "Table of contents",
      "QR code",
      "Callout",
      "Map",
    ],
  },
  {
    title: "Layouts",
    icon: LayoutTemplate,
    items: [
      "Page template",
      "Two-column layout",
      "Activity layout",
      "Blank page",
    ],
  },
];

export function LeftSidebar({
  onInsertText,
  onInsertShape,
}: {
  onInsertText: (style: TextStyle) => void;
  onInsertShape: (shapeType: ShapeType) => void;
}) {
  const { open } = useSidebar("left");
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
              <DropdownMenu key={title}>
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
                          : "Coming soon"}
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    {items.map((item) => (
                      <DropdownMenuItem
                        className="cursor-pointer gap-2 px-2 py-2"
                        disabled={title !== "Text" && title !== "Shapes"}
                        key={item}
                        onClick={() => {
                          if (title === "Text") {
                            const option = textOptions.find(
                              (candidate) => candidate.label === item,
                            );
                            if (option) onInsertText(option.style);
                          } else if (title === "Shapes") {
                            const option = shapeOptions.find(
                              (candidate) => candidate.label === item,
                            );
                            if (option) onInsertShape(option.shapeType);
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

      <SidebarFooter
        className={cn(
          "border-t border-[#eef0ed] p-3 max-sm:hidden transition-all opacity-100",
          !open && "opacity-0 bg-sidebar",
        )}
      >
        <div className="rounded-xl bg-[#f6f8f5] p-3">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-[#7a9b7e] shadow-sm">
              <WandSparkles className="size-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#45554a]">
                Need a little spark?
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-[#879189]">
                Start with a ready-made page layout.
              </p>
              <Button
                className="mt-2 h-6 px-0 text-[11px] font-semibold text-[#47704f] hover:bg-transparent hover:text-[#315d44]"
                disabled
                variant="ghost"
              >
                Browse layouts <ArrowRight className="ml-1 size-3" />
              </Button>
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
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
