"use client";

import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

import type {
  MazeEditorElement,
  MazeElementUpdates,
  TrimPreset,
} from "./editor-types";
import {
  PAGE_PIXEL_DIMENSIONS,
  percentageToPixels,
  pixelsToPercentage,
} from "./editor-units";

export function MazeElementOptions({
  element,
  trimPreset,
  onChange,
}: {
  element: MazeEditorElement;
  trimPreset: TrimPreset;
  onChange: (updates: MazeElementUpdates) => void;
}) {
  const pageSize = PAGE_PIXEL_DIMENSIONS[trimPreset];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Width"
          min={1}
          suffix="px"
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
          suffix="px"
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

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Position X"
          min={0}
          max={100}
          suffix="%"
          value={Number(element.x.toFixed(1))}
          onChange={(x) => onChange({ x })}
        />
        <NumberField
          label="Position Y"
          min={0}
          max={100}
          suffix="%"
          value={Number(element.y.toFixed(1))}
          onChange={(y) => onChange({ y })}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-medium text-[#68736b]">
          <span>Line weight</span>
          <span className="tabular-nums text-[#89938c]">
            {element.lineWeight.toFixed(1)}px
          </span>
        </div>
        <Slider
          aria-label="Line weight"
          max={8}
          min={0.5}
          onValueChange={(values) => {
            const nextValue = typeof values === "number" ? values : values[0];
            if (typeof nextValue === "number") {
              onChange({ lineWeight: Number(nextValue.toFixed(1)) });
            }
          }}
          step={0.5}
          value={[element.lineWeight]}
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
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max?: number;
  suffix: string;
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
          step={0.1}
          type="number"
          value={Number(value.toFixed(1))}
        />
        <span className="shrink-0 text-[10px] text-[#929b94]">{suffix}</span>
      </div>
    </label>
  );
}
