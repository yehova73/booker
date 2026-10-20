import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AiStudioClient } from "./ai-studio-client";

export default async function AiStudioPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/?action=login");
  }

  const plans = await prisma.aiBookPlan.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      niche: true,
      pageCount: true,
      status: true,
      updatedAt: true,
    },
  });

  return (
    <AiStudioClient
      plans={plans.map((plan) => ({
        ...plan,
        updatedAt: plan.updatedAt.toISOString(),
      }))}
    />
  );
}
