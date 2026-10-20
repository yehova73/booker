import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AiBookPlanWorkspace } from "@/components/ai-studio/ai-book-plan-workspace";
import type { AiBookPageSettings } from "@/lib/ai-studio";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getPageSettings(value: unknown): AiBookPageSettings {
  if (!isRecord(value)) return {};
  const settings: AiBookPageSettings = {};
  for (const [key, setting] of Object.entries(value)) {
    if (
      typeof setting === "string" ||
      typeof setting === "boolean" ||
      (typeof setting === "number" && Number.isFinite(setting))
    ) {
      settings[key] = setting;
    }
  }
  return settings;
}

export default async function AiBookPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/?action=login");
  }

  const { id } = await params;
  const [plan, collections] = await Promise.all([
    prisma.aiBookPlan.findFirst({
      where: { id, userId: session.user.id },
      select: {
        id: true,
        title: true,
        kdpDescription: true,
        niche: true,
        pageCount: true,
        pageSize: true,
        storyMaxWordsPerPage: true,
        initialPrompt: true,
        storyPuzzle: true,
        status: true,
        generatedBooks: {
          select: { id: true, title: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        puzzles: { select: { type: true }, orderBy: { createdAt: "asc" } },
        pages: {
          select: {
            id: true,
            pageNumber: true,
            type: true,
            prompt: true,
            description: true,
            settings: true,
            regenerationCount: true,
            storyText: true,
            continuitySummary: true,
            storyStatus: true,
            storyError: true,
            updatedAt: true,
          },
          orderBy: { pageNumber: "asc" },
        },
      },
    }),
    prisma.collection.findMany({
      where: { userId: session.user.id },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);
  if (!plan) notFound();

  return (
    <AiBookPlanWorkspace
      plan={{
        ...plan,
        puzzles: plan.puzzles.map(({ type }) => type),
        generatedBooks: plan.generatedBooks.map((book) => ({
          ...book,
          createdAt: book.createdAt.toISOString(),
        })),
        collections,
        pages: plan.pages.map((page) => ({
          ...page,
          settings: getPageSettings(page.settings),
          updatedAt: page.updatedAt.toISOString(),
        })),
      }}
    />
  );
}
