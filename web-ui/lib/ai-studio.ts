import type {
  AiBookPageSize,
  AiBookPlanPageType,
  AiBookPuzzleType,
} from "@/generated/prisma/client";

export const AI_STUDIO_PUZZLE_OPTIONS = [
  { value: "sudoku", label: "Sudoku" },
  { value: "wordSearch", label: "Word search" },
  { value: "maze", label: "Maze" },
  { value: "crossword", label: "Crossword" },
  { value: "wordScramble", label: "Word scramble" },
  { value: "logicPuzzle", label: "Logic puzzle" },
  { value: "coloringPage", label: "Coloring page" },
] as const satisfies readonly {
  value: AiBookPuzzleType;
  label: string;
}[];

export const AI_BOOK_PAGE_SIZES = [
  {
    value: "letter",
    dimensions: '8.5" x 11"',
    description: "Standard Activity / Coloring",
  },
  {
    value: "paperback",
    dimensions: '6" x 9"',
    description: "Trade Paperback / Puzzle",
  },
  {
    value: "square",
    dimensions: '8.5" x 8.5"',
    description: "Square Picture / Coloring",
  },
] as const satisfies readonly {
  value: AiBookPageSize;
  dimensions: string;
  description: string;
}[];

export const AI_BOOK_NICHE_OPTIONS = [
  "Kids Activity",
  "Seniors Puzzle",
  "Dinosaur Theme",
  "Mindfulness & Relaxation",
  "Travel & Adventure",
] as const;

export const AI_BOOK_PLAN_PAGE_TYPES = [
  { value: "titlePage", label: "Title Page" },
  { value: "storyScene", label: "Story Scene" },
  { value: "activity", label: "Activity" },
  ...AI_STUDIO_PUZZLE_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  })),
] as const satisfies readonly {
  value: AiBookPlanPageType;
  label: string;
}[];

export type AiBookPageSettings = Record<string, string | number | boolean>;

export function getDefaultAiBookPageSettings(
  type: AiBookPlanPageType,
): AiBookPageSettings {
  if (type === "sudoku" || type === "maze") {
    return { difficulty: "medium" };
  }
  if (type === "wordSearch" || type === "crossword") {
    return { gridSize: 10 };
  }
  if (type === "coloringPage") {
    return { artStyle: "line-art" };
  }
  if (type === "storyScene") {
    return { tone: "warm and adventurous" };
  }
  return {};
}
