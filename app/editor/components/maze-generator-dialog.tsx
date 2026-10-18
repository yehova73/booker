"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { MazeDifficulty, MazeGenerationSettings } from "./editor-types";

const difficulties: MazeDifficulty[] = ["easy", "medium", "hard", "insane"];

export function MazeGeneratorDialog({
  open,
  onOpenChange,
  onGenerate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (settings: MazeGenerationSettings) => Promise<void>;
}) {
  const [rows, setRows] = useState("15");
  const [cols, setCols] = useState("15");
  const [difficulty, setDifficulty] = useState<MazeDifficulty>("medium");
  const [pageCount, setPageCount] = useState("1");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const parsedRows = Number(rows);
  const parsedCols = Number(cols);
  const parsedPageCount = Number(pageCount);
  const validRows = isInRange(parsedRows, 5, 40);
  const validCols = isInRange(parsedCols, 5, 40);
  const validPageCount = isInRange(parsedPageCount, 1, 50);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isGenerating && !nextOpen) return;
        setError(null);
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Maze</DialogTitle>
          <DialogDescription>
            Set the maze rows and cells per row. Difficulty adjusts the length
            of the route from the green start to the red finish.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Rows"
              min={5}
              max={40}
              value={rows}
              onChange={setRows}
            />
            <NumberField
              label="Cells per row"
              min={5}
              max={40}
              value={cols}
              onChange={setCols}
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-[11px] font-medium text-[#68736b]">
              Difficulty
            </legend>
            <ButtonGroup className="w-full">
              {difficulties.map((value) => (
                <Button
                  aria-pressed={difficulty === value}
                  className={`flex-1 px-1 capitalize ${
                    difficulty === value ? "bg-[#eaf1e9] text-[#315d44]" : ""
                  }`}
                  key={value}
                  onClick={() => setDifficulty(value)}
                  type="button"
                  variant="outline"
                >
                  {value}
                </Button>
              ))}
            </ButtonGroup>
            <p className="text-[10px] text-[#929b94]">
              Harder settings generate a longer route through the maze.
            </p>
          </fieldset>

          <NumberField
            label="Number of pages"
            min={1}
            max={50}
            value={pageCount}
            onChange={setPageCount}
          />
          {error && (
            <p aria-live="assertive" className="text-xs text-red-600">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            disabled={isGenerating}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={!validRows || !validCols || !validPageCount || isGenerating}
            onClick={async () => {
              setError(null);
              setIsGenerating(true);
              try {
                await onGenerate({
                  rows: parsedRows,
                  cols: parsedCols,
                  difficulty,
                  pageCount: parsedPageCount,
                });
                onOpenChange(false);
              } catch (generationError) {
                setError(
                  generationError instanceof Error
                    ? generationError.message
                    : "Maze generation failed.",
                );
              } finally {
                setIsGenerating(false);
              }
            }}
            type="button"
          >
            {isGenerating ? "Generating..." : "Generate mazes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NumberField({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: string;
  onChange: (value: string) => void;
}) {
  const valid = isInRange(Number(value), min, max);
  return (
    <label className="flex flex-col gap-1.5 text-[11px] font-medium text-[#68736b]">
      {label}
      <Input
        aria-label={label}
        aria-invalid={!valid}
        className="h-9 text-sm"
        max={max}
        min={min}
        onChange={(event) => onChange(event.currentTarget.value)}
        type="number"
        value={value}
      />
      <span className="font-normal text-[#929b94]">
        Choose {min}–{max}.
      </span>
    </label>
  );
}

function isInRange(value: number, min: number, max: number) {
  return Number.isInteger(value) && value >= min && value <= max;
}
