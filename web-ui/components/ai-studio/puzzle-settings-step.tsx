"use client";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WORD_SEARCH_DICTIONARIES } from "@/app/editor/components/word-search-dictionaries";
import type {
  NewBookContentSelection,
  NewBookMetadata,
} from "./new-book-types";

const difficulties = ["easy", "medium", "hard", "insane"] as const;
const wordSearchGridMinimum = 5;
const wordSearchGridMaximum = 30;
const mazeGridMinimum = 5;
const mazeGridMaximum = 40;
const maxWordsLimit = 100;

export function PuzzleSettingsStep({
  metadata,
  value,
  onChange,
  onBack,
  onGenerate,
  isGenerating,
}: {
  metadata: NewBookMetadata;
  value: NewBookContentSelection;
  onChange: (updates: Partial<NewBookContentSelection>) => void;
  onBack: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  const selected = new Set(value.selectedPuzzles);
  const wordSearch = value.puzzleSettings.wordSearch;
  const usableWords = wordSearch.words.filter(
    (word) => word.length <= Math.max(wordSearch.rows, wordSearch.cols),
  );
  const wordSearchValid =
    isInRange(wordSearch.rows, wordSearchGridMinimum, wordSearchGridMaximum) &&
    isInRange(wordSearch.cols, wordSearchGridMinimum, wordSearchGridMaximum) &&
    isInRange(wordSearch.maxWords, 1, maxWordsLimit) &&
    wordSearch.words.length <= 1000 &&
    usableWords.length > 0;
  const sudokuValid =
    !selected.has("sudoku") ||
    value.puzzleSettings.sudoku.difficulties.length > 0;
  const mazeValid =
    !selected.has("maze") ||
    (value.puzzleSettings.maze.difficulties.length > 0 &&
      isInRange(value.puzzleSettings.maze.rows, mazeGridMinimum, mazeGridMaximum) &&
      isInRange(value.puzzleSettings.maze.cols, mazeGridMinimum, mazeGridMaximum));
  const isValid =
    (!selected.has("wordSearch") || wordSearchValid) &&
    sudokuValid &&
    mazeValid;
  const difficultyShortages = getDifficultyShortages(
    metadata.pageCount,
    value.storyPuzzle,
    value.selectedPuzzles,
    value.puzzleSettings,
  );

  function updatePuzzleSettings(
    puzzle: keyof NewBookContentSelection["puzzleSettings"],
    updates: Partial<NewBookContentSelection["puzzleSettings"][typeof puzzle]>,
  ) {
    onChange({
      puzzleSettings: {
        ...value.puzzleSettings,
        [puzzle]: { ...value.puzzleSettings[puzzle], ...updates },
      },
    });
  }

  function toggleDifficulty(
    puzzle: "sudoku" | "maze",
    difficulty: (typeof difficulties)[number],
  ) {
    const current = value.puzzleSettings[puzzle].difficulties;
    const next = current.includes(difficulty)
      ? current.filter((item) => item !== difficulty)
      : difficulties.filter((item) => current.includes(item) || item === difficulty);
    updatePuzzleSettings(puzzle, { difficulties: next });
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-medium">Puzzle settings</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          These defaults are applied to matching puzzle pages in your blueprint.
        </p>
      </div>

      {selected.has("sudoku") && (
        <section className="space-y-3 rounded-lg border p-4">
          <h4 className="text-sm font-semibold">Sudoku</h4>
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-muted-foreground">
              Squares
            </legend>
            <ButtonGroup className="w-full">
              {([2, 3, 4, 5] as const).map((squares) => (
                <Button
                  key={squares}
                  type="button"
                  variant="outline"
                  aria-pressed={value.puzzleSettings.sudoku.squares === squares}
                  className={`flex-1 ${
                    value.puzzleSettings.sudoku.squares === squares
                      ? "bg-primary/10 text-primary"
                      : ""
                  }`}
                  onClick={() => updatePuzzleSettings("sudoku", { squares })}
                >
                  {squares} ({squares * squares}×{squares * squares})
                </Button>
              ))}
            </ButtonGroup>
          </fieldset>
          <DifficultyPicker
            label="Difficulties"
            selected={value.puzzleSettings.sudoku.difficulties}
            onToggle={(difficulty) => toggleDifficulty("sudoku", difficulty)}
          />
        </section>
      )}

      {selected.has("wordSearch") && (
        <section className="space-y-3 rounded-lg border p-4">
          <h4 className="text-sm font-semibold">Word Search</h4>
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Rows"
              min={wordSearchGridMinimum}
              max={wordSearchGridMaximum}
              value={wordSearch.rows}
              onChange={(rows) => updatePuzzleSettings("wordSearch", { rows })}
            />
            <NumberField
              label="Columns"
              min={wordSearchGridMinimum}
              max={wordSearchGridMaximum}
              value={wordSearch.cols}
              onChange={(cols) => updatePuzzleSettings("wordSearch", { cols })}
            />
          </div>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            Dictionary
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={wordSearch.dictionaryName}
              onChange={(event) => {
                if (event.currentTarget.value === "Custom") {
                  updatePuzzleSettings("wordSearch", {
                    dictionaryName: "Custom",
                  });
                  return;
                }
                const dictionary = WORD_SEARCH_DICTIONARIES.find(
                  (candidate) => candidate.name === event.currentTarget.value,
                );
                if (!dictionary) return;
                updatePuzzleSettings("wordSearch", {
                  dictionaryName: dictionary.name,
                  words: [...dictionary.words],
                });
              }}
            >
              {WORD_SEARCH_DICTIONARIES.map((dictionary) => (
                <option key={dictionary.id} value={dictionary.name}>
                  {dictionary.name}
                </option>
              ))}
              <option value="Custom">Custom</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            Words (separate with spaces or new lines)
            <Textarea
              maxLength={10000}
              rows={4}
              value={wordSearch.words.join(" ")}
              onChange={(event) =>
                updatePuzzleSettings("wordSearch", {
                  dictionaryName: "Custom",
                  words: parseWords(event.currentTarget.value),
                })
              }
            />
            <span className="font-normal text-muted-foreground">
              {usableWords.length} words fit the current grid; longer words are
              skipped.
            </span>
          </label>
          <NumberField
            label="Maximum words per puzzle"
            min={1}
            max={maxWordsLimit}
            value={wordSearch.maxWords}
            onChange={(maxWords) =>
              updatePuzzleSettings("wordSearch", { maxWords })
            }
          />
        </section>
      )}

      {selected.has("maze") && (
        <section className="space-y-3 rounded-lg border p-4">
          <h4 className="text-sm font-semibold">Maze</h4>
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Rows"
              min={mazeGridMinimum}
              max={mazeGridMaximum}
              value={value.puzzleSettings.maze.rows}
              onChange={(rows) => updatePuzzleSettings("maze", { rows })}
            />
            <NumberField
              label="Cells per row"
              min={mazeGridMinimum}
              max={mazeGridMaximum}
              value={value.puzzleSettings.maze.cols}
              onChange={(cols) => updatePuzzleSettings("maze", { cols })}
            />
          </div>
          <DifficultyPicker
            label="Difficulties"
            selected={value.puzzleSettings.maze.difficulties}
            onToggle={(difficulty) => toggleDifficulty("maze", difficulty)}
          />
        </section>
      )}

      {difficultyShortages.length > 0 && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-muted-foreground">
          The selected page count does not provide enough puzzle pages to use
          every selected difficulty for {difficultyShortages.join(" and ")}.
          Difficulties will cycle in order across the available pages.
        </p>
      )}

      {!isValid && (
        <p role="alert" className="text-sm text-destructive">
          Choose at least one difficulty for each selected Sudoku or Maze type,
          and provide valid puzzle dimensions and words.
        </p>
      )}

      <div className="flex flex-col-reverse justify-between gap-2 border-t pt-4 sm:flex-row">
        <Button type="button" variant="outline" onClick={onBack} disabled={isGenerating}>
          ← Back
        </Button>
        <Button
          type="button"
          onClick={onGenerate}
          disabled={!isValid || isGenerating}
        >
          {isGenerating ? "Creating Blueprint..." : "Generate Blueprint"}
        </Button>
      </div>
    </div>
  );
}

function DifficultyPicker({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: string[];
  onToggle: (difficulty: (typeof difficulties)[number]) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-medium text-muted-foreground">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {difficulties.map((difficulty) => (
          <Button
            key={difficulty}
            type="button"
            size="sm"
            variant={selected.includes(difficulty) ? "secondary" : "outline"}
            aria-pressed={selected.includes(difficulty)}
            onClick={() => onToggle(difficulty)}
            className="capitalize"
          >
            {difficulty}
          </Button>
        ))}
      </div>
    </fieldset>
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
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium">
      {label}
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        aria-invalid={!isInRange(value, min, max)}
        onChange={(event) =>
          onChange(event.currentTarget.value === "" ? 0 : Number(event.currentTarget.value))
        }
      />
      <span className="font-normal text-muted-foreground">
        Choose {min}–{max}.
      </span>
    </label>
  );
}

function parseWords(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\s+/)
        .map((word) => word.replace(/[^a-z]/gi, "").toUpperCase())
        .filter(Boolean),
    ),
  );
}

function isInRange(value: number, min: number, max: number) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function getDifficultyShortages(
  pageCount: number | "",
  storyPuzzle: boolean,
  selectedPuzzles: AiBookContentPuzzleType[],
  settings: NewBookContentSelection["puzzleSettings"],
) {
  const totalPages = typeof pageCount === "number" ? pageCount : 0;
  if (!Number.isInteger(totalPages)) return [];
  const puzzleSlots = new Map<string, number>();
  let puzzleIndex = 0;
  for (let pageNumber = 2; pageNumber <= totalPages; pageNumber += 1) {
    if (storyPuzzle && pageNumber % 2 === 0) continue;
    const puzzle = selectedPuzzles[puzzleIndex % selectedPuzzles.length];
    if (!puzzle) continue;
    puzzleSlots.set(puzzle, (puzzleSlots.get(puzzle) ?? 0) + 1);
    puzzleIndex += 1;
  }

  return (["sudoku", "maze"] as const).flatMap((puzzle) =>
    selectedPuzzles.includes(puzzle) &&
    (puzzle === "sudoku"
      ? settings.sudoku.difficulties.length
      : settings.maze.difficulties.length) > (puzzleSlots.get(puzzle) ?? 0)
      ? [puzzle === "sudoku" ? "Sudoku" : "Maze"]
      : [],
  );
}

type AiBookContentPuzzleType =
  NewBookContentSelection["selectedPuzzles"][number];
