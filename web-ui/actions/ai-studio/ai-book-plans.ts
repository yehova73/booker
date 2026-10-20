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

type NewAiBookPlan = {
  title: string;
  niche: string;
  pageCount: number;
  pageSize: AiBookPageSize;
  initialPrompt: string;
  selectedPuzzles: AiBookPuzzleType[];
  storyPuzzle: boolean;
};

type AiBookPlanResult = { id: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

  return {
    value: {
      title: title.trim(),
      niche: niche.trim(),
      pageCount,
      pageSize: pageSizeOption.value,
      initialPrompt: initialPrompt.trim(),
      selectedPuzzles: [...new Set(puzzleTypes)],
      storyPuzzle,
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

  const { selectedPuzzles, ...planData } = parsed.value;
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
      settings: getDefaultAiBookPageSettings(type),
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
