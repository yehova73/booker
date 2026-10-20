"use server";

import OpenAI from "openai";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import type { Prisma } from "@/generated/prisma/client";
import type { AiBookPlanPageType } from "@/generated/prisma/client";
import type { ServerActionResponse } from "@/hooks/use-server-action";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  AI_BOOK_PLAN_PAGE_TYPES,
  AI_STUDIO_PUZZLE_OPTIONS,
} from "@/lib/ai-studio";

type PageUpdateInput = {
  type: AiBookPlanPageType;
  prompt: string;
  description: string;
  settings: Prisma.InputJsonObject;
};

type PageResult = { id: string };
type RegeneratedPrompt = { prompt: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePageUpdate(
  input: unknown,
): { value: PageUpdateInput } | { error: string } {
  if (!isRecord(input)) {
    return { error: "Enter the page settings before saving." };
  }

  const { type, prompt, description, settings } = input;
  if (
    typeof type !== "string" ||
    !AI_BOOK_PLAN_PAGE_TYPES.some((option) => option.value === type)
  ) {
    return { error: "Choose a valid page type." };
  }
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 4000) {
    return { error: "Page prompts must contain 1 to 4,000 characters." };
  }
  if (
    typeof description !== "string" ||
    description.length > 1000
  ) {
    return { error: "Page descriptions must be 1,000 characters or fewer." };
  }
  if (!isRecord(settings)) {
    return { error: "Page settings are invalid." };
  }

  const parsedSettings: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(settings)) {
    if (
      !["difficulty", "gridSize", "artStyle", "tone"].includes(key) ||
      (typeof value !== "string" &&
        typeof value !== "number" &&
        typeof value !== "boolean") ||
      (typeof value === "number" && !Number.isFinite(value))
    ) {
      return { error: "Page settings are invalid." };
    }
    parsedSettings[key] = value;
  }

  return {
    value: {
      type: type as AiBookPlanPageType,
      prompt: prompt.trim(),
      description: description.trim(),
      settings: parsedSettings,
    },
  };
}

async function getAuthenticatedUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("You must be signed in to manage AI book pages.");
  }
  return session.user.id;
}

function isAvailablePageType(
  type: AiBookPlanPageType,
  pageNumber: number,
  storyPuzzle: boolean,
  puzzles: { type: string }[],
) {
  if (type === "titlePage") return pageNumber === 1;
  if (pageNumber === 1) return false;
  if (storyPuzzle && puzzles.length === 0) return type === "storyScene";
  if (storyPuzzle && type === "storyScene") return true;
  if (puzzles.length === 0) return type === "activity";
  if (type === "activity") return false;
  return (
    AI_STUDIO_PUZZLE_OPTIONS.some((option) => option.value === type) &&
    puzzles.some((puzzle) => puzzle.type === type)
  );
}

export async function updateAiBookPlanPageAction(
  pageId: unknown,
  input: unknown,
): Promise<ServerActionResponse<PageResult>> {
  const userId = await getAuthenticatedUserId();
  if (typeof pageId !== "string" || !pageId.trim()) {
    return { status: "error", message: { title: "Page not found." } };
  }
  const parsed = parsePageUpdate(input);
  if ("error" in parsed) {
    return { status: "error", message: { title: parsed.error } };
  }

  const page = await prisma.aiBookPlanPage.findFirst({
    where: {
      id: pageId,
      plan: { is: { userId } },
    },
    select: {
      id: true,
      planId: true,
      pageNumber: true,
      type: true,
      prompt: true,
      description: true,
      settings: true,
      storyStatus: true,
      plan: {
        select: {
          storyPuzzle: true,
          puzzles: { select: { type: true } },
        },
      },
    },
  });
  if (!page) {
    return { status: "error", message: { title: "Page not found." } };
  }
  if (page.storyStatus === "generating") {
    return {
      status: "error",
      message: { title: "This story page is currently being generated." },
    };
  }
  if (
    !isAvailablePageType(
      parsed.value.type,
      page.pageNumber,
      page.plan.storyPuzzle,
      page.plan.puzzles,
    )
  ) {
    return {
      status: "error",
      message: { title: "That page type is not selected for this book." },
    };
  }

  const updated = await savePageUpdate(page, parsed.value);
  revalidatePath(`/dashboard/ai-studio/plan/${page.planId}`);
  return {
    status: "ok",
    data: updated,
    requireRefresh: true,
    message: { title: "Page settings saved." },
  };
}

export async function regenerateAiBookPlanPageAction(
  pageId: unknown,
  input: unknown,
): Promise<ServerActionResponse<RegeneratedPrompt>> {
  const userId = await getAuthenticatedUserId();
  if (typeof pageId !== "string" || !pageId.trim()) {
    return { status: "error", message: { title: "Page not found." } };
  }
  const parsed = parsePageUpdate(input);
  if ("error" in parsed) {
    return { status: "error", message: { title: parsed.error } };
  }

  const page = await prisma.aiBookPlanPage.findFirst({
    where: {
      id: pageId,
      plan: { is: { userId } },
    },
    select: {
      id: true,
      planId: true,
      pageNumber: true,
      type: true,
      prompt: true,
      description: true,
      settings: true,
      storyStatus: true,
      plan: {
        select: {
          title: true,
          initialPrompt: true,
          storyPuzzle: true,
          puzzles: { select: { type: true } },
        },
      },
    },
  });
  if (!page) {
    return { status: "error", message: { title: "Page not found." } };
  }
  if (page.storyStatus === "generating") {
    return {
      status: "error",
      message: { title: "This story page is currently being generated." },
    };
  }
  if (
    !isAvailablePageType(
      parsed.value.type,
      page.pageNumber,
      page.plan.storyPuzzle,
      page.plan.puzzles,
    )
  ) {
    return {
      status: "error",
      message: { title: "That page type is not selected for this book." },
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      status: "error",
      message: {
        title: "AI prompt regeneration is not configured.",
        description: "Set OPENAI_API_KEY to regenerate page prompts.",
      },
    };
  }

  let prompt: string;
  try {
    const response = await new OpenAI({ apiKey }).responses.create({
      model: "gpt-4o-mini",
      instructions:
        "Write one original, concise book-page prompt based on the provided book idea and page type. Keep the result specific, age-appropriate, self-contained, and under 250 words. Return only the prompt text.",
      input: [
        `Book title: ${page.plan.title}`,
        `Book idea: ${page.plan.initialPrompt}`,
        `Page number: ${page.pageNumber}`,
        `Page type: ${parsed.value.type}`,
        `Current prompt to improve: ${parsed.value.prompt}`,
      ].join("\n\n"),
    });
    prompt = response.output_text.trim().slice(0, 4000);
  } catch (error) {
    return {
      status: "error",
      message: {
        title: "Could not regenerate this page prompt.",
        description:
          error instanceof Error
            ? error.message
            : "The AI provider returned an unknown error.",
      },
    };
  }

  if (!prompt) {
    return {
      status: "error",
      message: { title: "The AI provider returned an empty page prompt." },
    };
  }

  await savePageUpdate(page, {
    ...parsed.value,
    prompt,
  }, true);
  revalidatePath(`/dashboard/ai-studio/plan/${page.planId}`);
  return {
    status: "ok",
    data: { prompt },
    requireRefresh: true,
    message: { title: "Page prompt regenerated." },
  };
}

async function savePageUpdate(
  page: {
    id: string;
    planId: string;
    pageNumber: number;
    type: AiBookPlanPageType;
    prompt: string;
    description: string;
    settings: unknown;
  },
  update: PageUpdateInput,
  regeneratePrompt = false,
) {
  const storyInputChanged =
    page.type !== update.type ||
    page.prompt !== update.prompt ||
    page.description !== update.description ||
    JSON.stringify(page.settings) !== JSON.stringify(update.settings);
  const invalidatesStory = storyInputChanged &&
    (page.type === "storyScene" || update.type === "storyScene");

  return prisma.$transaction(async (transaction) => {
    const updated = await transaction.aiBookPlanPage.update({
      where: { id: page.id },
      data: {
        ...update,
        ...(regeneratePrompt
          ? { regenerationCount: { increment: 1 } }
          : {}),
        ...(invalidatesStory
          ? {
              storyText: null,
              continuitySummary: null,
              storyStatus: "pending",
              storyError: null,
            }
          : {}),
      },
      select: { id: true },
    });
    if (invalidatesStory) {
      await transaction.aiBookPlanPage.updateMany({
        where: {
          planId: page.planId,
          pageNumber: { gt: page.pageNumber },
          type: "storyScene",
          storyStatus: "generated",
        },
        data: {
          storyText: null,
          continuitySummary: null,
          storyStatus: "pending",
          storyError: null,
        },
      });
    }
    return updated;
  });
}
