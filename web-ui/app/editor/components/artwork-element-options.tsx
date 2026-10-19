"use client";

import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

import type {
  ArtworkEditorElement,
  ArtworkElementUpdates,
  TrimPreset,
} from "./editor-types";
import {
  PAGE_PIXEL_DIMENSIONS,
  percentageToPixels,
  pixelsToPercentage,
} from "./editor-units";

export function ArtworkElementOptions({
  element,
  trimPreset,
  onChange,
}: {
  element: ArtworkEditorElement;
  trimPreset: TrimPreset;
  onChange: (updates: ArtworkElementUpdates) => void;
}) {
  const pageSize = PAGE_PIXEL_DIMENSIONS[trimPreset];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Width"
          min={1}
          value={percentageToPixels(element.width, pageSize.width)}
          onChange={(width) =>
            onChange({
              width: Math.max(0.1, pixelsToPercentage(width, pageSize.width)),
            })
          }
        />
        <NumberField
          label="Height"
          min={1}
          value={percentageToPixels(element.height, pageSize.height)}
          onChange={(height) =>
            onChange({
              height: Math.max(
                0.1,
                pixelsToPercentage(height, pageSize.height),
              ),
            })
          }
        />
      </div>

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
        label="Line weight"
        min={0.2}
        max={10}
        step={0.1}
        value={element.strokeWidth}
        displayValue={`${element.strokeWidth}px`}
        onChange={(strokeWidth) => onChange({ strokeWidth })}
      />

      <ColorField
        value={element.strokeColor}
        onChange={(strokeColor) => onChange({ strokeColor })}
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-[11px] font-medium text-[#68736b]">
      <span>{label}</span>
      <div className="flex items-center gap-1.5">
        <Input
          aria-label={label}
          className="h-8 px-2 text-xs"
          max={max}
          min={min}
          onChange={(event) => {
            const nextValue = event.currentTarget.valueAsNumber;
            if (Number.isFinite(nextValue)) {
              onChange(
                max === undefined
                  ? Math.max(min, nextValue)
                  : Math.min(max, Math.max(min, nextValue)),
              );
            }
          }}
          step={1}
          type="number"
          value={value}
        />
        <span className="shrink-0 text-[10px] text-[#929b94]">px</span>
      </div>
    </label>
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

function ColorField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 text-[11px] font-medium text-[#68736b]">
      <span>Color</span>
      <div className="flex items-center gap-2">
        <Input
          aria-label="Artwork color"
          className="h-9 w-12 cursor-pointer p-1"
          onChange={(event) => onChange(event.currentTarget.value)}
          type="color"
          value={value}
        />
        <span className="min-w-0 flex-1 text-xs uppercase text-[#859087]">
          {value}
        </span>
      </div>
    </div>
  );
}
