"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { isBookDimension, type BookDimension } from "@/lib/book-dimensions";
import type { ServerActionResponse } from "@/hooks/use-server-action";

type ParsedBookData = {
  bookData: Prisma.InputJsonObject;
  title: string;
  dimension: BookDimension;
  fileIds: string[];
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
  fileKeys?: Map<string, string>,
): { value: ParsedBookData } | { error: string } {
  if (
    !isRecord(input) ||
    !Array.isArray(input.pages) ||
    input.pages.length < 1
  ) {
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
  const fileIds = new Set<string>();
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
      if (element.kind === "image") {
        if (
          typeof element.fileId !== "string" ||
          !element.fileId.trim() ||
          typeof element.src !== "string" ||
          typeof element.alt !== "string"
        ) {
          return { error: "The editor document contains an invalid image." };
        }
        const storageKey = fileKeys?.get(element.fileId);
        if (fileKeys && !storageKey) {
          return { error: "One or more images are not available." };
        }

        const serializedElement = JSON.stringify({
          ...element,
          ...(storageKey ? { src: storageKey } : {}),
        });
        if (serializedElement === undefined) {
          return { error: "The editor document contains invalid data." };
        }
        elements.push(JSON.parse(serializedElement));
        fileIds.add(element.fileId);
        continue;
      }
      if (!editorElementKinds.has(element.kind)) {
        return {
          error: "The editor document contains an unsupported element.",
        };
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
      fileIds: [...fileIds],
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
  bookId: string,
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

  const files = await prisma.file.findMany({
    where: {
      id: { in: parsed.value.fileIds },
      userId,
    },
    select: { id: true, storageKey: true },
  });
  if (files.length !== parsed.value.fileIds.length) {
    return {
      status: "error",
      message: { title: "One or more images are not available." },
    };
  }

  const normalized = parseBookData(
    input,
    new Map(files.map(({ id, storageKey }) => [id, storageKey])),
  );
  if ("error" in normalized) {
    return {
      status: "error",
      message: { title: normalized.error },
    };
  }

  const updated = await prisma.$transaction(async (transaction) => {
    const result = await transaction.book.updateMany({
      where: {
        id: bookId,
        collection: { is: { userId } },
      },
      data: {
        bookData: normalized.value.bookData,
        title: normalized.value.title,
        dimension: normalized.value.dimension,
      },
    });
    if (result.count === 0) return false;

    await transaction.book.update({
      where: { id: bookId },
      data: {
        files: {
          set: normalized.value.fileIds.map((id) => ({ id })),
        },
      },
    });
    return true;
  });
  if (!updated) {
    return {
      status: "error",
      message: { title: "Book not found." },
    };
  }

  revalidatePath(`/editor/${bookId}`);
  revalidatePath(`/dashboard/book/${bookId}`);
  revalidatePath(`/dashboard/collections/${book.collectionId}`);
  return {
    status: "ok",
    data: { id: bookId },
  };
}
