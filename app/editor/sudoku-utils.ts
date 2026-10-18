import type { SudokuDifficulty } from "./components/editor-types";
import { SUDOKU_DIFFICULTY_RATES } from "./sudoku-config";

export { SUDOKU_DIFFICULTY_RATES } from "./sudoku-config";

export type GeneratedSudoku = {
  puzzle: number[];
  solution: number[];
  hiddenSquares: number;
};

export function updateSudokuDifficulty(
  puzzle: number[],
  solution: number[],
  difficulty: SudokuDifficulty,
): GeneratedSudoku {
  const nextPuzzle = [...puzzle];
  const targetHiddenSquares = Math.floor(
    nextPuzzle.length * SUDOKU_DIFFICULTY_RATES[difficulty],
  );
  const hiddenPositions = nextPuzzle.flatMap((value, index) =>
    value === -1 ? [index] : [],
  );
  const filledPositions = nextPuzzle.flatMap((value, index) =>
    value === -1 ? [] : [index],
  );

  shuffle(hiddenPositions);
  shuffle(filledPositions);
  if (targetHiddenSquares > hiddenPositions.length) {
    for (
      let index = 0;
      index < targetHiddenSquares - hiddenPositions.length;
      index += 1
    ) {
      const position = filledPositions[index];
      if (position === undefined) break;
      nextPuzzle[position] = -1;
    }
  } else {
    for (
      let index = 0;
      index < hiddenPositions.length - targetHiddenSquares;
      index += 1
    ) {
      const position = hiddenPositions[index];
      nextPuzzle[position] = solution[position];
    }
  }

  return {
    puzzle: nextPuzzle,
    solution,
    hiddenSquares: nextPuzzle.filter((value) => value === -1).length,
  };
}

export function generateSudokus(
  squares: 2 | 3 | 4 | 5,
  difficulty: SudokuDifficulty,
  pageCount: number,
): Promise<GeneratedSudoku[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./sudoku.worker.ts", import.meta.url), {
      type: "module",
    });
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      worker.terminate();
      callback();
    };
    worker.onmessage = (event: MessageEvent<SudokuWorkerResponse>) => {
      const results = event.data.results;
      if (event.data.error) {
        finish(() => reject(new Error(event.data.error)));
      } else if (results && results.length === pageCount) {
        finish(() => resolve(results));
      } else {
        finish(() =>
          reject(new Error("Sudoku generation returned an invalid result.")),
        );
      }
    };
    worker.onerror = (event) => {
      event.preventDefault();
      finish(() =>
        reject(new Error(event.message || "Sudoku generation failed.")),
      );
    };
    worker.onmessageerror = () => {
      finish(() =>
        reject(new Error("Sudoku generation returned unreadable data.")),
      );
    };
    worker.postMessage({ squares, difficulty, pageCount });
  });
}

function shuffle(values: number[]) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
}

type SudokuWorkerResponse = {
  results?: GeneratedSudoku[];
  error?: string;
};

export function isSudokuDifficulty(value: unknown): value is SudokuDifficulty {
  return (
    value === "easy" ||
    value === "medium" ||
    value === "hard" ||
    value === "insane"
  );
}
