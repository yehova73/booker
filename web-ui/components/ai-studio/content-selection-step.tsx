"use client";

import {
  Brain,
  Check,
  Grid2X2,
  Grid3X3,
  Palette,
  Route,
  Search,
  Shuffle,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AI_STUDIO_PUZZLE_OPTIONS } from "@/lib/ai-studio";
import type { NewBookContentSelection } from "./new-book-types";

const puzzleIcons: Record<
  (typeof AI_STUDIO_PUZZLE_OPTIONS)[number]["value"],
  LucideIcon
> = {
  sudoku: Grid3X3,
  wordSearch: Search,
  maze: Route,
  crossword: Grid2X2,
  wordScramble: Shuffle,
  logicPuzzle: Brain,
  coloringPage: Palette,
};

export function ContentSelectionStep({
  value,
  onChange,
  onBack,
  onGenerate,
  isGenerating,
}: {
  value: NewBookContentSelection;
  onChange: (updates: Partial<NewBookContentSelection>) => void;
  onBack: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  const storyModeActive = value.storyPuzzle && value.selectedPuzzles.length > 0;

  function togglePuzzle(puzzle: (typeof AI_STUDIO_PUZZLE_OPTIONS)[number]["value"]) {
    const selected = new Set(value.selectedPuzzles);
    if (selected.has(puzzle)) selected.delete(puzzle);
    else selected.add(puzzle);
    onChange({ selectedPuzzles: [...selected] });
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-medium">Choose content for your book</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Select any combination of puzzles and activities.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {AI_STUDIO_PUZZLE_OPTIONS.map((option) => {
          const Icon = puzzleIcons[option.value];
          const selected = value.selectedPuzzles.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => togglePuzzle(option.value)}
              className={`relative flex aspect-square flex-col items-center justify-center gap-3 rounded-xl border p-3 text-center transition-colors ${
                selected
                  ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                  : "border-border bg-card hover:bg-muted/50"
              }`}
            >
              {selected && (
                <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3" />
                </span>
              )}
              <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-primary">
                <Icon aria-hidden="true" className="size-6" />
              </span>
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          aria-pressed={value.storyPuzzle}
          onClick={() => onChange({ storyPuzzle: !value.storyPuzzle })}
          className={`relative flex aspect-square flex-col items-center justify-center gap-3 rounded-xl border p-3 text-center transition-colors ${
            value.storyPuzzle
              ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
              : "border-border bg-card hover:bg-muted/50"
          }`}
        >
          {value.storyPuzzle && (
            <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="size-3" />
            </span>
          )}
          <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-primary">
            <Sparkles aria-hidden="true" className="size-6" />
          </span>
          <span className="text-sm font-medium">Story Puzzle</span>
        </button>
      </div>

      {storyModeActive && (
        <div
          role="status"
          className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground"
        >
          <p>
            <span aria-hidden="true">💡</span> <strong>Story Mode Active:</strong>{" "}
            The book will automatically generate facing page spreads with a
            Story scene on the left page and a matching puzzle/activity on the
            right page.
          </p>
        </div>
      )}

      <div className="flex flex-col-reverse justify-between gap-2 border-t pt-4 sm:flex-row">
        <Button type="button" variant="outline" onClick={onBack} disabled={isGenerating}>
          ← Back
        </Button>
        <Button type="button" onClick={onGenerate} disabled={isGenerating}>
          <Sparkles />
          {isGenerating ? "Creating Blueprint..." : "Generate Blueprint"}
        </Button>
      </div>
    </div>
  );
}
