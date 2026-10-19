"use client";

import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Italic } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";

import type { TextEditorElement, TextElementUpdates } from "./editor-types";

type TextElementOptionsProps = {
  element: TextEditorElement;
  onChange: (updates: TextElementUpdates) => void;
};

const alignments = [
  { value: "left", label: "Align left", icon: AlignLeft },
  { value: "center", label: "Align center", icon: AlignCenter },
  { value: "right", label: "Align right", icon: AlignRight },
  { value: "justify", label: "Justify", icon: AlignJustify },
] as const;

export function TextElementOptions({ element, onChange }: TextElementOptionsProps) {
  return (
    <div className="space-y-4">
      <Field label="Content">
        <Textarea
          className="min-h-24 resize-y text-xs"
          onChange={(event) => onChange({ content: event.currentTarget.value })}
          value={element.content}
        />
      </Field>

      <div className="grid grid-cols-[1fr_74px] gap-3">
        <Field label="Font">
          <Select
            value={element.fontFamily}
            onValueChange={(value) => {
              if (value === "serif" || value === "sans" || value === "mono") {
                onChange({ fontFamily: value });
              }
            }}
          >
            <SelectTrigger className="h-8 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="serif">Serif</SelectItem>
              <SelectItem value="sans">Sans serif</SelectItem>
              <SelectItem value="mono">Monospace</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <div className="flex flex-col gap-1.5 text-[11px] font-medium text-[#68736b]">
          <span>Size</span>
          <span className="flex h-8 items-center text-xs text-[#45534a]">{element.fontSize}px</span>
        </div>
      </div>
      <RangeField
        label="Font size"
        min={6}
        max={96}
        step={1}
        value={element.fontSize}
        displayValue={`${element.fontSize}px`}
        onChange={(fontSize) => onChange({ fontSize })}
      />

      <Field label="Color">
        <div className="flex items-center gap-2">
          <Input
            aria-label="Text color"
            className="h-9 w-12 cursor-pointer p-1"
            onChange={(event) => onChange({ color: event.currentTarget.value })}
            type="color"
            value={element.color}
          />
          <span className="text-xs uppercase text-[#859087]">{element.color}</span>
        </div>
      </Field>

      <Field label="Background color">
        <div className="flex items-center gap-2">
          <Input
            aria-label="Text background color"
            className="h-9 w-12 cursor-pointer p-1"
            disabled={element.backgroundColor === null}
            onChange={(event) =>
              onChange({ backgroundColor: event.currentTarget.value })
            }
            type="color"
            value={element.backgroundColor ?? "#ffffff"}
          />
          <span className="min-w-0 flex-1 text-xs uppercase text-[#859087]">
            {element.backgroundColor ?? "Transparent"}
          </span>
          <label className="flex shrink-0 items-center gap-1.5 text-[10px] text-[#77837a]">
            <input
              aria-label="Transparent text background"
              checked={element.backgroundColor === null}
              className="accent-[#4f795a]"
              onChange={(event) =>
                onChange({
                  backgroundColor: event.currentTarget.checked
                    ? null
                    : "#ffffff",
                })
              }
              type="checkbox"
            />
            None
          </label>
        </div>
      </Field>

      <RangeField
        label="Rotation"
        min={-180}
        max={180}
        step={1}
        value={element.rotation}
        displayValue={`${element.rotation}°`}
        onChange={(rotation) => onChange({ rotation })}
      />
      <RangeField
        label="Line spacing"
        min={0}
        max={24}
        step={1}
        value={element.lineSpacing}
        displayValue={`${element.lineSpacing}px`}
        onChange={(lineSpacing) => onChange({ lineSpacing })}
      />
      <RangeField
        label="Line height"
        min={1}
        max={2}
        step={0.05}
        value={element.lineHeight}
        displayValue={`${Number(element.lineHeight.toFixed(2))}×`}
        onChange={(lineHeight) => onChange({ lineHeight })}
      />
      <RangeField
        label="Tracking"
        min={-2}
        max={12}
        step={0.1}
        value={element.tracking}
        displayValue={`${element.tracking.toFixed(1)}px`}
        onChange={(tracking) => onChange({ tracking })}
      />

      <Field label="Alignment">
        <div className="flex items-center gap-1">
          {alignments.map(({ value, label, icon: Icon }) => (
            <Button
              aria-label={label}
              aria-pressed={element.alignment === value}
              className={`size-8 ${element.alignment === value ? "bg-[#eaf1e9] text-[#315d44]" : "text-[#77827b]"}`}
              key={value}
              onClick={() => onChange({ alignment: value })}
              size="icon"
              variant="ghost"
            >
              <Icon />
            </Button>
          ))}
          <span className="ml-2 text-[11px] text-[#8c968f]">Text alignment</span>
        </div>
      </Field>

      <div className="flex gap-1">
        <Button
          aria-label="Toggle bold"
          aria-pressed={element.bold}
          className={`size-8 ${element.bold ? "bg-[#eaf1e9] text-[#315d44]" : "text-[#77827b]"}`}
          onClick={() => onChange({ bold: !element.bold })}
          size="icon"
          variant="ghost"
        >
          <Bold />
        </Button>
        <Button
          aria-label="Toggle italic"
          aria-pressed={element.italic}
          className={`size-8 ${element.italic ? "bg-[#eaf1e9] text-[#315d44]" : "text-[#77827b]"}`}
          onClick={() => onChange({ italic: !element.italic })}
          size="icon"
          variant="ghost"
        >
          <Italic />
        </Button>
      </div>
    </div>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] font-medium text-[#68736b]">
        <span>{label}</span>
        <span className="tabular-nums text-[#89938c]">{displayValue}</span>
      </div>
      <Slider
        aria-label={label}
        max={max}
        min={min}
        onValueChange={(values) => {
          const nextValue = typeof values === "number" ? values : values[0];
          if (typeof nextValue === "number") onChange(Number(nextValue.toFixed(2)));
        }}
        step={step}
        value={[value]}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 text-[11px] font-medium text-[#68736b]">
      <span>{label}</span>
      {children}
    </div>
  );
}
