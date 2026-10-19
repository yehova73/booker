import type { SudokuDifficulty } from "./components/editor-types";

export const SUDOKU_DIFFICULTY_RATES: Record<SudokuDifficulty, number> = {
  easy: 0.25,
  medium: 0.45,
  hard: 0.6,
  insane: 0.75,
};
