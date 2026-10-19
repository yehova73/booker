"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BufferedColorInput } from "./buffered-color-input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ART_LIBRARY, SHAPE_LIBRARY } from "@/lib/designAssets";
import { useEditorContext } from "../editor-context";
import type {
  PageBorderStyle,
  PageNumberFormat,
  PageNumberPosition,
  RepeatingDesignElement,
  ShapeType,
} from "./editor-types";
import { ArtworkElementOptions } from "./artwork-element-options";
import { ShapeElementOptions } from "./shape-element-options";
import { TextElementOptions } from "./text-element-options";

export function DesignTab({
  coverPageId,
  selectedElementId,
  onSelectElement,
}: {
  coverPageId: string | null;
  selectedElementId: string | null;
  onSelectElement: (elementId: string | null, pageId?: string) => void;
}) {
  const editor = useEditorContext();
  const [shapeType, setShapeType] = useState<ShapeType>("rectangle");
  const [artKey, setArtKey] = useState<string>(
    ART_LIBRARY[0]?.key ?? "flower",
  );
  const excludedPageIds = useMemo(
    () => new Set(editor.design.excludedPageIds),
    [editor.design.excludedPageIds],
  );
  const selectedDesignElement =
    editor.design.elements.find((element) => element.id === selectedElementId) ??
    null;
  const designPageId =
    editor.currentPageId === coverPageId
      ? (editor.pages.find((page) => page.id !== coverPageId)?.id ??
        editor.currentPageId)
      : editor.currentPageId;

  function updatePageNumbers(
    updates: Partial<typeof editor.design.pageNumbers>,
  ) {
    editor.setBookDesign({
      ...editor.design,
      pageNumbers: { ...editor.design.pageNumbers, ...updates },
    });
  }

  function updatePageBorder(
    updates: Partial<typeof editor.design.pageBorder>,
  ) {
    editor.setBookDesign({
      ...editor.design,
      pageBorder: { ...editor.design.pageBorder, ...updates },
    });
  }

  function updateElement(
    elementId: string,
    update: (element: RepeatingDesignElement) => RepeatingDesignElement,
  ) {
    const current = editor.design.elements.find(
      (element) => element.id === elementId,
    );
    if (current) editor.updateDesignElement(elementId, update(current));
  }

  function toggleExcludedPage(pageId: string, checked: boolean) {
    const nextIds = checked
      ? [...editor.design.excludedPageIds, pageId]
      : editor.design.excludedPageIds.filter((id) => id !== pageId);
    editor.setBookDesign({
      ...editor.design,
      excludedPageIds: [...new Set(nextIds)],
    });
  }

  return (
    <div className="space-y-5 p-3">
      <div>
        <h3 className="text-[13px] font-semibold text-[#3d4b41]">
          Repeating design
        </h3>
        <p className="mt-1 text-[11px] leading-relaxed text-[#89938c]">
          These settings apply to interior pages. The cover is always excluded.
        </p>
      </div>

      <section aria-label="Pages that skip recurring design" className="space-y-2">
        <FieldLabel>Skip pages</FieldLabel>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                className="w-full justify-between border-[#e1e6e0] text-xs text-[#56645a]"
                variant="outline"
              />
            }
          >
            {excludedPageIds.size === 0
              ? "No pages skipped"
              : `${excludedPageIds.size} page${excludedPageIds.size === 1 ? "" : "s"} skipped`}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 w-64">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Skip recurring design on</DropdownMenuLabel>
              {editor.pages.map((page, index) => {
                const isCover = page.id === coverPageId;
                return (
                  <DropdownMenuCheckboxItem
                    checked={isCover || excludedPageIds.has(page.id)}
                    disabled={isCover}
                    key={page.id}
                    onCheckedChange={(checked) =>
                      toggleExcludedPage(page.id, checked === true)
                    }
                  >
                    Page {index + 1} · {page.title}
                    {isCover ? " (cover)" : ""}
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {excludedPageIds.size > 0 && (
          <Button
            className="h-6 px-1.5 text-[10px] text-[#758078]"
            onClick={() =>
              editor.setBookDesign({
                ...editor.design,
                excludedPageIds: [],
              })
            }
            size="sm"
            variant="ghost"
          >
            Clear skipped pages
          </Button>
        )}
      </section>

      <section aria-label="Page numbers" className="space-y-3 border-t border-[#edf0ec] pt-4">
        <ToggleRow
          checked={editor.design.pageNumbers.enabled}
          label="Page numbers"
          onChange={(enabled) => updatePageNumbers({ enabled })}
        />
        {editor.design.pageNumbers.enabled && (
          <div className="space-y-3">
            <Select
              value={editor.design.pageNumbers.format}
              onValueChange={(value) => {
                if (isPageNumberFormat(value)) {
                  updatePageNumbers({ format: value });
                }
              }}
            >
              <SelectTrigger aria-label="Page number format" className="w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="arabic">Arabic · 1, 2, 3</SelectItem>
                <SelectItem value="roman-lower">Roman · i, ii, iii</SelectItem>
                <SelectItem value="roman-upper">Roman · I, II, III</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={editor.design.pageNumbers.position}
              onValueChange={(value) => {
                if (isPageNumberPosition(value)) {
                  updatePageNumbers({ position: value });
                }
              }}
            >
              <SelectTrigger aria-label="Page number position" className="w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top-outer">Top outer corner</SelectItem>
                <SelectItem value="top-inner">Top inner corner</SelectItem>
                <SelectItem value="top-center">Top center</SelectItem>
                <SelectItem value="bottom-outer">Bottom outer corner</SelectItem>
                <SelectItem value="bottom-inner">Bottom inner corner</SelectItem>
                <SelectItem value="bottom-center">Bottom center</SelectItem>
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={editor.design.pageNumbers.fontFamily}
                onValueChange={(value) => {
                  if (value === "serif" || value === "sans" || value === "mono") {
                    updatePageNumbers({ fontFamily: value });
                  }
                }}
              >
                <SelectTrigger aria-label="Page number font" className="w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="serif">Serif</SelectItem>
                  <SelectItem value="sans">Sans serif</SelectItem>
                  <SelectItem value="mono">Monospace</SelectItem>
                </SelectContent>
              </Select>
              <Input
                aria-label="Page number font size"
                className="text-xs"
                max={48}
                min={6}
                onChange={(event) => {
                  const fontSize = event.currentTarget.valueAsNumber;
                  if (Number.isFinite(fontSize)) updatePageNumbers({ fontSize });
                }}
                type="number"
                value={editor.design.pageNumbers.fontSize}
              />
            </div>
            <ColorField
              label="Number color"
              value={editor.design.pageNumbers.color}
              onChange={(color) => updatePageNumbers({ color })}
            />
            <p className="text-[10px] text-[#929b94]">
              Displays the physical page number. Outer and inner positions
              mirror across the spread.
            </p>
          </div>
        )}
      </section>

      <section aria-label="Page border" className="space-y-3 border-t border-[#edf0ec] pt-4">
        <ToggleRow
          checked={editor.design.pageBorder.enabled}
          label="Page border"
          onChange={(enabled) => updatePageBorder({ enabled })}
        />
        {editor.design.pageBorder.enabled && (
          <div className="space-y-3">
            <Select
              value={editor.design.pageBorder.style}
              onValueChange={(value) => {
                if (isPageBorderStyle(value)) updatePageBorder({ style: value });
              }}
            >
              <SelectTrigger aria-label="Page border style" className="w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="dashed">Dashed</SelectItem>
                <SelectItem value="dotted">Dotted</SelectItem>
                <SelectItem value="double">Double</SelectItem>
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input
                aria-label="Page border inset"
                max={15}
                min={1}
                onChange={(event) => {
                  const inset = event.currentTarget.valueAsNumber;
                  if (Number.isFinite(inset)) updatePageBorder({ inset });
                }}
                type="number"
                value={editor.design.pageBorder.inset}
              />
              <Input
                aria-label="Page border width"
                max={8}
                min={1}
                onChange={(event) => {
                  const width = event.currentTarget.valueAsNumber;
                  if (Number.isFinite(width)) updatePageBorder({ width });
                }}
                type="number"
                value={editor.design.pageBorder.width}
              />
            </div>
            <div className="grid grid-cols-2 text-[10px] text-[#89938c]">
              <span>Inset (%)</span>
              <span>Width (px)</span>
            </div>
            <ColorField
              label="Border color"
              value={editor.design.pageBorder.color}
              onChange={(color) => updatePageBorder({ color })}
            />
          </div>
        )}
      </section>

      <section aria-label="Repeating elements" className="space-y-3 border-t border-[#edf0ec] pt-4">
        <div>
          <h4 className="text-xs font-semibold text-[#46534a]">
            Repeating elements
          </h4>
          <p className="mt-1 text-[10px] leading-relaxed text-[#929b94]">
            Position items on a left page; they mirror to the right pages. Drag
            an item on the canvas to position it.
          </p>
        </div>
        <Button
          className="w-full justify-start gap-2 text-xs"
          onClick={() =>
            onSelectElement(editor.addDesignTextElement(), designPageId)
          }
          variant="outline"
        >
          <Plus className="size-3.5" />
          Add text
        </Button>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Select
            value={shapeType}
            onValueChange={(value) => {
              if (isShapeType(value)) setShapeType(value);
            }}
          >
            <SelectTrigger aria-label="Shape to repeat" className="w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SHAPE_LIBRARY.map((shape) => (
                <SelectItem key={shape.shapeType} value={shape.shapeType}>
                  {shape.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            aria-label="Add repeating shape"
            onClick={() =>
              onSelectElement(
                editor.addDesignShapeElement(shapeType),
                designPageId,
              )
            }
            size="icon"
            variant="outline"
          >
            <Plus />
          </Button>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Select
            value={artKey}
            onValueChange={(value) => {
              if (
                value !== null &&
                ART_LIBRARY.some((artwork) => artwork.key === value)
              ) {
                setArtKey(value);
              }
            }}
          >
            <SelectTrigger aria-label="Artwork to repeat" className="w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ART_LIBRARY.map((artwork) => (
                <SelectItem key={artwork.key} value={artwork.key}>
                  {artwork.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            aria-label="Add repeating artwork"
            onClick={() =>
              onSelectElement(
                editor.addDesignArtworkElement(artKey),
                designPageId,
              )
            }
            size="icon"
            variant="outline"
          >
            <Plus />
          </Button>
        </div>

        {editor.design.elements.length > 0 && (
          <div className="space-y-1">
            {editor.design.elements.map((element, index) => (
              <div
                className="flex items-center gap-1"
                key={element.id}
              >
                <button
                  aria-pressed={selectedElementId === element.id}
                  className={`min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-[11px] ${
                    selectedElementId === element.id
                      ? "bg-[#edf4ed] text-[#315d44]"
                      : "text-[#59655e] hover:bg-[#f5f7f4]"
                  }`}
                  onClick={() => onSelectElement(element.id, designPageId)}
                  type="button"
                >
                  {designElementLabel(element, index)}
                </button>
                <Button
                  aria-label={`Delete ${designElementLabel(element, index)}`}
                  className="size-7 text-[#929b94] hover:text-[#a24141]"
                  onClick={() => {
                    editor.deleteDesignElement(element.id);
                    if (selectedElementId === element.id) {
                      onSelectElement(null);
                    }
                  }}
                  size="icon"
                  variant="ghost"
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        )}

        {selectedDesignElement?.kind === "text" && (
          <TextElementOptions
            element={selectedDesignElement}
            onChange={(updates) =>
              updateElement(selectedDesignElement.id, (element) =>
                element.kind === "text" ? { ...element, ...updates } : element,
              )
            }
          />
        )}
        {selectedDesignElement?.kind === "shape" && (
          <ShapeElementOptions
            element={selectedDesignElement}
            trimPreset={editor.trimPreset}
            onChange={(updates) =>
              updateElement(selectedDesignElement.id, (element) =>
                element.kind === "shape" ? { ...element, ...updates } : element,
              )
            }
          />
        )}
        {selectedDesignElement?.kind === "artwork" && (
          <ArtworkElementOptions
            element={selectedDesignElement}
            trimPreset={editor.trimPreset}
            onChange={(updates) =>
              updateElement(selectedDesignElement.id, (element) =>
                element.kind === "artwork" ? { ...element, ...updates } : element,
              )
            }
          />
        )}
      </section>
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="block text-[11px] font-medium text-[#68736b]">
      {children}
    </span>
  );
}

function ToggleRow({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between text-xs font-semibold text-[#46534a]">
      {label}
      <input
        aria-label={label}
        checked={checked}
        className="size-4 accent-[#4f795a]"
        onChange={(event) => onChange(event.currentTarget.checked)}
        type="checkbox"
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center justify-between text-[11px] font-medium text-[#68736b]">
      {label}
      <BufferedColorInput
        aria-label={label}
        className="h-8 w-12 cursor-pointer p-1"
        onCommit={onChange}
        value={value}
      />
    </label>
  );
}

function designElementLabel(element: RepeatingDesignElement, index: number) {
  if (element.kind === "text") {
    return element.content.trim().split("\n")[0] || `Text ${index + 1}`;
  }
  if (element.kind === "shape") {
    return `${element.shapeType} ${index + 1}`;
  }
  return `${ART_LIBRARY.find((artwork) => artwork.key === element.artKey)?.label ?? "Artwork"} ${index + 1}`;
}

function isPageNumberFormat(value: unknown): value is PageNumberFormat {
  return (
    value === "arabic" ||
    value === "roman-lower" ||
    value === "roman-upper"
  );
}

function isPageNumberPosition(value: unknown): value is PageNumberPosition {
  return (
    value === "top-outer" ||
    value === "top-inner" ||
    value === "top-center" ||
    value === "bottom-outer" ||
    value === "bottom-inner" ||
    value === "bottom-center"
  );
}

function isPageBorderStyle(value: unknown): value is PageBorderStyle {
  return (
    value === "solid" ||
    value === "dashed" ||
    value === "dotted" ||
    value === "double"
  );
}

function isShapeType(value: unknown): value is ShapeType {
  return SHAPE_LIBRARY.some((shape) => shape.shapeType === value);
}
