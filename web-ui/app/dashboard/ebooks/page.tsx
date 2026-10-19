import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPresignedUrl } from "@/utils/s3";
import { EbooksClient } from "./ebooks-client";

export default async function EbooksPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/?action=login");
  }

  const [books, collections] = await Promise.all([
    prisma.book.findMany({
      where: {
        collection: { is: { userId: session.user.id } },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        dimension: true,
        cover: {
          select: { storageKey: true },
        },
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

  const booksWithCovers = await Promise.all(
    books.map(async (book) => ({
      id: book.id,
      title: book.title,
      description: book.description,
      dimension: book.dimension,
      coverUrl: book.cover
        ? await getPresignedUrl(book.cover.storageKey)
        : null,
      collection: book.collection,
    })),
  );

  return (
    <EbooksClient
      books={booksWithCovers}
      collections={collections}
    />
  );
}
