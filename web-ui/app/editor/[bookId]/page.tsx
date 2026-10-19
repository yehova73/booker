import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
    },
  });
  if (!book) {
    notFound();
  }

  return (
    <EditorWorkspacePage
      bookId={book.id}
      bookTitle={book.title}
      initialBookData={book.bookData}
      initialTrimPreset={book.dimension}
    />
  );
}
