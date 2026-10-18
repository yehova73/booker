"use client";

import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

import type { ShapeEditorElement, ShapeElementUpdates } from "./editor-types";

export function ShapeElementOptions({
  element,
  onChange,
}: {
  element: ShapeEditorElement;
  onChange: (updates: ShapeElementUpdates) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Width"
          min={8}
          max={100 - element.x}
          suffix="%"
          value={element.width}
          onChange={(width) => onChange({ width })}
        />
        <NumberField
          label="Height"
          min={5}
          max={100 - element.y}
          suffix="%"
          value={element.height}
          onChange={(height) => onChange({ height })}
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
        label="Fill color"
        value={element.fillColor}
        onChange={(fillColor) => {
          if (fillColor !== null) onChange({ fillColor });
        }}
      />

      <ColorField
        label="Outline color"
        value={element.outlineColor}
        onChange={(outlineColor) => onChange({ outlineColor })}
      />

      <RangeField
        label="Outline width"
        min={0}
        max={20}
        step={0.5}
        value={element.outlineWidth}
        displayValue={`${element.outlineWidth}px`}
        onChange={(outlineWidth) => onChange({ outlineWidth })}
      />

      {element.shapeType === "rectangle" && (
        <RangeField
          label="Corner radius"
          min={0}
          max={50}
          step={1}
          value={element.cornerRadius}
          displayValue={`${element.cornerRadius}%`}
          onChange={(cornerRadius) => onChange({ cornerRadius })}
        />
      )}

      {element.shapeType === "star" && (
        <NumberField
          label="Points"
          min={3}
          max={24}
          suffix="points"
          value={element.starPoints}
          onChange={(starPoints) => onChange({ starPoints: Math.round(starPoints) })}
        />
      )}

      {element.shapeType === "pentagon" && (
        <NumberField
          label="Number of sides"
          min={3}
          max={12}
          suffix="sides"
          value={element.pentagonSides}
          onChange={(pentagonSides) =>
            onChange({ pentagonSides: Math.round(pentagonSides) })
          }
        />
      )}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 text-[11px] font-medium text-[#68736b]">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <Input
          aria-label={label}
          className="h-9 w-12 cursor-pointer p-1"
          disabled={value === null}
          onChange={(event) => onChange(event.currentTarget.value)}
          type="color"
          value={value ?? "#728a74"}
        />
        <span className="min-w-0 flex-1 text-xs uppercase text-[#859087]">
          {value ?? "Transparent"}
        </span>
        {label === "Outline color" && (
          <label className="flex shrink-0 items-center gap-1.5 text-[10px] text-[#77837a]">
            <input
              aria-label="Transparent outline"
              checked={value === null}
              className="accent-[#4f795a]"
              onChange={(event) =>
                onChange(event.currentTarget.checked ? null : "#728a74")
              }
              type="checkbox"
            />
            None
          </label>
        )}
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
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
            if (Number.isFinite(nextValue)) onChange(Math.min(max, Math.max(min, nextValue)));
          }}
          step={step}
          type="number"
          value={value}
        />
        <span className="shrink-0 text-[10px] text-[#929b94]">{suffix}</span>
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
