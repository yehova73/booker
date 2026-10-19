"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

import type {
  TextFontFamily,
  WordSearchEditorElement,
  WordSearchGridElementUpdates,
  WordSearchWordsEditorElement,
  WordSearchWordsElementUpdates,
} from "./editor-types";

export function WordSearchGridElementOptions({
  element,
  onChange,
}: {
  element: WordSearchEditorElement;
  onChange: (updates: WordSearchGridElementUpdates) => void;
}) {
  return (
    <div className="space-y-4">
      <RangeField
        label="Letter size"
        min={4}
        max={48}
        step={1}
        value={element.letterSize}
        displayValue={`${element.letterSize}px`}
        onChange={(letterSize) => onChange({ letterSize })}
      />
      <RangeField
        label="Grid line weight"
        min={0.5}
        max={8}
        step={0.5}
        value={element.lineWeight}
        displayValue={`${element.lineWeight}px`}
        onChange={(lineWeight) => onChange({ lineWeight })}
      />
    </div>
  );
}

export function WordSearchWordsElementOptions({
  element,
  onChange,
}: {
  element: WordSearchWordsEditorElement;
  onChange: (updates: WordSearchWordsElementUpdates) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Font">
        <Select
          value={element.fontFamily}
          onValueChange={(value) => {
            if (value && isTextFontFamily(value)) {
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
      <RangeField
        label="Font size"
        min={4}
        max={72}
        step={1}
        value={element.fontSize}
        displayValue={`${element.fontSize}px`}
        onChange={(fontSize) => onChange({ fontSize })}
      />
      <RangeField
        label="Spacing"
        min={-2}
        max={12}
        step={0.1}
        value={element.spacing}
        displayValue={`${element.spacing.toFixed(1)}px`}
        onChange={(spacing) => onChange({ spacing })}
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
          if (typeof nextValue === "number") onChange(nextValue);
        }}
        step={step}
        value={[value]}
      />
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 text-[11px] font-medium text-[#68736b]">
      <span>{label}</span>
      {children}
    </div>
  );
}

function isTextFontFamily(value: string): value is TextFontFamily {
  return value === "serif" || value === "sans" || value === "mono";
}
