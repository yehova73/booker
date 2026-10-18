import { SudokuCreator } from "@algorithm.ts/sudoku";

import type { SudokuDifficulty } from "./components/editor-types";
import { SUDOKU_DIFFICULTY_RATES } from "./sudoku-config";
import type { GeneratedSudoku } from "./sudoku-utils";

type SudokuWorkerRequest = {
  squares: 2 | 3 | 4 | 5;
  difficulty: SudokuDifficulty;
  pageCount: number;
};

self.addEventListener(
  "message",
  (event: MessageEvent<SudokuWorkerRequest>) => {
    try {
      const { squares, difficulty, pageCount } = event.data;
      const data = Array.from({ length: pageCount }, () => {
        const result = new SudokuCreator({
          childMatrixWidth: squares,
        }).createSudoku(
          (SUDOKU_DIFFICULTY_RATES[difficulty] - 0.2) / 0.8,
        );
        return {
          puzzle: result.puzzle,
          solution: result.solution,
          hiddenSquares: result.puzzle.filter((value) => value === -1).length,
        };
      });
      self.postMessage({ results: data satisfies GeneratedSudoku[] });
    } catch (error) {
      self.postMessage({
        error: error instanceof Error ? error.message : "Sudoku generation failed.",
      });
    }
  },
);
