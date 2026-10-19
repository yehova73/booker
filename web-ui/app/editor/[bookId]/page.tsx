import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPresignedUrl } from "@/utils/s3";
import { EditorWorkspacePage } from "./editor-workspace";

export const instant = false;

export default async function EditorBookPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/?action=login");
  }

  const { bookId } = await params;
  const book = await prisma.book.findFirst({
    where: {
      id: bookId,
      collection: { is: { userId: session.user.id } },
    },
    select: {
      id: true,
      title: true,
      dimension: true,
      bookData: true,
      files: {
        select: {
          id: true,
          storageKey: true,
        },
      },
    },
  });
  if (!book) {
    notFound();
  }

  const signedFiles = await Promise.all(
    book.files.map(async (file) => ({
      id: file.id,
      url: await getPresignedUrl(file.storageKey),
    })),
  );

  return (
    <EditorWorkspacePage
      bookId={book.id}
      bookTitle={book.title}
      initialBookData={withSignedImageUrls(book.bookData, signedFiles)}
      initialTrimPreset={book.dimension}
    />
  );
}

function withSignedImageUrls(
  bookData: unknown,
  files: { id: string; url: string }[],
): unknown {
  if (!isRecord(bookData) || !Array.isArray(bookData.pages)) return bookData;

  const urlsById = new Map(files.map((file) => [file.id, file.url]));
  return {
    ...bookData,
    pages: bookData.pages.map((page) => {
      if (!isRecord(page) || !Array.isArray(page.elements)) return page;
      return {
        ...page,
        elements: page.elements.map((element) => {
          if (!isRecord(element) || element.kind !== "image") return element;
          if (typeof element.fileId !== "string") {
            throw new Error("A saved image is missing its file reference.");
          }
          const url = urlsById.get(element.fileId);
          if (!url) {
            throw new Error("A saved image file is not attached to this book.");
          }
          return { ...element, src: url };
        }),
      };
    }),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
