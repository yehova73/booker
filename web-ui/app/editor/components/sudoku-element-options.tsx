"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Slider } from "@/components/ui/slider";
import type { ReactNode } from "react";

import type {
  SudokuDifficulty,
  SudokuEditorElement,
  SudokuElementUpdates,
  TrimPreset,
} from "./editor-types";
import {
  PAGE_PIXEL_DIMENSIONS,
  percentageToPixels,
  pixelsToPercentage,
} from "./editor-units";

const difficulties: SudokuDifficulty[] = ["easy", "medium", "hard", "insane"];

export function SudokuElementOptions({
  element,
  trimPreset,
  onChange,
  onDifficultyChange,
}: {
  element: SudokuEditorElement;
  trimPreset: TrimPreset;
  onChange: (updates: SudokuElementUpdates) => void;
  onDifficultyChange: (difficulty: SudokuDifficulty) => void;
}) {
  const pageSize = PAGE_PIXEL_DIMENSIONS[trimPreset];
  const sideLength = element.squares * element.squares;

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
          <label htmlFor="sudoku-number-size">Number size</label>
          <span className="tabular-nums text-[#89938c]">
            {element.numberSize}px
          </span>
        </div>
        <Slider
          aria-label="Number size"
          id="sudoku-number-size"
          max={48}
          min={4}
          onValueChange={(values) => {
            const nextValue = typeof values === "number" ? values : values[0];
            if (typeof nextValue === "number") {
              onChange({ numberSize: Math.round(nextValue) });
            }
          }}
          step={1}
          value={[element.numberSize]}
        />
      </div>

      <Field label="Difficulty">
        <ButtonGroup className="w-full">
          {difficulties.map((difficulty) => (
            <Button
              aria-pressed={element.difficulty === difficulty}
              className={`flex-1 px-1 capitalize ${element.difficulty === difficulty ? "bg-[#eaf1e9] text-[#315d44]" : ""}`}
              key={difficulty}
              onClick={() => onDifficultyChange(difficulty)}
              size="sm"
              type="button"
              variant="outline"
            >
              {difficulty}
            </Button>
          ))}
        </ButtonGroup>
        <span className="text-[10px] font-normal text-[#929b94]">
          {element.hiddenSquares} of {sideLength * sideLength} cells hidden
        </span>
      </Field>

      <Field label="Color">
        <div className="flex items-center gap-2">
          <Input
            aria-label="Sudoku color"
            className="h-9 w-12 cursor-pointer p-1"
            onChange={(event) => onChange({ color: event.currentTarget.value })}
            type="color"
            value={element.color}
          />
          <span className="text-xs uppercase text-[#859087]">
            {element.color}
          </span>
        </div>
      </Field>
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
          value={value}
        />
        <span className="shrink-0 text-[10px] text-[#929b94]">{suffix}</span>
      </div>
    </label>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 text-[11px] font-medium text-[#68736b]">
      <span>{label}</span>
      {children}
    </div>
  );
}
