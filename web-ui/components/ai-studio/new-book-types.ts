import type {
  AiBookPageSize,
  AiBookPuzzleType,
} from "@/generated/prisma/client";
import type { MazeDifficulty, SudokuDifficulty } from "@/app/editor/components/editor-types";

export type NewBookPuzzleSettings = {
  sudoku: {
    squares: 2 | 3 | 4 | 5;
    difficulties: SudokuDifficulty[];
  };
  wordSearch: {
    rows: number;
    cols: number;
    dictionaryName: string;
    words: string[];
    maxWords: number;
  };
  maze: {
    rows: number;
    cols: number;
    difficulties: MazeDifficulty[];
  };
};

export type NewBookMetadata = {
  title: string;
  niche: string;
  pageCount: number | "";
  pageSize: AiBookPageSize;
  initialPrompt: string;
};

export type NewBookContentSelection = {
  selectedPuzzles: AiBookPuzzleType[];
  storyPuzzle: boolean;
  puzzleSettings: NewBookPuzzleSettings;
};
