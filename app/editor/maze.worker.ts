import type {
  MazeCellWalls,
  MazeDifficulty,
  MazePathCell,
} from "./components/editor-types";
import type { GeneratedMaze, MazeGenerationSettings } from "./maze-utils";

const directions = [
  { row: -1, col: 0, wall: "top", opposite: "bottom" },
  { row: 0, col: 1, wall: "right", opposite: "left" },
  { row: 1, col: 0, wall: "bottom", opposite: "top" },
  { row: 0, col: -1, wall: "left", opposite: "right" },
] as const;

const pathLengthTargets: Record<MazeDifficulty, number> = {
  easy: 0.2,
  medium: 0.35,
  hard: 0.5,
  insane: 0.65,
};

self.addEventListener(
  "message",
  (event: MessageEvent<MazeGenerationSettings>) => {
    try {
      const { rows, cols, difficulty, pageCount } = event.data;
      if (
        !Number.isInteger(rows) ||
        rows < 5 ||
        rows > 40 ||
        !Number.isInteger(cols) ||
        cols < 5 ||
        cols > 40 ||
        !isMazeDifficulty(difficulty) ||
        !Number.isInteger(pageCount) ||
        pageCount < 1 ||
        pageCount > 50
      ) {
        throw new Error("Maze settings are outside the supported range.");
      }

      const results = Array.from({ length: pageCount }, () =>
        generateMaze(rows, cols, difficulty),
      );
      self.postMessage({ results: results satisfies GeneratedMaze[] });
    } catch (error) {
      self.postMessage({
        error: error instanceof Error ? error.message : "Maze generation failed.",
      });
    }
  },
);

function generateMaze(
  rows: number,
  cols: number,
  difficulty: MazeDifficulty,
): GeneratedMaze {
  const target = pathLengthTargets[difficulty];
  let best: GeneratedMaze | null = null;
  let bestDifference = Number.POSITIVE_INFINITY;
  const attemptCount = 24;

  for (let attempt = 0; attempt < attemptCount; attempt += 1) {
    const cells = createPerfectMaze(rows, cols);
    const solutionPath = findSolutionPath(cells);
    const difference = Math.abs(solutionPath.length / (rows * cols) - target);
    if (difference < bestDifference) {
      best = { cells, solutionPath };
      bestDifference = difference;
    }
  }

  if (!best || best.solutionPath.length === 0) {
    throw new Error("Maze generation did not produce a valid solution path.");
  }
  return best;
}

function createPerfectMaze(rows: number, cols: number) {
  const cells: MazeCellWalls[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      top: true,
      right: true,
      bottom: true,
      left: true,
    })),
  );
  const visited = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => false),
  );
  const stack: MazePathCell[] = [{ row: 0, col: 0 }];
  visited[0][0] = true;

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const unvisitedNeighbors = directions.flatMap((direction) => {
      const row = current.row + direction.row;
      const col = current.col + direction.col;
      return row >= 0 &&
        row < rows &&
        col >= 0 &&
        col < cols &&
        !visited[row][col]
        ? [{ row, col, direction }]
        : [];
    });

    if (unvisitedNeighbors.length === 0) {
      stack.pop();
      continue;
    }

    const next =
      unvisitedNeighbors[
        Math.floor(Math.random() * unvisitedNeighbors.length)
      ];
    cells[current.row][current.col][next.direction.wall] = false;
    cells[next.row][next.col][next.direction.opposite] = false;
    visited[next.row][next.col] = true;
    stack.push({ row: next.row, col: next.col });
  }

  return cells;
}

function findSolutionPath(cells: MazeCellWalls[][]): MazePathCell[] {
  const rows = cells.length;
  const cols = cells[0]?.length ?? 0;
  const previous: (MazePathCell | null)[][] = Array.from(
    { length: rows },
    () => Array.from({ length: cols }, () => null),
  );
  const visited = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => false),
  );
  const queue: MazePathCell[] = [{ row: 0, col: 0 }];
  visited[0][0] = true;

  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head];
    if (current.row === rows - 1 && current.col === cols - 1) break;

    for (const direction of directions) {
      if (cells[current.row][current.col][direction.wall]) continue;
      const row = current.row + direction.row;
      const col = current.col + direction.col;
      if (row < 0 || row >= rows || col < 0 || col >= cols || visited[row][col])
        continue;
      visited[row][col] = true;
      previous[row][col] = current;
      queue.push({ row, col });
    }
  }

  const path: MazePathCell[] = [];
  let current: MazePathCell | null = { row: rows - 1, col: cols - 1 };
  while (current) {
    path.push(current);
    current = previous[current.row][current.col];
  }
  return path.reverse();
}

function isMazeDifficulty(value: unknown): value is MazeDifficulty {
  return (
    value === "easy" ||
    value === "medium" ||
    value === "hard" ||
    value === "insane"
  );
}
