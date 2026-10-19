import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CollectionBooksClient } from "./collection-books-client";

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/?action=login");
  }

  const { id } = await params;
  const collection = await prisma.collection.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    select: {
      id: true,
      title: true,
      description: true,
      color: true,
      books: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          dimension: true,
        },
      },
    },
  });

  if (!collection) {
    notFound();
  }

  return (
    <CollectionBooksClient
      collection={{
        id: collection.id,
        title: collection.title,
        description: collection.description,
        color: collection.color,
      }}
      books={collection.books}
    />
  );
}
