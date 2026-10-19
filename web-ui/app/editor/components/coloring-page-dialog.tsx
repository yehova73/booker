"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  Check,
  ImagePlus,
  RefreshCw,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createColoringPagePrompts,
  generateColoringPageImage,
} from "../../../actions/books/coloring-page-actions";
import type { ColoringPageImage } from "./editor-types";

type ColoringMethod = "upload" | "ai";
type ColoringSize = "portrait" | "square" | "landscape";
type UploadedImage = ColoringPageImage & { id: string };
type GeneratedImage = UploadedImage & {
  selected: boolean;
  imagePrompt: string;
};
const maxAiPageCount = 10;

const sizeOptions: { value: ColoringSize; label: string; ratio: string }[] = [
  { value: "portrait", label: "Portrait", ratio: "3 / 4" },
  { value: "square", label: "Square", ratio: "1 / 1" },
  { value: "landscape", label: "Landscape", ratio: "4 / 3" },
];

export function ColoringPageDialog({
  open,
  onOpenChange,
  onAddPages,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddPages: (images: ColoringPageImage[]) => void;
}) {
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState<ColoringMethod | null>(null);
  const [uploads, setUploads] = useState<UploadedImage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<ColoringSize>("portrait");
  const [pageCount, setPageCount] = useState("4");
  const [generated, setGenerated] = useState<GeneratedImage[]>([]);
  const [generationNumber, setGenerationNumber] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [regeneratingImageId, setRegeneratingImageId] = useState<string | null>(
    null,
  );
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedPageCount = Number(pageCount);
  const validPageCount =
    Number.isInteger(parsedPageCount) &&
    parsedPageCount >= 1 &&
    parsedPageCount <= maxAiPageCount;
  const selectedCount = generated.filter((image) => image.selected).length;

  function reset() {
    setStep(1);
    setMethod(null);
    setUploads([]);
    setPrompt("");
    setSize("portrait");
    setPageCount("4");
    setGenerated([]);
    setGenerationNumber(0);
    setIsGenerating(false);
    setRegeneratingImageId(null);
    setIsAdding(false);
    setError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    if ((isGenerating || regeneratingImageId || isAdding) && !nextOpen) return;
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  }

  async function handleUploads(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (files.length === 0) return;

    if (uploads.length + files.length > 50) {
      setError("You can add up to 50 coloring page images.");
      return;
    }
    if (files.some((file) => !file.type.startsWith("image/"))) {
      setError("Choose image files only.");
      return;
    }

    setError(null);
    try {
      const readFiles = await Promise.all(
        files.map(async (file) => ({
          id: crypto.randomUUID(),
          src: await readImageFile(file),
          alt: file.name,
        })),
      );
      setUploads((current) => [...current, ...readFiles]);
    } catch (readError) {
      setError(
        readError instanceof Error
          ? readError.message
          : "One or more images could not be read.",
      );
    }
  }

  async function generatePreviews() {
    if (!validPageCount) return;
    if (!prompt.trim()) {
      setError("Add a prompt to describe the images you want.");
      return;
    }
    setError(null);
    setIsGenerating(true);
    try {
      const pagePrompts = await createColoringPagePrompts({
        prompt: prompt.trim(),
        size,
        pageCount: parsedPageCount,
      });
      const nextGeneration = generationNumber + 1;
      const generatedPages = await Promise.all(
        pagePrompts.map(async (page, index) => {
          const image = await generateColoringPageImage({
            prompt: page["image-prompt"],
            size,
          });
          return {
            id: `${nextGeneration}-${index}`,
            src: image.src,
            alt: page.name,
            selected: true,
            imagePrompt: page["image-prompt"],
          };
        }),
      );
      setGenerated(generatedPages);
      setGenerationNumber(nextGeneration);
      setStep(3);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Preview generation failed.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function regeneratePreview(imageId: string) {
    const image = generated.find((candidate) => candidate.id === imageId);
    if (!image || isGenerating || regeneratingImageId) return;

    setError(null);
    setRegeneratingImageId(imageId);
    try {
      const regenerated = await generateColoringPageImage({
        prompt: image.imagePrompt,
        size,
      });
      setGenerated((current) =>
        current.map((candidate) =>
          candidate.id === imageId
            ? { ...candidate, src: regenerated.src }
            : candidate,
        ),
      );
    } catch (regenerationError) {
      setError(
        regenerationError instanceof Error
          ? regenerationError.message
          : "Image regeneration failed.",
      );
    } finally {
      setRegeneratingImageId(null);
    }
  }

  function addPages(images: ColoringPageImage[]) {
    setError(null);
    setIsAdding(true);
    try {
      onAddPages(images);
      reset();
      onOpenChange(false);
    } catch (addError) {
      setError(
        addError instanceof Error
          ? addError.message
          : "Coloring pages could not be added.",
      );
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-[#edf0ec] px-6 py-5">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#89958b]">
            <span>Coloring pages</span>
            <span aria-hidden="true">/</span>
            <span>
              Step {step} of {method === "ai" ? 3 : 2}
            </span>
          </div>
          <DialogTitle className="text-lg text-[#34483a]">
            {step === 1
              ? "How would you like to start?"
              : step === 2
                ? method === "ai"
                  ? "Describe your coloring pages"
                  : "Add your images"
                : "Review your pages"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {step === 1
              ? "Choose how you want to create your coloring pages."
              : step === 2
                ? method === "ai"
                  ? "Set up a prompt and preview a batch of coloring page ideas."
                  : "Each uploaded image will be placed on its own page."
                : "Select the images you want to add. You can regenerate a new batch at any time."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {step === 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <MethodCard
                icon={<Upload className="size-5" />}
                title="Add your own images"
                description="Upload illustrations from your device."
                selected={method === "upload"}
                onClick={() => setMethod("upload")}
              />
              <MethodCard
                icon={<Sparkles className="size-5" />}
                title="Use AI generated images"
                description="Create a set from a prompt and review the results."
                selected={method === "ai"}
                onClick={() => setMethod("ai")}
              />
            </div>
          )}

          {step === 2 && method === "upload" && (
            <div className="space-y-4">
              <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#cbd7cb] bg-[#f8faf7] px-5 py-7 text-center transition hover:border-[#78927c] hover:bg-[#f3f7f2]">
                <span className="mb-3 flex size-10 items-center justify-center rounded-xl bg-white text-[#5d8063] shadow-sm">
                  <ImagePlus className="size-5" />
                </span>
                <span className="text-sm font-medium text-[#425347]">
                  Drop images here or browse
                </span>
                <span className="mt-1 text-xs text-[#8a958d]">
                  Upload multiple image files · up to 50 pages
                </span>
                <input
                  accept="image/*"
                  className="sr-only"
                  multiple
                  onChange={(event) => void handleUploads(event)}
                  type="file"
                />
              </label>

              {uploads.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {uploads.map((image) => (
                    <ImageTile
                      key={image.id}
                      image={image}
                      onRemove={() =>
                        setUploads((current) =>
                          current.filter((item) => item.id !== image.id),
                        )
                      }
                    />
                  ))}
                </div>
              ) : (
                <p className="text-center text-xs text-[#929b94]">
                  No images added yet.
                </p>
              )}
            </div>
          )}

          {step === 2 && method === "ai" && (
            <div className="space-y-5">
              <label className="block space-y-1.5 text-xs font-medium text-[#68736b]">
                Prompt
                <Textarea
                  className="min-h-24 resize-y text-sm"
                  maxLength={2_000}
                  onChange={(event) => setPrompt(event.currentTarget.value)}
                  placeholder="A friendly fox reading under a big leafy tree, simple bold outlines..."
                  value={prompt}
                />
              </label>

              <fieldset className="space-y-2">
                <legend className="text-xs font-medium text-[#68736b]">
                  Page size
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
                        className="mb-1.5 block h-5 w-4 rounded-sm border border-current opacity-70"
                        style={{ aspectRatio: option.ratio }}
                      />
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="block max-w-44 space-y-1.5 text-xs font-medium text-[#68736b]">
                Number of pages
                <Input
                  aria-invalid={!validPageCount}
                  className="h-9 text-sm"
                  max={maxAiPageCount}
                  min={1}
                  onChange={(event) => setPageCount(event.currentTarget.value)}
                  type="number"
                  value={pageCount}
                />
                <span className="block text-[10px] font-normal text-[#929b94]">
                  Choose 1–{maxAiPageCount} pages per batch while running
                  locally.
                </span>
              </label>
            </div>
          )}

          {step === 3 && method === "ai" && (
            <div>
              <div className="mb-4">
                <p className="text-xs text-[#7c887f]">
                  {generated.length} previews · {selectedCount} selected
                </p>
                <p className="mt-1 text-[10px] text-[#929b94]">
                  Regenerate an individual image without changing the others.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {generated.map((image) => (
                  <div
                    className={`overflow-hidden rounded-xl border text-left transition ${
                      image.selected
                        ? "border-[#79977d] ring-2 ring-[#dce8dc]"
                        : "border-[#e5e9e3] opacity-65 hover:opacity-100"
                    }`}
                    key={image.id}
                  >
                    <button
                      aria-label={`${image.selected ? "Deselect" : "Select"} ${image.alt}`}
                      aria-pressed={image.selected}
                      className="group relative block w-full cursor-pointer bg-[#f2f3ef] text-left"
                      onClick={() =>
                        setGenerated((current) =>
                          current.map((item) =>
                            item.id === image.id
                              ? { ...item, selected: !item.selected }
                              : item,
                          ),
                        )
                      }
                      style={{
                        aspectRatio:
                          size === "landscape"
                            ? "4 / 3"
                            : size === "square"
                              ? "1 / 1"
                              : "3 / 4",
                      }}
                      type="button"
                    >
                      <Image
                        alt={image.alt}
                        className="object-cover grayscale contrast-150"
                        fill
                        sizes="(max-width: 640px) 50vw, 33vw"
                        src={image.src}
                        unoptimized
                      />
                      <span
                        className={`absolute right-2 top-2 flex size-6 items-center justify-center rounded-full shadow ${
                          image.selected
                            ? "bg-[#416c4b] text-white"
                            : "bg-white/90 text-transparent"
                        }`}
                      >
                        <Check className="size-3.5" />
                      </span>
                    </button>
                    <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                      <span className="min-w-0 truncate text-[10px] text-[#66736a]">
                        {image.alt}
                      </span>
                      <Button
                        aria-label={`Regenerate ${image.alt}`}
                        className="h-7 shrink-0 px-2 text-[10px]"
                        disabled={isGenerating || Boolean(regeneratingImageId)}
                        onClick={() => void regeneratePreview(image.id)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <RefreshCw
                          className={
                            regeneratingImageId === image.id && !isGenerating
                              ? "animate-spin"
                              : ""
                          }
                        />
                        {regeneratingImageId === image.id
                          ? "Working..."
                          : "Regenerate"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p aria-live="assertive" className="mt-4 text-xs text-red-600">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="flex-row items-center justify-between">
          <div>
            {step > 1 && (
              <Button
                disabled={
                  isGenerating || Boolean(regeneratingImageId) || isAdding
                }
                onClick={() => {
                  setError(null);
                  setStep(step === 3 ? 2 : 1);
                }}
                type="button"
                variant="outline"
              >
                <ArrowLeft />
                Back
              </Button>
            )}
          </div>
          {step === 1 ? (
            <Button
              disabled={!method}
              onClick={() => {
                setError(null);
                setStep(2);
              }}
              type="button"
            >
              Continue
            </Button>
          ) : step === 2 && method === "upload" ? (
            <Button
              disabled={uploads.length === 0 || isAdding}
              onClick={() =>
                addPages(uploads.map(({ src, alt }) => ({ src, alt })))
              }
              type="button"
            >
              {isAdding
                ? "Creating..."
                : `Create ${uploads.length || ""} pages`}
            </Button>
          ) : step === 2 ? (
            <Button
              disabled={
                !validPageCount || !prompt.trim() || isGenerating || isAdding
              }
              onClick={() => void generatePreviews()}
              type="button"
            >
              <Sparkles />
              {isGenerating ? "Generating..." : "Generate previews"}
            </Button>
          ) : (
            <Button
              disabled={
                selectedCount === 0 ||
                isAdding ||
                isGenerating ||
                Boolean(regeneratingImageId)
              }
              onClick={() =>
                addPages(
                  generated
                    .filter((image) => image.selected)
                    .map(({ src, alt }) => ({ src, alt })),
                )
              }
              type="button"
            >
              {isAdding
                ? "Adding..."
                : `Add ${selectedCount} selected page${selectedCount === 1 ? "" : "s"}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MethodCard({
  icon,
  title,
  description,
  selected,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={selected}
      className={`flex cursor-pointer min-h-36 flex-col items-start rounded-xl border p-4 text-left transition ${
        selected
          ? "border-[#91aa94] bg-[#f3f8f2] ring-2 ring-[#e1ebe0]"
          : "border-[#e5e9e3] hover:border-[#bdcdbd] hover:bg-[#fafbf9]"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="mb-3 flex size-9 items-center justify-center rounded-lg bg-white text-[#5e8063] shadow-sm">
        {icon}
      </span>
      <span className="text-sm font-semibold text-[#425347]">{title}</span>
      <span className="mt-1 text-xs leading-relaxed text-[#89958c]">
        {description}
      </span>
    </button>
  );
}

function ImageTile({
  image,
  onRemove,
}: {
  image: UploadedImage;
  onRemove: () => void;
}) {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-[#e5e9e3] bg-white">
      <div className="relative aspect-square bg-[#f2f3ef]">
        <Image
          alt={image.alt}
          className="object-cover"
          fill
          sizes="160px"
          src={image.src}
          unoptimized
        />
        <Button
          aria-label={`Remove ${image.alt}`}
          className="absolute right-1 top-1 size-6 bg-white/90 text-[#59655d] opacity-0 shadow-sm transition group-hover:opacity-100 focus-visible:opacity-100"
          onClick={onRemove}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X />
        </Button>
      </div>
      <p className="truncate px-2 py-1.5 text-[10px] text-[#738077]">
        {image.alt}
      </p>
    </div>
  );
}

function readImageFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error(`Could not read ${file.name}.`));
      }
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}
