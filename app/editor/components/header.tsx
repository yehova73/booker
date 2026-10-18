"use client";

import {
  ArrowLeft,
  ArrowRight,
  FileCheck2,
  FileImage,
  Grid2X2,
  Square,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";

import { BookNameEditor } from "./book-name-editor";
import type {
  SaveStatus,
  SpreadMode,
  TrimPreset,
  ZoomLevel,
} from "./editor-types";

const trimOptions = [
  { value: "letter", name: "Letter Size", dimensions: '8.5" × 11"' },
  { value: "paperback", name: "Standard Paperback", dimensions: '6" × 9"' },
  {
    value: "square",
    name: "Square Activity Book",
    dimensions: '8.25" × 8.25"',
  },
] as const;

type EditorHeaderProps = {
  bookName: string;
  onBookNameChange: (bookName: string) => void;
  trimPreset: TrimPreset;
  onTrimPresetChange: (value: TrimPreset) => void;
  bleedEnabled: boolean;
  onBleedChange: (value: boolean) => void;
  currentPage: number;
  onPageChange: (direction: -1 | 1) => void;
  pageCount: number;
  zoom: ZoomLevel;
  onZoomChange: (value: ZoomLevel) => void;
  spreadMode: SpreadMode;
  onSpreadModeChange: (value: SpreadMode) => void;
  saveStatus: SaveStatus;
  saveError: string | null;
};

export function EditorHeader({
  bookName,
  onBookNameChange,
  trimPreset,
  onTrimPresetChange,
  bleedEnabled,
  onBleedChange,
  currentPage,
  onPageChange,
  pageCount,
  zoom,
  onZoomChange,
  spreadMode,
  onSpreadModeChange,
  saveStatus,
  saveError,
}: EditorHeaderProps) {
  const activeTrim = trimOptions.find((option) => option.value === trimPreset)!;
  const {
    isMobile: isContentSidebarMobile,
    open: contentSidebarOpen,
    openMobile: contentSidebarMobileOpen,
  } = useSidebar("left");
  const {
    isMobile: isSettingsSidebarMobile,
    open: settingsSidebarOpen,
    openMobile: settingsSidebarMobileOpen,
  } = useSidebar("right");

  return (
    <header className="z-10 border-b border-[#e7e9e5] bg-white">
      <div className="grid min-h-16 grid grid-cols-1 lg:grid-cols-3 p-2">
        <div className="flex items-center justify-start gap-2">
          <SidebarTrigger
            // aria-expanded={
            //   isContentSidebarMobile
            //     ? contentSidebarMobileOpen
            //     : contentSidebarOpen
            // }
            aria-label="Toggle content sidebar"
            className="size-8 text-[#637067]"
            sidebarKey="left"
            title="Toggle content sidebar"
          />
          <Separator orientation="vertical" />
          <BookNameEditor
            bookName={bookName}
            onBookNameChange={onBookNameChange}
          />
          <div className="flex items-center gap-2">
            <Select
              value={trimPreset}
              onValueChange={(value) => {
                if (value) onTrimPresetChange(value as TrimPreset);
              }}
            >
              <SelectTrigger className="h-8 w-[120px] border-[#e4e8e3] bg-white text-xs">
                <SelectValue>
                  {activeTrim.dimensions} ({activeTrim.name})
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="w-auto" align="start">
                {trimOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span>{option.dimensions}</span>
                    <span className="text-muted-foreground">{option.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={bleedEnabled ? "default" : "outline"}
              onClick={() => onBleedChange(!bleedEnabled)}
            >
              +0.125 in
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 justify-center">
          <div className="flex items-center gap-1.5">
            <Button
              aria-label="Previous page"
              className="size-7 text-[#617067]"
              disabled={currentPage === 1}
              onClick={() => onPageChange(-1)}
              size="icon"
              variant="ghost"
            >
              <ArrowLeft />
            </Button>
            <span className="min-w-[93px] text-center text-xs font-medium text-[#424e47]">
              Page {currentPage}{" "}
              <span className="text-[#9aa19c]">/ {pageCount}</span>
            </span>
            <Button
              aria-label="Next page"
              className="size-7 text-[#617067]"
              disabled={currentPage === pageCount}
              onClick={() => onPageChange(1)}
              size="icon"
              variant="ghost"
            >
              <ArrowRight />
            </Button>
          </div>
          <Separator orientation="vertical" />
          <div className="flex items-center gap-2">
            <Button
              aria-label="Zoom out"
              className="size-7 text-[#617067]"
              onClick={() => onZoomChange("50%")}
              size="icon"
              variant="ghost"
            >
              <ZoomOut />
            </Button>
            <Select
              value={zoom}
              onValueChange={(value) =>
                value && onZoomChange(value as ZoomLevel)
              }
            >
              <SelectTrigger
                aria-label="Zoom level"
                className="h-8 w-[88px] border-[#e4e8e3] bg-white text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["50%", "75%", "100%", "Fit"] as ZoomLevel[]).map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
              <Button
                aria-label="Zoom in"
                className="size-7 text-[#617067]"
                onClick={() => onZoomChange("100%")}
                size="icon"
                variant="ghost"
              >
                <ZoomIn />
              </Button>
            </Select>
          </div>
          <Separator orientation="vertical" />

          <Button
            aria-pressed={spreadMode === "single"}
            onClick={() =>
              onSpreadModeChange(spreadMode === "single" ? "spread" : "single")
            }
            variant={spreadMode === "single" ? "default" : "ghost"}
          >
            {spreadMode === "single" && <Square className="size-3.5" />}
            {spreadMode === "spread" && <Grid2X2 className="size-3.5" />}
            {spreadMode === "single" ? "Single" : "2-Up"}
          </Button>
        </div>
        <div className="flex items-center gap-4 justify-end">
          <Button
            className="hidden gap-2 border-[#e6e9e5] text-[#58645d] sm:inline-flex"
            variant="outline"
          >
            <FileCheck2 className="size-4 text-[#6b9076]" />
            <span>Pre-flight check</span>
            <Badge className="border-0 bg-[#edf5ed] px-1.5 py-0 text-[10px] text-[#4d7557]">
              Ready
            </Badge>
          </Button>
          <Button className="gap-2 bg-[#315d44] px-3.5 text-white hover:bg-[#284d38]">
            <FileImage className="size-4" />
            Export KDP PDF
          </Button>
          <SidebarTrigger
            // aria-expanded={
            //   isSettingsSidebarMobile
            //     ? settingsSidebarMobileOpen
            //     : settingsSidebarOpen
            // }
            aria-label="Toggle page settings sidebar"
            className="size-8 text-[#637067]"
            side="right"
            sidebarKey="right"
            title="Toggle page settings sidebar"
          />
        </div>
      </div>
    </header>
  );
}
