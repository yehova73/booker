import type {
  AiBookPageSize,
  AiBookPuzzleType,
} from "@/generated/prisma/client";

export type NewBookMetadata = {
  title: string;
  niche: string;
  pageCount: number | "";
  pageSize: AiBookPageSize;
  initialPrompt: string;
};

export type NewBookContentSelection = {
  selectedPuzzles: AiBookPuzzleType[];
  storyPuzzle: boolean;
};
