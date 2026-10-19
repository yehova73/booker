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
import type { SudokuDifficulty } from "./editor-types";
import { SUDOKU_DIFFICULTY_RATES } from "../sudoku-utils";

const squareSizes = [2, 3, 4, 5] as const;
const difficulties: SudokuDifficulty[] = ["easy", "medium", "hard", "insane"];

export function SudokuGeneratorDialog({
  open,
  onOpenChange,
  onGenerate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (
    squares: (typeof squareSizes)[number],
    difficulty: SudokuDifficulty,
    pageCount: number,
  ) => Promise<void>;
}) {
  const [squares, setSquares] = useState<(typeof squareSizes)[number]>(3);
  const [difficulty, setDifficulty] = useState<SudokuDifficulty>("easy");
  const [pageCount, setPageCount] = useState("1");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const parsedPageCount = Number(pageCount);
  const pageCountIsValid =
    Number.isInteger(parsedPageCount) &&
    parsedPageCount >= 1 &&
    parsedPageCount <= 50;
  const sideLength = squares * squares;
  const estimatedHiddenSquares = Math.floor(
    sideLength * sideLength * SUDOKU_DIFFICULTY_RATES[difficulty],
  );

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
          <DialogTitle>Generate Sudoku</DialogTitle>
          <DialogDescription>
            Choose the grid size, difficulty, and how many puzzle pages to add.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <fieldset className="space-y-2">
            <legend className="text-[11px] font-medium text-[#68736b]">
              Squares
            </legend>
            <ButtonGroup className="w-full">
              {squareSizes.map((value) => (
                <Button
                  aria-pressed={squares === value}
                  className={`flex-1 ${squares === value ? "bg-[#eaf1e9] text-[#315d44]" : ""}`}
                  key={value}
                  onClick={() => setSquares(value)}
                  type="button"
                  variant="outline"
                >
                  {value} ({value * value}×{value * value})
                </Button>
              ))}
            </ButtonGroup>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-[11px] font-medium text-[#68736b]">
              Difficulty
            </legend>
            <ButtonGroup className="w-full">
              {difficulties.map((value) => (
                <Button
                  aria-pressed={difficulty === value}
                  className={`flex-1 capitalize ${difficulty === value ? "bg-[#eaf1e9] text-[#315d44]" : ""}`}
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
              About {estimatedHiddenSquares} hidden cells per puzzle.
            </p>
          </fieldset>

          <label className="flex flex-col gap-1.5 text-[11px] font-medium text-[#68736b]">
            Number of pages
            <Input
              aria-label="Number of pages"
              aria-invalid={!pageCountIsValid}
              className="h-9 text-sm"
              max={50}
              min={1}
              onChange={(event) => setPageCount(event.currentTarget.value)}
              type="number"
              value={pageCount}
            />
            <span className="font-normal text-[#929b94]">
              Choose 1–50 pages.
            </span>
          </label>
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
            disabled={!pageCountIsValid || isGenerating}
            onClick={async () => {
              setError(null);
              setIsGenerating(true);
              try {
                await onGenerate(squares, difficulty, parsedPageCount);
                onOpenChange(false);
              } catch (generationError) {
                setError(
                  generationError instanceof Error
                    ? generationError.message
                    : "Sudoku generation failed.",
                );
              } finally {
                setIsGenerating(false);
              }
            }}
            type="button"
          >
            {isGenerating ? "Generating..." : "Generate puzzles"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
