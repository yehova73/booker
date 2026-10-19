"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import type { ServerActionResponse } from "@/hooks/use-server-action";
import { authOptions } from "@/lib/auth";
import { isBookDimension } from "@/lib/book-dimensions";
import { prisma } from "@/lib/prisma";
import { getPresignedUploadUrl } from "@/utils/s3";

const maxKdpPdfSize = 650_000_000;
const kdpPdfContentType = "application/pdf";

type KdpPdfUploadResult = {
  fileId: string;
  uploadUrl: string;
};

type KdpExportResult = {
  exportId: string;
};

async function getAuthenticatedUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("You must be signed in to export this book.");
  }
  return session.user.id;
}

export async function createKdpPdfUploadAction(
  bookId: unknown,
  size: unknown,
): Promise<ServerActionResponse<KdpPdfUploadResult>> {
  const userId = await getAuthenticatedUserId();
  if (
    typeof bookId !== "string" ||
    !bookId.trim() ||
    typeof size !== "number" ||
    !Number.isInteger(size) ||
    size < 1 ||
    size > maxKdpPdfSize
  ) {
    return {
      status: "error",
      message: {
        title: "The KDP PDF could not be prepared.",
        description: "The PDF must be between 1 byte and 650 MiB.",
      },
    };
  }

  const book = await prisma.book.findFirst({
    where: {
      id: bookId,
      collection: { is: { userId } },
    },
    select: { id: true, title: true },
  });
  if (!book) {
    return {
      status: "error",
      message: { title: "Book not found." },
    };
  }

  const fileId = randomUUID();
  const storageKey = `${userId}/${book.id}/${fileId}`;
  const safeTitle = book.title.replace(/[\\/:*?"<>|]/g, "-").trim();
  const file = await prisma.file.create({
    data: {
      id: fileId,
      userId,
      storageKey,
      originalName: `${safeTitle || "book"}-kdp.pdf`,
      contentType: kdpPdfContentType,
      size,
    },
    select: { id: true },
  });

  try {
    const uploadUrl = await getPresignedUploadUrl(
      storageKey,
      kdpPdfContentType,
      size,
    );
    return {
      status: "ok",
      data: { fileId: file.id, uploadUrl },
    };
  } catch (error) {
    await prisma.file.delete({ where: { id: file.id } });
    throw error;
  }
}

export async function saveBookKdpExportAction(
  bookId: unknown,
  fileId: unknown,
  trimPreset: unknown,
  bleedEnabled: unknown,
): Promise<ServerActionResponse<KdpExportResult>> {
  const userId = await getAuthenticatedUserId();
  if (
    typeof bookId !== "string" ||
    !bookId.trim() ||
    typeof fileId !== "string" ||
    !fileId.trim() ||
    !isBookDimension(trimPreset) ||
    typeof bleedEnabled !== "boolean"
  ) {
    return {
      status: "error",
      message: { title: "The KDP PDF could not be saved to this book." },
    };
  }

  const [book, file] = await Promise.all([
    prisma.book.findFirst({
      where: {
        id: bookId,
        collection: { is: { userId } },
      },
      select: { id: true, collectionId: true },
    }),
    prisma.file.findFirst({
      where: {
        id: fileId,
        userId,
        storageKey: { startsWith: `${userId}/${bookId}/` },
        contentType: kdpPdfContentType,
        size: { gt: 0, lte: maxKdpPdfSize },
      },
      select: { id: true },
    }),
  ]);
  if (!book || !file) {
    return {
      status: "error",
      message: { title: "The KDP PDF could not be saved to this book." },
    };
  }

  const exported = await prisma.bookKdpExport.create({
    data: {
      bookId: book.id,
      fileId: file.id,
      trimPreset,
      bleedEnabled,
    },
    select: { id: true },
  });

  revalidatePath(`/editor/${book.id}`);
  revalidatePath(`/dashboard/book/${book.id}`);
  revalidatePath(`/dashboard/collections/${book.collectionId}`);
  return {
    status: "ok",
    data: { exportId: exported.id },
  };
}
