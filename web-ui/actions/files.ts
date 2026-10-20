"use server";

import { randomUUID } from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ServerActionResponse } from "@/hooks/use-server-action";
import {
  deleteObject,
  getPresignedUploadUrl,
  getPresignedUrl,
} from "@/utils/s3";
import {
  isSupportedImageType,
  maxImageUploadSize,
  supportedImageTypes,
} from "@/utils/file-types";

type FileUploadResult = {
  fileId: string;
  uploadUrl: string;
  viewUrl: string;
};

export type UserFileLibraryItem = {
  id: string;
  storageKey: string;
  originalName: string;
  contentType: string;
  size: number;
  createdAt: string;
  src: string;
};

async function getAuthenticatedUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("You must be signed in to upload images.");
  }
  return session.user.id;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function createFileUploadAction(
  input: unknown,
): Promise<ServerActionResponse<FileUploadResult>> {
  const userId = await getAuthenticatedUserId();
  if (
    !isRecord(input) ||
    typeof input.bookId !== "string" ||
    !input.bookId.trim() ||
    typeof input.fileName !== "string" ||
    !input.fileName.trim() ||
    input.fileName.length > 255 ||
    typeof input.contentType !== "string" ||
    !isSupportedImageType(input.contentType) ||
    typeof input.size !== "number" ||
    !Number.isInteger(input.size) ||
    input.size < 1 ||
    input.size > maxImageUploadSize
  ) {
    return {
      status: "error",
      message: {
        title: "Choose a supported image smaller than 20 MiB.",
      },
    };
  }

  const book = await prisma.book.findFirst({
    where: {
      id: input.bookId,
      collection: { is: { userId } },
    },
    select: { id: true },
  });
  if (!book) {
    return {
      status: "error",
      message: { title: "Book not found." },
    };
  }

  const fileId = randomUUID();
  const storageKey = `${userId}/${book.id}/${fileId}`;
  const file = await prisma.file.create({
    data: {
      id: fileId,
      userId,
      storageKey,
      originalName: input.fileName.trim(),
      contentType: input.contentType,
      size: input.size,
    },
    select: { id: true },
  });

  try {
    const [uploadUrl, viewUrl] = await Promise.all([
      getPresignedUploadUrl(storageKey, input.contentType, input.size),
      getPresignedUrl(storageKey),
    ]);
    return {
      status: "ok",
      data: { fileId: file.id, uploadUrl, viewUrl },
    };
  } catch (error) {
    await prisma.file.delete({ where: { id: file.id } });
    throw error;
  }
}

export async function listUserFilesAction(): Promise<
  ServerActionResponse<{ files: UserFileLibraryItem[] }>
> {
  const userId = await getAuthenticatedUserId();
  const files = await prisma.file.findMany({
    where: {
      userId,
      contentType: { in: [...supportedImageTypes] },
      bookCover: false,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      storageKey: true,
      originalName: true,
      contentType: true,
      size: true,
      createdAt: true,
    },
  });

  return {
    status: "ok",
    data: {
      files: await Promise.all(
        files.map(async (file) => ({
          ...file,
          createdAt: file.createdAt.toISOString(),
          src: await getPresignedUrl(file.storageKey),
        })),
      ),
    },
  };
}

export async function deleteFilesAction(
  fileIds: unknown,
): Promise<ServerActionResponse<{ deletedCount: number }>> {
  const userId = await getAuthenticatedUserId();
  if (
    !Array.isArray(fileIds) ||
    fileIds.length > 50 ||
    !fileIds.every(
      (fileId): fileId is string =>
        typeof fileId === "string" && Boolean(fileId.trim()),
    )
  ) {
    return {
      status: "error",
      message: { title: "The requested files could not be deleted." },
    };
  }

  const uniqueIds = [...new Set(fileIds)];
  const files = await prisma.file.findMany({
    where: {
      id: { in: uniqueIds },
      userId,
      books: { none: {} },
      coverForBook: { is: null },
      kdpExport: { is: null },
    },
    select: { id: true, storageKey: true },
  });
  if (files.length !== uniqueIds.length) {
    return {
      status: "error",
      message: {
        title: "One or more files are in use or are not available.",
      },
    };
  }

  await Promise.all(files.map(({ storageKey }) => deleteObject(storageKey)));
  await prisma.file.deleteMany({
    where: {
      id: { in: uniqueIds },
      userId,
      books: { none: {} },
      coverForBook: { is: null },
      kdpExport: { is: null },
    },
  });
  return {
    status: "ok",
    data: { deletedCount: files.length },
  };
}
