"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import type { ServerActionResponse } from "@/hooks/use-server-action";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SaveBookCoverResult = {
  coverPageId: string;
  fileId: string;
};

export async function saveBookCoverAction(
  bookId: unknown,
  pageId: unknown,
  fileId: unknown,
): Promise<ServerActionResponse<SaveBookCoverResult>> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("You must be signed in to update a book cover.");
  }
  if (
    typeof bookId !== "string" ||
    !bookId.trim() ||
    typeof pageId !== "string" ||
    !pageId.trim() ||
    typeof fileId !== "string" ||
    !fileId.trim()
  ) {
    return {
      status: "error",
      message: { title: "The cover could not be updated." },
    };
  }

  const [book, file] = await Promise.all([
    prisma.book.findFirst({
      where: {
        id: bookId,
        collection: { is: { userId } },
      },
      select: { collectionId: true },
    }),
    prisma.file.findFirst({
      where: { id: fileId, userId },
      select: { id: true },
    }),
  ]);
  if (!book || !file) {
    return {
      status: "error",
      message: { title: "The cover could not be updated." },
    };
  }

  const result = await prisma.book.updateMany({
    where: {
      id: bookId,
      collection: { is: { userId } },
    },
    data: {
      coverId: file.id,
      coverPageId: pageId,
    },
  });
  if (result.count === 0) {
    return {
      status: "error",
      message: { title: "The cover could not be updated." },
    };
  }

  revalidatePath(`/dashboard/book/${bookId}`);
  revalidatePath(`/editor/${bookId}`);
  revalidatePath(`/dashboard/collections/${book.collectionId}`);
  return {
    status: "ok",
    data: { coverPageId: pageId, fileId: file.id },
  };
}
