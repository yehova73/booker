import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookDetailsClient } from "./book-details-client";

export const instant = false;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getPageCount(bookData: unknown) {
  if (!isRecord(bookData) || !Array.isArray(bookData.pages)) return 1;
  return bookData.pages.length;
}

export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/?action=login");
  }

  const { id } = await params;
  const [book, collections] = await Promise.all([
    prisma.book.findFirst({
      where: {
        id,
        collection: { is: { userId: session.user.id } },
      },
      select: {
        id: true,
        title: true,
        description: true,
        dimension: true,
        createdAt: true,
        updatedAt: true,
        bookData: true,
        collection: {
          select: {
            id: true,
            title: true,
            color: true,
          },
        },
      },
    }),
    prisma.collection.findMany({
      where: { userId: session.user.id },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  if (!book) {
    notFound();
  }

  return (
    <BookDetailsClient
      book={{
        id: book.id,
        title: book.title,
        description: book.description,
        dimension: book.dimension,
        pageCount: getPageCount(book.bookData),
        createdAt: book.createdAt.toISOString(),
        updatedAt: book.updatedAt.toISOString(),
        collection: book.collection,
      }}
      collections={collections}
    />
  );
}
