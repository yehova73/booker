"use server";

import OpenAI, { toFile } from "openai";
import { randomUUID } from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  deleteObject,
  getObject,
  getPresignedUrl,
  uploadObject,
} from "@/utils/s3";

type ColoringSize = "portrait" | "square" | "landscape";
type ColoringPageIdea = {
  name: string;
  "image-idea": string;
};

const maxPromptLength = 2_000;
const maxImageIdeaLength = 4_000;
const maxPageCount = 10;
const maxReferenceImageCount = 16;
const maxReferenceImageSize = 20 * 1024 * 1024;
const referenceImageContentTypes = ["image/jpeg", "image/png", "image/webp"];

const imageIdeaSystemPrompt = [
  "Expand the user's coloring-book theme into one distinct, standalone visual idea for every requested page.",
  "Keep the ideas visually cohesive while varying subjects, poses, settings, and composition.",
  "Describe only the subject and scene; do not include instructions about coloring-book line art or image rendering.",
  "Do not create collages, panels, or multiple scenes in one idea.",
  "Return exactly the requested number of pages, with concise human-readable names and detailed, self-contained visual ideas.",
].join(" ");

const coloringImageSystemPrompt = [
  "Create a printable coloring-book page with black outlines on a clean white background and clear enclosed regions with simple readable shapes.",
  "Use the provided reference images as visual guidance for relevant subjects, character appearance, poses, and scene details while following the image idea.",
  "Use no color, grayscale, shading, gradients, borders, text, lettering, or page numbers.",
  "Show a single centered illustration, with no collage, panels, or multiple scenes, composed to fit the requested orientation.",
].join(" ");

const fullColorImageSystemPrompt = [
  "Create a polished, full-color image based on the user's description.",
  "Follow the requested subject, visual style, mood, and composition.",
  "Make it suitable for a book cover or an in-book illustration, and do not add lettering unless the user requests it.",
].join(" ");

let openAIClient: OpenAI | undefined;

async function getAuthenticatedUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("You must be signed in to generate images.");
  }
  return session.user.id;
}

export async function generateImageIdeas({
  prompt,
  size,
  pageCount,
}: {
  prompt: string;
  size: ColoringSize;
  pageCount: number;
}): Promise<ColoringPageIdea[]> {
  await getAuthenticatedUserId();
  validateColoringRequest(prompt, size, pageCount);
  const response = await getOpenAIClient().responses.create({
    model: "gpt-4o-mini",
    instructions: imageIdeaSystemPrompt,
    input: [
      `Coloring book theme from the user:\n${prompt.trim()}`,
      `Page orientation: ${size}`,
      `Number of pages: ${pageCount}`,
    ].join("\n\n"),
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
                  "image-idea": { type: "string" },
                },
                required: ["name", "image-idea"],
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

  if (!isIdeaPlan(parsed) || parsed.pages.length !== pageCount) {
    throw new Error("The image plan did not include the requested pages.");
  }

  return parsed.pages.map((page) => ({
    name: page.name.trim().slice(0, 120),
    "image-idea": page["image-idea"].trim().slice(0, maxImageIdeaLength),
  }));
}

export async function generateImageFromPrompt({
  bookId,
  imageIdea,
  referenceFileIds = [],
  size,
}: {
  bookId: string;
  imageIdea: string;
  referenceFileIds?: string[];
  size: ColoringSize;
}): Promise<{ fileId: string; src: string }> {
  if (
    typeof bookId !== "string" ||
    !bookId.trim() ||
    typeof imageIdea !== "string" ||
    imageIdea.trim().length === 0 ||
    imageIdea.length > maxImageIdeaLength ||
    !Array.isArray(referenceFileIds) ||
    referenceFileIds.length > maxReferenceImageCount ||
    !referenceFileIds.every(
      (fileId) => typeof fileId === "string" && Boolean(fileId.trim()),
    ) ||
    !isColoringSize(size)
  ) {
    throw new Error("The image prompt or page size is invalid.");
  }
  if (new Set(referenceFileIds).size !== referenceFileIds.length) {
    throw new Error("A reference image was provided more than once.");
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
  const referenceImages = await getReferenceImages(
    referenceFileIds,
    userId,
    book.id,
  );
  const imageRequest = {
    model: "gpt-image-1-mini",
    prompt: [
      `Coloring page instructions:\n${coloringImageSystemPrompt}`,
      `Image idea:\n${imageIdea.trim()}`,
    ].join("\n\n"),
    size: imageSize,
    quality: "low",
    output_format: "webp",
  } as const;
  const response =
    referenceImages.length > 0
      ? await client.images.edit({
          ...imageRequest,
          image: referenceImages,
          input_fidelity: "low",
        })
      : await client.images.generate(imageRequest);
  const imageBase64 = response.data?.[0]?.b64_json;
  if (!imageBase64) {
    throw new Error("OpenAI returned no image data.");
  }

  return saveGeneratedImage(
    userId,
    book.id,
    Buffer.from(imageBase64, "base64"),
    "coloring-page.webp",
  );
}

async function getReferenceImages(
  referenceFileIds: string[],
  userId: string,
  bookId: string,
) {
  if (referenceFileIds.length === 0) return [];

  const files = await prisma.file.findMany({
    where: {
      id: { in: referenceFileIds },
      userId,
      storageKey: { startsWith: `${userId}/${bookId}/` },
    },
    select: {
      storageKey: true,
      originalName: true,
      contentType: true,
      size: true,
    },
  });
  if (files.length !== referenceFileIds.length) {
    throw new Error("One or more reference images are not available.");
  }
  if (
    files.some(
      (file) =>
        !referenceImageContentTypes.includes(file.contentType) ||
        file.size < 1 ||
        file.size > maxReferenceImageSize,
    )
  ) {
    throw new Error(
      "Reference images must be JPEG, PNG, or WebP files no larger than 20 MiB.",
    );
  }

  return Promise.all(
    files.map(async (file) => {
      const response = await getObject(file.storageKey);
      if (!response.Body) {
        throw new Error(
          `Reference image "${file.originalName}" has no file data.`,
        );
      }
      const bytes = await response.Body.transformToByteArray();
      return toFile(bytes, file.originalName, { type: file.contentType });
    }),
  );
}

export async function generateColoredImage({
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
    prompt.length > maxPromptLength ||
    !isColoringSize(size)
  ) {
    throw new Error("Enter a valid image prompt and choose a page size.");
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
  const response = await getOpenAIClient().images.generate({
    model: "gpt-image-1-mini",
    prompt: [
      `Image generation instructions:\n${fullColorImageSystemPrompt}`,
      `User's image idea:\n${prompt.trim()}`,
    ].join("\n\n"),
    size: imageSize,
    quality: "medium",
    output_format: "webp",
  });
  const imageBase64 = response.data?.[0]?.b64_json;
  if (!imageBase64) {
    throw new Error("OpenAI returned no image data.");
  }

  return saveGeneratedImage(
    userId,
    book.id,
    Buffer.from(imageBase64, "base64"),
    "ai-generated-image.webp",
  );
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Set OPENAI_API_KEY to generate images.");
  }

  openAIClient ??= new OpenAI({ apiKey });
  return openAIClient;
}

async function saveGeneratedImage(
  userId: string,
  bookId: string,
  image: Buffer,
  originalName: string,
): Promise<{ fileId: string; src: string }> {
  const fileId = randomUUID();
  const storageKey = `${userId}/${bookId}/${fileId}`;
  const file = await prisma.file.create({
    data: {
      id: fileId,
      userId,
      storageKey,
      originalName,
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

function isIdeaPlan(value: unknown): value is { pages: ColoringPageIdea[] } {
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
      "image-idea" in page &&
      typeof page["image-idea"] === "string" &&
      page["image-idea"].trim().length > 0 &&
      page["image-idea"].length <= maxImageIdeaLength,
  );
}
