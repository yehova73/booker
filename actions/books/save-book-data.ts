"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import {
  isBookDimension,
  type BookDimension,
} from "@/lib/book-dimensions";
import type { ServerActionResponse } from "@/hooks/use-server-action";

type ParsedBookData = {
  bookData: Prisma.InputJsonObject;
  title: string;
  dimension: BookDimension;
};

type BookDataResult = {
  id: string;
};

const editorElementKinds = new Set([
  "text",
  "shape",
  "artwork",
  "sudoku",
  "word-search",
  "word-search-words",
  "maze",
  "puzzle",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseBookData(
  input: unknown,
): { value: ParsedBookData } | { error: string } {
  if (!isRecord(input) || !Array.isArray(input.pages) || input.pages.length < 1) {
    return { error: "The editor document is invalid." };
  }

  const {
    bookName,
    currentPageId,
    trimPreset,
    bleedEnabled,
    zoom,
    spreadMode,
  } = input;
  if (
    typeof bookName !== "string" ||
    !bookName.trim() ||
    bookName.trim().length > 100
  ) {
    return { error: "Book titles must be between 1 and 100 characters." };
  }
  if (typeof currentPageId !== "string" || !isBookDimension(trimPreset)) {
    return { error: "The editor document has invalid book settings." };
  }
  if (
    typeof bleedEnabled !== "boolean" ||
    (zoom !== "50%" && zoom !== "75%" && zoom !== "100%" && zoom !== "Fit") ||
    (spreadMode !== "single" && spreadMode !== "spread")
  ) {
    return { error: "The editor document has invalid display settings." };
  }

  const pages: Prisma.InputJsonValue[] = [];
  const pageIds = new Set<string>();
  for (const page of input.pages) {
    if (
      !isRecord(page) ||
      typeof page.id !== "string" ||
      typeof page.title !== "string" ||
      !Array.isArray(page.elements)
    ) {
      return { error: "The editor document contains an invalid page." };
    }
    if (
      page.pageType !== undefined &&
      page.pageType !== "sudoku-solutions" &&
      page.pageType !== "puzzle-solutions"
    ) {
      return { error: "The editor document contains an invalid page type." };
    }

    const elements: Prisma.InputJsonValue[] = [];
    for (const element of page.elements) {
      if (!isRecord(element) || typeof element.kind !== "string") {
        return { error: "The editor document contains an invalid element." };
      }
      if (element.kind === "image") continue;
      if (!editorElementKinds.has(element.kind)) {
        return { error: "The editor document contains an unsupported element." };
      }

      const serializedElement = JSON.stringify(element);
      if (serializedElement === undefined) {
        return { error: "The editor document contains invalid data." };
      }
      elements.push(JSON.parse(serializedElement));
    }

    const pageData: Prisma.InputJsonObject = {
      id: page.id,
      title: page.title,
      elements,
      ...(page.pageType === undefined ? {} : { pageType: page.pageType }),
    };
    pages.push(pageData);
    pageIds.add(page.id);
  }

  if (!pageIds.has(currentPageId)) {
    return { error: "The selected page is missing from the editor document." };
  }

  return {
    value: {
      bookData: {
        bookName: bookName.trim(),
        pages,
        currentPageId,
        trimPreset,
        bleedEnabled,
        zoom,
        spreadMode,
      },
      title: bookName.trim(),
      dimension: trimPreset,
    },
  };
}

async function getAuthenticatedUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("You must be signed in to save this book.");
  }
  return session.user.id;
}

export async function saveBookDataAction(
  bookId: unknown,
  input: unknown,
): Promise<ServerActionResponse<BookDataResult>> {
  const userId = await getAuthenticatedUserId();
  if (typeof bookId !== "string" || !bookId.trim()) {
    return {
      status: "error",
      message: { title: "Book not found." },
    };
  }

  const parsed = parseBookData(input);
  if ("error" in parsed) {
    return {
      status: "error",
      message: { title: parsed.error },
    };
  }

  const book = await prisma.book.findFirst({
    where: {
      id: bookId,
      collection: { is: { userId } },
    },
    select: {
      collectionId: true,
    },
  });
  if (!book) {
    return {
      status: "error",
      message: { title: "Book not found." },
    };
  }

  const result = await prisma.book.updateMany({
    where: {
      id: bookId,
      collection: { is: { userId } },
    },
    data: {
      bookData: parsed.value.bookData,
      title: parsed.value.title,
      dimension: parsed.value.dimension,
    },
  });
  if (result.count === 0) {
    return {
      status: "error",
      message: { title: "Book not found." },
    };
  }

  revalidatePath(`/editor/${bookId}`);
  revalidatePath(`/dashboard/collections/${book.collectionId}`);
  return {
    status: "ok",
    data: { id: bookId },
  };
}
