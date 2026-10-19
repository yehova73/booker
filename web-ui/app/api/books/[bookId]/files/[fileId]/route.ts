import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSupportedImageType } from "@/utils/file-types";
import { getObject } from "@/utils/s3";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookId: string; fileId: string }> },
) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { bookId, fileId } = await params;
  const book = await prisma.book.findFirst({
    where: {
      id: bookId,
      collection: { is: { userId } },
    },
    select: { id: true },
  });
  if (!book) {
    return new Response("Not found", { status: 404 });
  }

  const file = await prisma.file.findFirst({
    where: { id: fileId, userId },
    select: { storageKey: true, contentType: true },
  });
  if (!file) {
    return new Response("Not found", { status: 404 });
  }
  if (!isSupportedImageType(file.contentType)) {
    return new Response("Unsupported media type", { status: 415 });
  }

  const object = await getObject(file.storageKey);
  if (!object.Body) {
    return new Response("File content not found", { status: 404 });
  }

  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "Content-Type": file.contentType,
    "X-Content-Type-Options": "nosniff",
  });
  if (object.ContentLength !== undefined) {
    headers.set("Content-Length", String(object.ContentLength));
  }

  return new Response(object.Body.transformToWebStream(), { headers });
}
