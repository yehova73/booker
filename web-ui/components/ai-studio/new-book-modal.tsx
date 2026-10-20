"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { createAiBookPlanAction } from "@/actions/ai-studio/ai-book-plans";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import useServerAction from "@/hooks/use-server-action";
import type { AiBookPageSize } from "@/generated/prisma/client";
import { ContentSelectionStep } from "./content-selection-step";
import { ProjectMetadataStep } from "./project-metadata-step";
import type {
  NewBookContentSelection,
  NewBookMetadata,
} from "./new-book-types";

const initialMetadata: NewBookMetadata = {
  title: "",
  niche: "",
  pageCount: 32,
  pageSize: "letter" satisfies AiBookPageSize,
  initialPrompt: "",
};

const initialContent: NewBookContentSelection = {
  selectedPuzzles: [],
  storyPuzzle: false,
};

export function NewBookModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [metadata, setMetadata] = useState(initialMetadata);
  const [content, setContent] = useState(initialContent);
  const { call: createPlan, loading: isCreating } = useServerAction(
    createAiBookPlanAction,
  );

  async function generateBlueprint() {
    const plan = await createPlan({ ...metadata, ...content });
    if (!plan) return;
    onOpenChange(false);
    router.push(`/dashboard/ai-studio/plan/${plan.id}`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isCreating) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-3xl gap-0 overflow-y-auto p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-5 py-5 pr-12 sm:px-7">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Step {step} of 2
            </span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className={`block h-full rounded-full bg-primary transition-all ${
                  step === 1 ? "w-1/2" : "w-full"
                }`}
              />
            </span>
          </div>
          <DialogTitle>
            {step === 1 ? "Project Metadata & Specs" : "Content & Puzzle Selection"}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Set up the details and print specifications for your AI book."
              : "Choose the puzzle and activity types for your blueprint."}
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-6 sm:px-7">
          {step === 1 ? (
            <ProjectMetadataStep
              value={metadata}
              onChange={(updates) =>
                setMetadata((current) => ({ ...current, ...updates }))
              }
              onNext={() => setStep(2)}
            />
          ) : (
            <ContentSelectionStep
              value={content}
              onChange={(updates) =>
                setContent((current) => ({ ...current, ...updates }))
              }
              onBack={() => setStep(1)}
              onGenerate={generateBlueprint}
              isGenerating={isCreating}
            />
          )}
          {isCreating && (
            <p className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Saving your draft...
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
