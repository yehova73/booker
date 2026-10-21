"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ServerActionResponse } from "@/hooks/use-server-action";
import {
  AI_BOOK_PLAN_PAGE_TYPES,
  AI_BOOK_PAGE_SIZES,
  AI_STUDIO_PUZZLE_OPTIONS,
  getDefaultAiBookPageSettings,
} from "@/lib/ai-studio";
import type {
  AiBookPageSize,
  AiBookPlanPageType,
  AiBookPuzzleType,
} from "@/generated/prisma/client";
import type { NewBookPuzzleSettings } from "@/components/ai-studio/new-book-types";
import type { MazeDifficulty, SudokuDifficulty } from "@/app/editor/components/editor-types";

type NewAiBookPlan = {
  title: string;
  niche: string;
  pageCount: number;
  pageSize: AiBookPageSize;
  initialPrompt: string;
  selectedPuzzles: AiBookPuzzleType[];
  storyPuzzle: boolean;
  puzzleSettings: NewBookPuzzleSettings;
};

type AiBookPlanResult = { id: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const sudokuDifficulties: SudokuDifficulty[] = [
  "easy",
  "medium",
  "hard",
  "insane",
];
const mazeDifficulties: MazeDifficulty[] = [
  "easy",
  "medium",
  "hard",
  "insane",
];

function parseDifficulties<T extends string>(
  value: unknown,
  allowed: T[],
): T[] | null {
  if (!Array.isArray(value)) return null;
  const parsed = value.filter(
    (item): item is T =>
      typeof item === "string" && allowed.includes(item as T),
  );
  return parsed.length === value.length ? [...new Set(parsed)] : null;
}

function parsePuzzleSettings(
  value: unknown,
  selectedPuzzles: AiBookPuzzleType[],
): NewBookPuzzleSettings | null {
  if (!isRecord(value)) return null;
  const selected = new Set(selectedPuzzles);
  const sudoku = isRecord(value.sudoku) ? value.sudoku : {};
  const sudokuSquares = Number(sudoku.squares);
  const sudokuLevels = parseDifficulties(sudoku.difficulties, sudokuDifficulties);
  const validSudoku =
    [2, 3, 4, 5].includes(sudokuSquares) && sudokuLevels !== null;
  if (selected.has("sudoku") && !validSudoku) return null;

  const wordSearch = isRecord(value.wordSearch) ? value.wordSearch : {};
  const wordsAreValid =
    Array.isArray(wordSearch.words) &&
    wordSearch.words.every((word) => typeof word === "string");
  const words = wordsAreValid
    ? [...new Set(
        (wordSearch.words as string[])
          .map((word) => word.replace(/[^a-z]/gi, "").toUpperCase())
          .filter(Boolean),
      )]
    : [];
  const validWordSearch =
    isIntegerInRange(wordSearch.rows, 5, 30) &&
    isIntegerInRange(wordSearch.cols, 5, 30) &&
    isIntegerInRange(wordSearch.maxWords, 1, 100) &&
    typeof wordSearch.dictionaryName === "string" &&
    Boolean(wordSearch.dictionaryName.trim()) &&
    wordSearch.dictionaryName.length <= 100 &&
    wordsAreValid &&
    words.length > 0 &&
    words.length <= 1000 &&
    words.some(
      (word) =>
        word.length <=
        Math.max(Number(wordSearch.rows), Number(wordSearch.cols)),
    );
  if (selected.has("wordSearch") && !validWordSearch) return null;

  const maze = isRecord(value.maze) ? value.maze : {};
  const mazeLevels = parseDifficulties(maze.difficulties, mazeDifficulties);
  const validMaze =
    isIntegerInRange(maze.rows, 5, 40) &&
    isIntegerInRange(maze.cols, 5, 40) &&
    mazeLevels !== null;
  if (selected.has("maze") && !validMaze) return null;

  return {
    sudoku: {
      squares: validSudoku ? (sudokuSquares as 2 | 3 | 4 | 5) : 3,
      difficulties: sudokuLevels ?? ["medium"],
    },
    wordSearch: {
      rows: validWordSearch ? Number(wordSearch.rows) : 15,
      cols: validWordSearch ? Number(wordSearch.cols) : 15,
      dictionaryName: validWordSearch
        ? String(wordSearch.dictionaryName).trim()
        : "Custom",
      words: validWordSearch ? words : ["BOOK", "PAGE", "PUZZLE", "FUN", "WORD"],
      maxWords: validWordSearch ? Number(wordSearch.maxWords) : 5,
    },
    maze: {
      rows: validMaze ? Number(maze.rows) : 15,
      cols: validMaze ? Number(maze.cols) : 15,
      difficulties: mazeLevels ?? ["medium"],
    },
  };
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= min &&
    value <= max
  );
}

function parsePlanInput(
  input: unknown,
): { value: NewAiBookPlan } | { error: string } {
  if (!isRecord(input)) {
    return { error: "Enter the AI book details before generating a blueprint." };
  }

  const {
    title,
    niche,
    pageCount,
    pageSize,
    initialPrompt,
    selectedPuzzles,
    storyPuzzle,
    puzzleSettings,
  } = input;

  if (typeof title !== "string" || !title.trim()) {
    return { error: "A book title is required." };
  }
  if (title.trim().length > 100) {
    return { error: "Book titles must be 100 characters or fewer." };
  }
  if (typeof niche !== "string" || niche.length > 100) {
    return { error: "Niches must be 100 characters or fewer." };
  }
  if (
    typeof pageCount !== "number" ||
    !Number.isSafeInteger(pageCount) ||
    pageCount < 24 ||
    pageCount > 828
  ) {
    return { error: "Choose a whole number of pages between 24 and 828." };
  }
  if (typeof pageSize !== "string") {
    return { error: "Choose a valid page size." };
  }
  const pageSizeOption = AI_BOOK_PAGE_SIZES.find(
    (option) => option.value === pageSize,
  );
  if (!pageSizeOption) {
    return { error: "Choose a valid page size." };
  }
  if (typeof initialPrompt !== "string" || !initialPrompt.trim()) {
    return { error: "An initial idea or prompt is required." };
  }
  if (!Array.isArray(selectedPuzzles)) {
    return { error: "Choose valid puzzle types." };
  }
  const puzzleTypes: AiBookPuzzleType[] = [];
  for (const puzzle of selectedPuzzles) {
    if (typeof puzzle !== "string") {
      return { error: "Choose valid puzzle types." };
    }
    const option = AI_STUDIO_PUZZLE_OPTIONS.find(
      (candidate) => candidate.value === puzzle,
    );
    if (!option) {
      return { error: "Choose valid puzzle types." };
    }
    puzzleTypes.push(option.value);
  }
  if (typeof storyPuzzle !== "boolean") {
    return { error: "Choose whether to include Story Puzzle." };
  }
  const uniquePuzzleTypes = [...new Set(puzzleTypes)];
  const parsedPuzzleSettings = parsePuzzleSettings(
    puzzleSettings,
    uniquePuzzleTypes,
  );
  if (!parsedPuzzleSettings) {
    return { error: "Choose valid settings for the selected puzzle types." };
  }
  if (
    puzzleTypes.includes("sudoku") &&
    parsedPuzzleSettings.sudoku.difficulties.length === 0
  ) {
    return { error: "Choose at least one Sudoku difficulty." };
  }
  if (
    puzzleTypes.includes("maze") &&
    parsedPuzzleSettings.maze.difficulties.length === 0
  ) {
    return { error: "Choose at least one Maze difficulty." };
  }

  return {
    value: {
      title: title.trim(),
      niche: niche.trim(),
      pageCount,
      pageSize: pageSizeOption.value,
      initialPrompt: initialPrompt.trim(),
      selectedPuzzles: uniquePuzzleTypes,
      storyPuzzle,
      puzzleSettings: parsedPuzzleSettings,
    },
  };
}

export async function createAiBookPlanAction(
  input: unknown,
): Promise<ServerActionResponse<AiBookPlanResult>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("You must be signed in to create an AI book plan.");
  }

  const parsed = parsePlanInput(input);
  if ("error" in parsed) {
    return {
      status: "error",
      message: { title: parsed.error },
    };
  }

  const { selectedPuzzles, puzzleSettings, ...planData } = parsed.value;
  const settingsByTypeIndex = new Map<AiBookPuzzleType, number>();
  const pages = Array.from({ length: planData.pageCount }, (_, index) => {
    const pageNumber = index + 1;
    const type = getInitialPageType(
      pageNumber,
      selectedPuzzles,
      planData.storyPuzzle,
    );
    return {
      pageNumber,
      type,
      prompt: getInitialPagePrompt(
        pageNumber,
        type,
        planData.title,
        planData.initialPrompt,
      ),
      description: `${type} content for page ${pageNumber}.`,
      settings: getInitialPageSettings(
        type,
        puzzleSettings,
        settingsByTypeIndex,
      ),
    };
  });
  const plan = await prisma.aiBookPlan.create({
    data: {
      ...planData,
      puzzles: {
        create: selectedPuzzles.map((type) => ({ type })),
      },
      pages: { create: pages },
      userId: session.user.id,
    },
    select: { id: true },
  });

  revalidatePath("/dashboard/ai-studio");
  return {
    status: "ok",
    data: plan,
    message: { title: "Blueprint draft created." },
  };
}

function getInitialPageSettings(
  type: AiBookPlanPageType,
  puzzleSettings: NewBookPuzzleSettings,
  settingsByTypeIndex: Map<AiBookPuzzleType, number>,
) {
  if (type === "sudoku") {
    const index = settingsByTypeIndex.get(type) ?? 0;
    settingsByTypeIndex.set(type, index + 1);
    const difficulties = puzzleSettings.sudoku.difficulties;
    return {
      squares: puzzleSettings.sudoku.squares,
      difficulty: difficulties[index % difficulties.length] ?? "easy",
      difficultyOptions: difficulties.join(","),
    };
  }
  if (type === "maze") {
    const index = settingsByTypeIndex.get(type) ?? 0;
    settingsByTypeIndex.set(type, index + 1);
    const difficulties = puzzleSettings.maze.difficulties;
    return {
      rows: puzzleSettings.maze.rows,
      cols: puzzleSettings.maze.cols,
      difficulty: difficulties[index % difficulties.length] ?? "medium",
      difficultyOptions: difficulties.join(","),
    };
  }
  if (type === "wordSearch") {
    const { rows, cols, dictionaryName, words, maxWords } =
      puzzleSettings.wordSearch;
    return {
      rows,
      cols,
      dictionaryName,
      words: words.join(" "),
      maxWords,
    };
  }
  return getDefaultAiBookPageSettings(type);
}

function getInitialPageType(
  pageNumber: number,
  puzzles: AiBookPuzzleType[],
  storyPuzzle: boolean,
): AiBookPlanPageType {
  if (pageNumber === 1) return "titlePage";
  if (storyPuzzle && puzzles.length > 0 && pageNumber % 2 === 0) {
    return "storyScene";
  }
  if (storyPuzzle && puzzles.length === 0) return "storyScene";
  if (puzzles.length === 0) return "activity";

  const puzzleIndex =
    storyPuzzle && pageNumber % 2 === 1
      ? Math.floor((pageNumber - 3) / 2)
      : storyPuzzle
        ? 0
        : pageNumber - 2;
  return puzzles[puzzleIndex % puzzles.length];
}

function getInitialPagePrompt(
  pageNumber: number,
  type: AiBookPlanPageType,
  title: string,
  initialPrompt: string,
) {
  if (type === "titlePage") {
    return `Create a title-page concept for "${title}" based on this book idea: ${initialPrompt}`;
  }
  const label =
    AI_BOOK_PLAN_PAGE_TYPES.find((option) => option.value === type)?.label ??
    "Activity";
  return `${label} for page ${pageNumber}, inspired by this book idea: ${initialPrompt}`;
}
