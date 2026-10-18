import type {
  MazeCellWalls,
  MazeDifficulty,
  MazePathCell,
} from "./components/editor-types";

export type GeneratedMaze = {
  cells: MazeCellWalls[][];
  solutionPath: MazePathCell[];
};

export type MazeGenerationSettings = {
  rows: number;
  cols: number;
  difficulty: MazeDifficulty;
  pageCount: number;
};

export function generateMazes(
  settings: MazeGenerationSettings,
): Promise<GeneratedMaze[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./maze.worker.ts", import.meta.url), {
      type: "module",
    });
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      worker.terminate();
      callback();
    };
    worker.onmessage = (event: MessageEvent<MazeWorkerResponse>) => {
      const results = event.data.results;
      if (event.data.error) {
        finish(() => reject(new Error(event.data.error)));
      } else if (results && results.length === settings.pageCount) {
        finish(() => resolve(results));
      } else {
        finish(() => reject(new Error("Maze generation returned an invalid result.")));
      }
    };
    worker.onerror = (event) => {
      event.preventDefault();
      finish(() => reject(new Error(event.message || "Maze generation failed.")));
    };
    worker.onmessageerror = () => {
      finish(() =>
        reject(new Error("Maze generation returned unreadable data.")),
      );
    };
    worker.postMessage(settings);
  });
}

type MazeWorkerResponse = {
  results?: GeneratedMaze[];
  error?: string;
};
