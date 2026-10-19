import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
    },
  });

  return <CollectionsClient collections={collections} />;
}
