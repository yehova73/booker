"use client";

import { useId, useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AI_BOOK_NICHE_OPTIONS, AI_BOOK_PAGE_SIZES } from "@/lib/ai-studio";
import type { NewBookMetadata } from "./new-book-types";

export function ProjectMetadataStep({
  value,
  onChange,
  onNext,
}: {
  value: NewBookMetadata;
  onChange: (updates: Partial<NewBookMetadata>) => void;
  onNext: () => void;
}) {
  const titleId = useId();
  const nicheId = useId();
  const pagesId = useId();
  const promptId = useId();
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value.title.trim() || !value.initialPrompt.trim()) {
      setError("Enter a title and an initial idea or prompt to continue.");
      return;
    }
    setError("");
    onNext();
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={titleId}>Title <span className="text-destructive">*</span></Label>
          <Input
            id={titleId}
            autoFocus
            required
            maxLength={100}
            value={value.title}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder="e.g. Dino Discovery Activity Book"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={nicheId}>Niche</Label>
          <Combobox
            value={value.niche}
            onValueChange={(niche) => onChange({ niche: niche ?? "" })}
            onInputValueChange={(niche) => onChange({ niche })}
          >
            <ComboboxInput
              id={nicheId}
              className="w-full"
              placeholder="Choose a niche or type your own"
              showTrigger
            />
            <ComboboxContent className="min-w-[var(--anchor-width)]">
              <ComboboxList>
                {AI_BOOK_NICHE_OPTIONS.map((niche) => (
                  <ComboboxItem key={niche} value={niche}>
                    {niche}
                  </ComboboxItem>
                ))}
                <ComboboxEmpty>No matching niche. Your custom value will be used.</ComboboxEmpty>
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          <p className="text-xs text-muted-foreground">
            Pick a suggestion or enter a custom niche.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={pagesId}>Number of pages</Label>
          <Input
            id={pagesId}
            type="number"
            min={24}
            max={828}
            step={1}
            required
            value={value.pageCount}
            onChange={(event) =>
              onChange({
                pageCount:
                  event.target.value === "" ? "" : Number(event.target.value),
              })
            }
          />
          <p className="text-xs text-muted-foreground">
            KDP print books support 24–828 pages.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Page size</Label>
          <div className="grid gap-2">
            {AI_BOOK_PAGE_SIZES.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={value.pageSize === option.value}
                onClick={() => onChange({ pageSize: option.value })}
                className={`flex min-h-14 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                  value.pageSize === option.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-background hover:bg-muted/50"
                }`}
              >
                <span>
                  <span className="block text-sm font-medium">
                    {option.dimensions}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={`size-4 shrink-0 rounded-full border ${
                    value.pageSize === option.value
                      ? "border-[5px] border-primary"
                      : "border-muted-foreground/50"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={promptId}>Initial idea / prompt <span className="text-destructive">*</span></Label>
          <Textarea
            id={promptId}
            required
            rows={4}
            value={value.initialPrompt}
            onChange={(event) =>
              onChange({ initialPrompt: event.target.value })
            }
            placeholder="Describe the story, theme, or activities you want this book to explore..."
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end border-t pt-4">
        <Button type="submit">
          Next: Select Content
          <ArrowRight />
        </Button>
      </div>
    </form>
  );
}
