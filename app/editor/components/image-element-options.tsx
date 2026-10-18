"use client";

import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

import type {
  ImageEditorElement,
  ImageElementUpdates,
  ImageFilterSettings,
  TrimPreset,
} from "./editor-types";
import {
  PAGE_PIXEL_DIMENSIONS,
  percentageToPixels,
  pixelsToPercentage,
} from "./editor-units";

export function ImageElementOptions({
  element,
  trimPreset,
  onChange,
}: {
  element: ImageEditorElement;
  trimPreset: TrimPreset;
  onChange: (updates: ImageElementUpdates) => void;
}) {
  const pageSize = PAGE_PIXEL_DIMENSIONS[trimPreset];

  function updateFilter<K extends keyof ImageFilterSettings>(
    filter: K,
    value: ImageFilterSettings[K],
  ) {
    onChange({ filters: { ...element.filters, [filter]: value } });
  }

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

      <ColorField
        label="Border color"
        value={element.borderColor}
        onChange={(borderColor) => onChange({ borderColor })}
      />

      <RangeField
        label="Border thickness"
        min={0}
        max={20}
        step={0.5}
        value={element.borderWidth}
        displayValue={`${element.borderWidth}px`}
        onChange={(borderWidth) => onChange({ borderWidth })}
      />

      <RangeField
        label="Border radius"
        min={0}
        max={100}
        step={1}
        value={element.borderRadius}
        displayValue={`${element.borderRadius}px`}
        onChange={(borderRadius) => onChange({ borderRadius })}
      />

      <RangeField
        label="Opacity"
        min={0}
        max={100}
        step={1}
        value={element.opacity}
        displayValue={`${element.opacity}%`}
        onChange={(opacity) => onChange({ opacity })}
      />

      <div className="space-y-4 border-t border-[#eef0ed] pt-4">
        <h4 className="text-[11px] font-semibold text-[#59655d]">Filters</h4>
        <RangeField
          label="Brightness"
          min={0}
          max={200}
          step={1}
          value={element.filters.brightness}
          displayValue={`${element.filters.brightness}%`}
          onChange={(value) => updateFilter("brightness", value)}
        />
        <RangeField
          label="Contrast"
          min={0}
          max={200}
          step={1}
          value={element.filters.contrast}
          displayValue={`${element.filters.contrast}%`}
          onChange={(value) => updateFilter("contrast", value)}
        />
        <RangeField
          label="Saturation"
          min={0}
          max={200}
          step={1}
          value={element.filters.saturation}
          displayValue={`${element.filters.saturation}%`}
          onChange={(value) => updateFilter("saturation", value)}
        />
        <RangeField
          label="Grayscale"
          min={0}
          max={100}
          step={1}
          value={element.filters.grayscale}
          displayValue={`${element.filters.grayscale}%`}
          onChange={(value) => updateFilter("grayscale", value)}
        />
        <RangeField
          label="Sepia"
          min={0}
          max={100}
          step={1}
          value={element.filters.sepia}
          displayValue={`${element.filters.sepia}%`}
          onChange={(value) => updateFilter("sepia", value)}
        />
        <RangeField
          label="Blur"
          min={0}
          max={20}
          step={0.5}
          value={element.filters.blur}
          displayValue={`${element.filters.blur}px`}
          onChange={(value) => updateFilter("blur", value)}
        />
        <RangeField
          label="Hue rotation"
          min={0}
          max={360}
          step={1}
          value={element.filters.hueRotation}
          displayValue={`${element.filters.hueRotation}°`}
          onChange={(value) => updateFilter("hueRotation", value)}
        />
      </div>
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
    <div className="flex flex-col gap-1.5 text-[11px] font-medium text-[#68736b]">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <Input
          aria-label={label}
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
          if (typeof nextValue === "number")
            onChange(Number(nextValue.toFixed(2)));
        }}
        step={step}
        value={[value]}
      />
    </div>
  );
}
