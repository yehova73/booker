"use client";

import { useState, type FormEvent } from "react";

import { generateColoredImage } from "@/actions/books/coloring-page-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type ImageSize = "portrait" | "square" | "landscape";

const sizeOptions: {
  value: ImageSize;
  label: string;
  ratio: string;
}[] = [
  { value: "portrait", label: "Portrait · cover", ratio: "2 / 3" },
  { value: "square", label: "Square", ratio: "1 / 1" },
  { value: "landscape", label: "Landscape", ratio: "3 / 2" },
];

export function AiImageDialog({
  bookId,
  open,
  onOpenChange,
  onInsertImage,
  onGeneratingChange,
  isGenerating,
}: {
  bookId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsertImage: (fileId: string, src: string, alt: string) => void;
  onGeneratingChange: (isGenerating: boolean) => void;
  isGenerating: boolean;
}) {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<ImageSize>("portrait");
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    if (isGenerating && !nextOpen) return;
    if (!nextOpen) {
      setPrompt("");
      setSize("portrait");
      setError(null);
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setError("Describe the image you want to create.");
      return;
    }

    setError(null);
    onGeneratingChange(true);
    try {
      const image = await generateColoredImage({
        bookId,
        prompt: trimmedPrompt,
        size,
      });
      onInsertImage(image.fileId, image.src, trimmedPrompt);
      setPrompt("");
      setSize("portrait");
      onOpenChange(false);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "The image could not be generated.",
      );
    } finally {
      onGeneratingChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-[#edf0ec] px-6 py-5">
          <DialogTitle className="text-[#34463a]">
            Generate an image
          </DialogTitle>
          <DialogDescription>
            Describe a full-color book cover or illustration and choose its
            shape.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5 px-6 py-5" onSubmit={handleSubmit}>
          <label className="block space-y-1.5 text-xs font-medium text-[#68736b]">
            Image prompt
            <Textarea
              autoFocus
              className="min-h-28 resize-y text-sm"
              maxLength={2_000}
              onChange={(event) => setPrompt(event.currentTarget.value)}
              placeholder="A vibrant fantasy book cover showing a tiny lighthouse on a cliff beneath a star-filled sky..."
              value={prompt}
            />
          </label>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-[#68736b]">
              Image size
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {sizeOptions.map((option) => (
                <button
                  aria-pressed={size === option.value}
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                    size === option.value
                      ? "border-[#9eb49e] bg-[#f2f7f1] text-[#315d44]"
                      : "border-[#e4e9e3] text-[#68736b] hover:bg-[#f8faf7]"
                  }`}
                  key={option.value}
                  onClick={() => setSize(option.value)}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className="mb-1.5 block h-5 w-4 rounded-sm border border-current opacity-70"
                    style={{ aspectRatio: option.ratio }}
                  />
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          {error && (
            <p aria-live="polite" className="text-xs text-red-600">
              {error}
            </p>
          )}

          <DialogFooter className="border-t-0 bg-transparent p-0">
            <Button
              disabled={!prompt.trim() || isGenerating}
              type="submit"
            >
              {isGenerating ? "Generating..." : "Generate image"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
