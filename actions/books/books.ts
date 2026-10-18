"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isBookDimension,
  type BookDimension,
} from "@/lib/book-dimensions";
import type { ServerActionResponse } from "@/hooks/use-server-action";

type BookInput = {
  title: string;
  description: string;
  dimension: BookDimension;
};

type BookResult = {
  id: string;
};

function parseBookInput(
  input: unknown,
): { value: BookInput } | { error: string } {
  if (
    typeof input !== "object" ||
    input === null ||
    !("title" in input) ||
    !("description" in input) ||
    !("dimension" in input)
  ) {
    return { error: "Enter a title, description, and book dimension." };
  }

  const { title, description, dimension } = input;
  if (typeof title !== "string" || !title.trim()) {
    return { error: "A book title is required." };
  }
  if (title.trim().length > 100) {
    return { error: "Book titles must be 100 characters or fewer." };
  }
  if (typeof description !== "string" || description.length > 1000) {
    return { error: "Descriptions must be 1,000 characters or fewer." };
  }
  if (!isBookDimension(dimension)) {
    return { error: "Choose a valid book dimension." };
  }

  return {
    value: {
      title: title.trim(),
      description: description.trim(),
      dimension,
    },
  };
}

async function getAuthenticatedUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("You must be signed in to manage books.");
  }
  return session.user.id;
}

function getCollectionPath(collectionId: string) {
  return `/dashboard/collections/${collectionId}`;
}

export async function createBookAction(
  collectionId: unknown,
  input: unknown,
): Promise<ServerActionResponse<BookResult>> {
  const userId = await getAuthenticatedUserId();
  if (typeof collectionId !== "string" || !collectionId.trim()) {
    return {
      status: "error",
      message: { title: "Collection not found." },
    };
  }

  const parsed = parseBookInput(input);
  if ("error" in parsed) {
    return {
      status: "error",
      message: { title: parsed.error },
    };
  }

  const collection = await prisma.collection.findFirst({
    where: {
      id: collectionId,
      userId,
    },
    select: { id: true },
  });
  if (!collection) {
    return {
      status: "error",
      message: { title: "Collection not found." },
    };
  }

  const book = await prisma.book.create({
    data: {
      ...parsed.value,
      collectionId: collection.id,
    },
    select: { id: true },
  });

  revalidatePath(getCollectionPath(collectionId));
  return {
    status: "ok",
    data: book,
    requireRefresh: true,
    message: { title: "Book created." },
  };
}

export async function updateBookAction(
  collectionId: unknown,
  bookId: unknown,
  input: unknown,
): Promise<ServerActionResponse<BookResult>> {
  const userId = await getAuthenticatedUserId();
  if (
    typeof collectionId !== "string" ||
    !collectionId.trim() ||
    typeof bookId !== "string" ||
    !bookId.trim()
  ) {
    return {
      status: "error",
      message: { title: "Book not found." },
    };
  }

  const parsed = parseBookInput(input);
  if ("error" in parsed) {
    return {
      status: "error",
      message: { title: parsed.error },
    };
  }

  const result = await prisma.book.updateMany({
    where: {
      id: bookId,
      collectionId,
      collection: { is: { userId } },
    },
    data: parsed.value,
  });
  if (result.count === 0) {
    return {
      status: "error",
      message: { title: "Book not found." },
    };
  }

  revalidatePath(getCollectionPath(collectionId));
  return {
    status: "ok",
    data: { id: bookId },
    requireRefresh: true,
    message: { title: "Book updated." },
  };
}

export async function deleteBookAction(
  collectionId: unknown,
  bookId: unknown,
): Promise<ServerActionResponse<BookResult>> {
  const userId = await getAuthenticatedUserId();
  if (
    typeof collectionId !== "string" ||
    !collectionId.trim() ||
    typeof bookId !== "string" ||
    !bookId.trim()
  ) {
    return {
      status: "error",
      message: { title: "Book not found." },
    };
  }

  const result = await prisma.book.deleteMany({
    where: {
      id: bookId,
      collectionId,
      collection: { is: { userId } },
    },
  });
  if (result.count === 0) {
    return {
      status: "error",
      message: { title: "Book not found." },
    };
  }

  revalidatePath(getCollectionPath(collectionId));
  return {
    status: "ok",
    data: { id: bookId },
    requireRefresh: true,
    message: { title: "Book deleted." },
  };
}
