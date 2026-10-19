"use server";

import OpenAI from "openai";
import { randomUUID } from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteObject, getPresignedUrl, uploadObject } from "@/utils/s3";

type ColoringSize = "portrait" | "square" | "landscape";
type ColoringPagePrompt = {
  name: string;
  "image-prompt": string;
};

const maxPromptLength = 2_000;
const maxImagePromptLength = 4_000;
const maxPageCount = 10;

let openAIClient: OpenAI | undefined;

async function getAuthenticatedUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("You must be signed in to generate coloring pages.");
  }
  return session.user.id;
}

export async function createColoringPagePrompts({
  prompt,
  size,
  pageCount,
}: {
  prompt: string;
  size: ColoringSize;
  pageCount: number;
}): Promise<ColoringPagePrompt[]> {
  await getAuthenticatedUserId();
  validateColoringRequest(prompt, size, pageCount);
  const response = await getOpenAIClient().responses.create({
    model: "gpt-4o-mini",
    instructions: [
      "Expand the user's coloring-book idea into one distinct, standalone illustration prompt for every requested page.",
      "Keep all pages visually cohesive while varying the subjects, poses, settings, and composition.",
      "Each image prompt must describe a printable coloring-book page: black outlines on a clean white background, clear enclosed regions, simple readable shapes, no color, grayscale, shading, gradients, borders, text, lettering, or page numbers.",
      "Do not create collages, panels, or multiple scenes in one image. Compose a single centered illustration that fits the requested orientation.",
      "Return exactly the requested number of pages. Use concise human-readable names and detailed, self-contained image prompts.",
    ].join(" "),
    input: `Coloring book idea: ${prompt.trim()}\nPage orientation: ${size}\nNumber of pages: ${pageCount}`,
    text: {
      format: {
        type: "json_schema",
        name: "coloring_page_prompts",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            pages: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  name: { type: "string" },
                  "image-prompt": { type: "string" },
                },
                required: ["name", "image-prompt"],
              },
            },
          },
          required: ["pages"],
        },
      },
    },
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.output_text);
  } catch {
    throw new Error("The image plan response was not valid JSON.");
  }

  if (!isPromptPlan(parsed) || parsed.pages.length !== pageCount) {
    throw new Error("The image plan did not include the requested pages.");
  }

  return parsed.pages.map((page) => ({
    name: page.name.trim().slice(0, 120),
    "image-prompt": page["image-prompt"].trim().slice(0, maxImagePromptLength),
  }));
}

export async function generateColoringPageImage({
  bookId,
  prompt,
  size,
}: {
  bookId: string;
  prompt: string;
  size: ColoringSize;
}): Promise<{ fileId: string; src: string }> {
  if (
    typeof bookId !== "string" ||
    !bookId.trim() ||
    typeof prompt !== "string" ||
    prompt.trim().length === 0 ||
    prompt.length > maxImagePromptLength ||
    !isColoringSize(size)
  ) {
    throw new Error("The image prompt or page size is invalid.");
  }
  const userId = await getAuthenticatedUserId();
  const book = await prisma.book.findFirst({
    where: {
      id: bookId,
      collection: { is: { userId } },
    },
    select: { id: true },
  });
  if (!book) {
    throw new Error("Book not found.");
  }

  const imageSize =
    size === "landscape"
      ? "1536x1024"
      : size === "square"
        ? "1024x1024"
        : "1024x1536";
  const client = getOpenAIClient();

  // Reference-image editing with client.images.edit is intentionally disabled.
  // const response = await client.images.edit({ model: imageModel, image: referenceImages, prompt, size: imageSize });
  const response = await client.images.generate({
    model: "gpt-image-1-mini",
    prompt: prompt.trim(),
    size: imageSize,
    quality: "medium",
    output_format: "webp",
  });
  const imageBase64 = response.data?.[0]?.b64_json;
  if (!imageBase64) {
    throw new Error("OpenAI returned no image data.");
  }

  const image = Buffer.from(imageBase64, "base64");
  const fileId = randomUUID();
  const storageKey = `${userId}/${book.id}/${fileId}`;
  const file = await prisma.file.create({
    data: {
      id: fileId,
      userId,
      storageKey,
      originalName: "coloring-page.webp",
      contentType: "image/webp",
      size: image.byteLength,
    },
    select: { id: true },
  });

  try {
    await uploadObject(storageKey, image, "image/webp");
    return {
      fileId: file.id,
      src: await getPresignedUrl(storageKey),
    };
  } catch (uploadError) {
    try {
      await deleteObject(storageKey);
      await prisma.file.delete({ where: { id: file.id } });
    } catch (cleanupError) {
      throw new AggregateError(
        [uploadError, cleanupError],
        "The generated image could not be saved or cleaned up.",
      );
    }
    throw uploadError;
  }
}

function getOpenAIClient() {
  if (process.env.NODE_ENV !== "development") {
    throw new Error(
      "OpenAI coloring page generation is available only in local development until authentication is added.",
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Set OPENAI_API_KEY in .env.local to generate images.");
  }

  openAIClient ??= new OpenAI({ apiKey });
  return openAIClient;
}

function validateColoringRequest(
  prompt: string,
  size: ColoringSize,
  pageCount: number,
) {
  if (
    typeof prompt !== "string" ||
    prompt.trim().length === 0 ||
    prompt.length > maxPromptLength
  ) {
    throw new Error(
      `Enter a prompt between 1 and ${maxPromptLength} characters.`,
    );
  }
  if (!isColoringSize(size)) {
    throw new Error("Choose a valid coloring page size.");
  }
  if (
    !Number.isInteger(pageCount) ||
    pageCount < 1 ||
    pageCount > maxPageCount
  ) {
    throw new Error(`Choose between 1 and ${maxPageCount} pages.`);
  }
}

function isColoringSize(value: unknown): value is ColoringSize {
  return value === "portrait" || value === "square" || value === "landscape";
}

function isPromptPlan(
  value: unknown,
): value is { pages: ColoringPagePrompt[] } {
  if (
    typeof value !== "object" ||
    value === null ||
    !("pages" in value) ||
    !Array.isArray(value.pages)
  ) {
    return false;
  }

  return value.pages.every(
    (page) =>
      typeof page === "object" &&
      page !== null &&
      "name" in page &&
      typeof page.name === "string" &&
      page.name.trim().length > 0 &&
      "image-prompt" in page &&
      typeof page["image-prompt"] === "string" &&
      page["image-prompt"].trim().length > 0 &&
      page["image-prompt"].length <= maxImagePromptLength,
  );
}
