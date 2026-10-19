import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPresignedUrl } from "@/utils/s3";
import { CollectionsClient } from "./collections-client";

export default async function CollectionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/?action=login");
  }

  const collections = await prisma.collection.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      color: true,
      description: true,
      books: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          title: true,
          cover: {
            select: { storageKey: true },
          },
        },
      },
    },
  });

  const collectionsWithBookCovers = await Promise.all(
    collections.map(async (collection) => ({
      id: collection.id,
      title: collection.title,
      color: collection.color,
      description: collection.description,
      books: await Promise.all(
        collection.books.map(async (book) => ({
          id: book.id,
          title: book.title,
          coverUrl: book.cover
            ? await getPresignedUrl(book.cover.storageKey)
            : null,
        })),
      ),
    })),
  );

  return <CollectionsClient collections={collectionsWithBookCovers} />;
}
