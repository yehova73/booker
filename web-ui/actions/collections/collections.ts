"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ServerActionResponse } from "@/hooks/use-server-action";

type CollectionInput = {
  title: string;
  color: string;
  description: string;
};

type CollectionResult = {
  id: string;
};

function parseCollectionInput(
  input: unknown,
): { value: CollectionInput } | { error: string } {
  if (
    typeof input !== "object" ||
    input === null ||
    !("title" in input) ||
    !("color" in input) ||
    !("description" in input)
  ) {
    return { error: "Enter a title, color, and description." };
  }

  const { title, color, description } = input;
  if (typeof title !== "string" || !title.trim()) {
    return { error: "A collection title is required." };
  }
  if (title.trim().length > 100) {
    return { error: "Collection titles must be 100 characters or fewer." };
  }
  if (typeof color !== "string" || !/^#[\da-f]{6}$/i.test(color)) {
    return { error: "Choose a valid collection color." };
  }
  if (typeof description !== "string" || description.length > 500) {
    return {
      error: "Descriptions must be 500 characters or fewer.",
    };
  }

  return {
    value: {
      title: title.trim(),
      color: color.toLowerCase(),
      description: description.trim(),
    },
  };
}

async function getAuthenticatedUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("You must be signed in to manage collections.");
  }
  return session.user.id;
}

export async function createCollectionAction(
  input: unknown,
): Promise<ServerActionResponse<CollectionResult>> {
  const userId = await getAuthenticatedUserId();
  const parsed = parseCollectionInput(input);
  if ("error" in parsed) {
    return {
      status: "error",
      message: { title: parsed.error },
    };
  }

  const collection = await prisma.collection.create({
    data: {
      ...parsed.value,
      userId,
    },
    select: { id: true },
  });

  revalidatePath("/dashboard/collections");
  return {
    status: "ok",
    data: collection,
    requireRefresh: true,
    message: { title: "Collection created." },
  };
}

export async function updateCollectionAction(
  id: unknown,
  input: unknown,
): Promise<ServerActionResponse<CollectionResult>> {
  const userId = await getAuthenticatedUserId();
  if (typeof id !== "string" || !id.trim()) {
    return {
      status: "error",
      message: { title: "Collection not found." },
    };
  }

  const parsed = parseCollectionInput(input);
  if ("error" in parsed) {
    return {
      status: "error",
      message: { title: parsed.error },
    };
  }

  const result = await prisma.collection.updateMany({
    where: {
      id,
      userId,
    },
    data: parsed.value,
  });

  if (result.count === 0) {
    return {
      status: "error",
      message: { title: "Collection not found." },
    };
  }

  revalidatePath("/dashboard/collections");
  return {
    status: "ok",
    data: { id },
    requireRefresh: true,
    message: { title: "Collection updated." },
  };
}

export async function deleteCollectionAction(
  id: unknown,
): Promise<ServerActionResponse<CollectionResult>> {
  const userId = await getAuthenticatedUserId();
  if (typeof id !== "string" || !id.trim()) {
    return {
      status: "error",
      message: { title: "Collection not found." },
    };
  }

  const result = await prisma.collection.deleteMany({
    where: {
      id,
      userId,
    },
  });

  if (result.count === 0) {
    return {
      status: "error",
      message: { title: "Collection not found." },
    };
  }

  revalidatePath("/dashboard/collections");
  return {
    status: "ok",
    data: { id },
    requireRefresh: true,
    message: { title: "Collection deleted." },
  };
}
