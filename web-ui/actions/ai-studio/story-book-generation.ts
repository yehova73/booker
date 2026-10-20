"use server";

import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import type { AiBookPlanPageType, Prisma } from "@/generated/prisma/client";
import type { ServerActionResponse } from "@/hooks/use-server-action";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  AI_BOOK_PLAN_PAGE_TYPES,
  AI_BOOK_STORY_WORD_LIMIT,
} from "@/lib/ai-studio";

type StoryProgress = {
  complete: boolean;
  completedStoryPages: number;
  totalStoryPages: number;
  generatedPageNumber?: number;
};

type BookResult = { id: string };

type StoryOutput = {
  storyText: string;
  continuitySummary: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function getAuthenticatedUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("You must be signed in to generate an AI book.");
  }
  return session.user.id;
}

export async function generateNextAiBookStoryPageAction(
  planId: unknown,
): Promise<ServerActionResponse<StoryProgress>> {
  const userId = await getAuthenticatedUserId();
  if (typeof planId !== "string" || !planId.trim()) {
    return { status: "error", message: { title: "Book plan not found." } };
  }

  const plan = await prisma.aiBookPlan.findFirst({
    where: { id: planId, userId },
    select: {
      id: true,
      title: true,
      niche: true,
      initialPrompt: true,
      storyMaxWordsPerPage: true,
      pages: {
        select: {
          id: true,
          pageNumber: true,
          type: true,
          prompt: true,
          description: true,
          settings: true,
          storyText: true,
          continuitySummary: true,
          storyStatus: true,
          storyError: true,
          updatedAt: true,
        },
        orderBy: { pageNumber: "asc" },
      },
    },
  });
  if (!plan) {
    return { status: "error", message: { title: "Book plan not found." } };
  }

  const storyPages = plan.pages.filter((page) => page.type === "storyScene");
  const maxWordsPerPage = plan.storyMaxWordsPerPage;
  if (
    !Number.isSafeInteger(maxWordsPerPage) ||
    maxWordsPerPage < AI_BOOK_STORY_WORD_LIMIT.minimum ||
    maxWordsPerPage > AI_BOOK_STORY_WORD_LIMIT.maximum
  ) {
    return {
      status: "error",
      message: { title: "The story word limit saved for this plan is invalid." },
    };
  }
  const totalStoryPages = storyPages.length;
  const completedPages = storyPages.filter(
    (page) => page.storyStatus === "generated" && page.storyText,
  );
  const nextPage = storyPages.find(
    (page) => page.storyStatus !== "generated" || !page.storyText,
  );

  if (!nextPage) {
    return {
      status: "ok",
      data: {
        complete: true,
        completedStoryPages: totalStoryPages,
        totalStoryPages,
      },
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      status: "error",
      message: {
        title: "Story generation is not configured.",
        description: "Set OPENAI_API_KEY to generate story pages.",
      },
    };
  }

  if (nextPage.storyStatus === "generating") {
    const isStale = Date.now() - nextPage.updatedAt.getTime() > 15 * 60 * 1000;
    if (!isStale) {
      return {
        status: "error",
        message: {
          title: `Page ${nextPage.pageNumber} is already being generated.`,
          description: "Wait a moment and try again.",
        },
      };
    }
    await prisma.aiBookPlanPage.updateMany({
      where: { id: nextPage.id, storyStatus: "generating" },
      data: {
        storyStatus: "failed",
        storyError: "The previous generation was interrupted. Retry this page.",
      },
    });
  }
  if (nextPage.storyStatus === "generated" && !nextPage.storyText) {
    await prisma.aiBookPlanPage.update({
      where: { id: nextPage.id },
      data: { storyStatus: "failed" },
    });
  }

  const claim = await prisma.aiBookPlanPage.updateMany({
    where: {
      id: nextPage.id,
      storyStatus: { in: ["pending", "failed"] },
    },
    data: { storyStatus: "generating", storyError: null },
  });
  if (claim.count !== 1) {
    return {
      status: "error",
      message: {
        title: `Page ${nextPage.pageNumber} could not be claimed for generation.`,
        description: "Another request may be generating this page.",
      },
    };
  }

  const previousStoryPage = storyPages
    .filter(
      (page) =>
        page.pageNumber < nextPage.pageNumber &&
        page.storyStatus === "generated" &&
        page.storyText,
    )
    .at(-1);

  let output: StoryOutput;
  try {
    const response = await new OpenAI({ apiKey }).responses.create({
      model: "gpt-4o-mini",
      instructions: [
        "Expand the current page's short story brief into polished story prose for exactly one printed page.",
        "The page is a Story Scene only: do not add a puzzle, activity, illustration directions, headings, or page numbers to the storyText.",
        "Continue the established story naturally. Treat the previous generated story page as canonical context even when other page types or page-number gaps occur between the story scenes.",
        "Keep character names, relationships, setting, timeline, and established facts consistent. Do not repeat or summarize the previous page; advance the story according to the current page brief.",
        "If there is no previous story page, introduce the story naturally from the book idea and current page brief.",
        `Write age-appropriate prose based on the niche. The storyText must contain no more than ${maxWordsPerPage} words. Count the words before responding and shorten the prose if needed; this is a hard maximum.`,
        "Return JSON with storyText and a concise continuitySummary of the story state after this page. The summary will be sent with the full storyText to the next story page.",
      ].join(" "),
      input: JSON.stringify({
        book: {
          title: plan.title,
          niche: plan.niche,
          initialIdea: plan.initialPrompt,
        },
        currentStoryPage: {
          pageNumber: nextPage.pageNumber,
          pageType: nextPage.type,
          brief: nextPage.prompt,
          description: nextPage.description,
          settings: nextPage.settings,
          maxWords: maxWordsPerPage,
        },
        previousStoryPage: previousStoryPage
          ? {
              pageNumber: previousStoryPage.pageNumber,
              storyText: previousStoryPage.storyText,
              continuitySummary: previousStoryPage.continuitySummary,
            }
          : null,
      }),
      text: {
        format: {
          type: "json_schema",
          name: "ai_story_page",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              storyText: { type: "string" },
              continuitySummary: { type: "string" },
            },
            required: ["storyText", "continuitySummary"],
          },
        },
      },
    });
    output = parseStoryOutput(response.output_text);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "The AI provider returned an unknown error.";
    await prisma.aiBookPlanPage.update({
      where: { id: nextPage.id },
      data: {
        storyStatus: "failed",
        storyError: message.slice(0, 1000),
      },
    });
    revalidatePath(`/dashboard/ai-studio/plan/${plan.id}`);
    return {
      status: "error",
      requireRefresh: true,
      message: {
        title: `Could not generate story page ${nextPage.pageNumber}.`,
        description: message,
      },
    };
  }

  await prisma.aiBookPlanPage.update({
    where: { id: nextPage.id },
    data: {
      storyText: output.storyText,
      continuitySummary: output.continuitySummary,
      storyStatus: "generated",
      storyError: null,
    },
  });

  const completedStoryPages = completedPages.length + 1;
  const complete = completedStoryPages === totalStoryPages;
  revalidatePath(`/dashboard/ai-studio/plan/${plan.id}`);
  return {
    status: "ok",
    data: {
      complete,
      completedStoryPages,
      totalStoryPages,
      generatedPageNumber: nextPage.pageNumber,
    },
    requireRefresh: complete,
  };
}

function parseStoryOutput(value: string): StoryOutput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("The AI story response was not valid JSON.");
  }
  if (
    !isRecord(parsed) ||
    typeof parsed.storyText !== "string" ||
    !parsed.storyText.trim() ||
    parsed.storyText.length > 6000 ||
    typeof parsed.continuitySummary !== "string" ||
    !parsed.continuitySummary.trim() ||
    parsed.continuitySummary.length > 1200
  ) {
    throw new Error("The AI story response did not match the required format.");
  }
  return {
    storyText: parsed.storyText.trim(),
    continuitySummary: parsed.continuitySummary.trim(),
  };
}

export async function setAiBookPlanStoryWordLimitAction(
  planId: unknown,
  maxWordsPerPage: unknown,
): Promise<ServerActionResponse<{ maxWordsPerPage: number }>> {
  const userId = await getAuthenticatedUserId();
  if (
    typeof planId !== "string" ||
    !planId.trim() ||
    typeof maxWordsPerPage !== "number" ||
    !Number.isSafeInteger(maxWordsPerPage) ||
    maxWordsPerPage < AI_BOOK_STORY_WORD_LIMIT.minimum ||
    maxWordsPerPage > AI_BOOK_STORY_WORD_LIMIT.maximum
  ) {
    return {
      status: "error",
      message: {
        title: `Choose a maximum from ${AI_BOOK_STORY_WORD_LIMIT.minimum} to ${AI_BOOK_STORY_WORD_LIMIT.maximum} words per page.`,
      },
    };
  }

  const plan = await prisma.aiBookPlan.findFirst({
    where: { id: planId, userId },
    select: { id: true, storyMaxWordsPerPage: true },
  });
  if (!plan) {
    return { status: "error", message: { title: "Book plan not found." } };
  }
  if (plan.storyMaxWordsPerPage === maxWordsPerPage) {
    return { status: "ok", data: { maxWordsPerPage } };
  }

  const generatingPage = await prisma.aiBookPlanPage.findFirst({
    where: {
      planId: plan.id,
      type: "storyScene",
      storyStatus: "generating",
    },
    select: { pageNumber: true },
  });
  if (generatingPage) {
    return {
      status: "error",
      message: {
        title: `Wait for page ${generatingPage.pageNumber} to finish before changing the word limit.`,
      },
    };
  }

  await prisma.$transaction([
    prisma.aiBookPlan.update({
      where: { id: plan.id },
      data: { storyMaxWordsPerPage: maxWordsPerPage },
    }),
    prisma.aiBookPlanPage.updateMany({
      where: { planId: plan.id, type: "storyScene" },
      data: {
        storyText: null,
        continuitySummary: null,
        storyStatus: "pending",
        storyError: null,
      },
    }),
  ]);

  revalidatePath(`/dashboard/ai-studio/plan/${plan.id}`);
  return {
    status: "ok",
    data: { maxWordsPerPage },
    requireRefresh: true,
    message: {
      title: "Story word limit updated.",
      description: "Existing story pages were cleared so they match the new limit.",
    },
  };
}

export async function createAiBookFromPlanAction(
  planId: unknown,
  collectionId: unknown,
): Promise<ServerActionResponse<BookResult>> {
  const userId = await getAuthenticatedUserId();
  if (
    typeof planId !== "string" ||
    !planId.trim() ||
    typeof collectionId !== "string" ||
    !collectionId.trim()
  ) {
    return {
      status: "error",
      message: { title: "Choose a collection to create the book." },
    };
  }

  const [plan, collection] = await Promise.all([
    prisma.aiBookPlan.findFirst({
      where: { id: planId, userId },
      select: {
        id: true,
        title: true,
        kdpDescription: true,
        pageCount: true,
        pageSize: true,
        pages: {
          select: {
            pageNumber: true,
            type: true,
            prompt: true,
            description: true,
            storyText: true,
            storyStatus: true,
          },
          orderBy: { pageNumber: "asc" },
        },
      },
    }),
    prisma.collection.findFirst({
      where: { id: collectionId, userId },
      select: { id: true },
    }),
  ]);
  if (!plan) {
    return { status: "error", message: { title: "Book plan not found." } };
  }
  if (!collection) {
    return { status: "error", message: { title: "Collection not found." } };
  }
  if (plan.pages.length !== plan.pageCount) {
    return {
      status: "error",
      message: { title: "This plan is missing page records." },
    };
  }
  if (
    plan.pages.some(
      (page) =>
        page.type === "storyScene" &&
        (page.storyStatus !== "generated" || !page.storyText),
    )
  ) {
    return {
      status: "error",
      message: {
        title: "Generate all story pages before creating the book.",
      },
    };
  }

  const coverPage = plan.pages.find((page) => page.pageNumber === 1);
  if (!coverPage || coverPage.type !== "titlePage") {
    return {
      status: "error",
      message: { title: "The cover page is missing." },
    };
  }

  const editorPages = plan.pages.map((page) => ({
    id: randomUUID(),
    title:
      page.type === "titlePage"
        ? "Cover"
        : `${getPageTypeLabel(page.type)} — Page ${page.pageNumber}`,
    aiPageType: page.type,
    aiPageDescription: page.description,
    elements:
      page.type === "titlePage"
        ? [
            createTextElement(
              plan.title,
              "chapter-title",
              36,
              10,
              40,
              80,
              20,
              "center",
            ),
          ]
        : page.type === "storyScene"
          ? [
              createTextElement(
                page.storyText ?? "",
                "paragraph",
                12,
                10,
                12,
                80,
                76,
                "left",
              ),
            ]
          : [
              createTextElement(
                `${getPageTypeLabel(page.type)} blueprint\n\n${page.description}\n\nPrompt: ${page.prompt}`,
                "body",
                12,
                10,
                12,
                80,
                76,
                "left",
              ),
            ],
  }));
  const coverPageId = editorPages[0]?.id;
  if (!coverPageId) {
    return {
      status: "error",
      message: { title: "The cover page is missing." },
    };
  }

  const bookData: Prisma.InputJsonObject = {
    bookName: plan.title,
    pages: editorPages,
    currentPageId: coverPageId,
    trimPreset: plan.pageSize,
    bleedEnabled: false,
    zoom: "Fit",
    spreadMode: "spread",
    design: {
      pageNumbers: {
        enabled: false,
        format: "arabic",
        position: "bottom-outer",
        fontFamily: "serif",
        fontSize: 10,
        color: "#59655e",
      },
      pageBorder: {
        enabled: false,
        style: "solid",
        inset: 4,
        width: 1,
        color: "#59655e",
      },
      excludedPageIds: [],
      elements: [],
    },
  };

  const book = await prisma.book.create({
    data: {
      title: plan.title,
      description: plan.kdpDescription,
      dimension: plan.pageSize,
      bookData,
      coverPageId,
      collectionId: collection.id,
      aiBookPlanId: plan.id,
    },
    select: { id: true },
  });

  revalidatePath("/dashboard/ebooks");
  revalidatePath(`/dashboard/collections/${collection.id}`);
  revalidatePath(`/dashboard/ai-studio/plan/${plan.id}`);
  return {
    status: "ok",
    data: book,
    requireRefresh: true,
    message: { title: "Your book has been created." },
  };
}

function createTextElement(
  content: string,
  textStyle: "chapter-title" | "paragraph" | "body",
  fontSize: number,
  x: number,
  y: number,
  width: number,
  height: number,
  alignment: "left" | "center",
) {
  return {
    id: randomUUID(),
    kind: "text",
    textStyle,
    content,
    fontFamily: "serif",
    fontSize,
    color: "#2b4736",
    backgroundColor: null,
    rotation: 0,
    lineSpacing: 0,
    tracking: 0,
    bold: textStyle === "chapter-title",
    italic: false,
    alignment,
    lineHeight: 1.45,
    x,
    y,
    width,
    height,
    zIndex: 0,
  };
}

function getPageTypeLabel(type: AiBookPlanPageType) {
  return (
    AI_BOOK_PLAN_PAGE_TYPES.find((option) => option.value === type)?.label ??
    "Activity"
  );
}
