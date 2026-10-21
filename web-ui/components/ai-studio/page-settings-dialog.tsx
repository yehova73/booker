"use client";

import { useState } from "react";
import { LoaderCircle, RefreshCw, Save } from "lucide-react";
import {
  regenerateAiBookPlanPageAction,
  updateAiBookPlanPageAction,
} from "@/actions/ai-studio/ai-book-plan-pages";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import useServerAction from "@/hooks/use-server-action";
import { getDefaultAiBookPageSettings } from "@/lib/ai-studio";
import type { AiBookPageSettings } from "@/lib/ai-studio";
import type { AiBookPlanPageType } from "@/generated/prisma/client";

export type EditablePlanPage = {
  id: string;
  pageNumber: number;
  type: AiBookPlanPageType;
  prompt: string;
  description: string;
  settings: AiBookPageSettings;
  regenerationCount: number;
};

export type PageTypeOption = {
  value: AiBookPlanPageType;
  label: string;
};

export function PageSettingsDialog({
  page,
  pageTypes,
  open,
  onOpenChange,
}: {
  page: EditablePlanPage;
  pageTypes: PageTypeOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [type, setType] = useState(page.type);
  const [prompt, setPrompt] = useState(page.prompt);
  const [description, setDescription] = useState(page.description);
  const [settings, setSettings] = useState(page.settings);
  const { call: savePage, loading: isSaving } = useServerAction(
    updateAiBookPlanPageAction,
  );
  const { call: regenerate, loading: isRegenerating } = useServerAction(
    regenerateAiBookPlanPageAction,
  );
  const isBusy = isSaving || isRegenerating;

  async function save() {
    const result = await savePage(page.id, {
      type,
      prompt,
      description,
      settings,
    });
    if (result) onOpenChange(false);
  }

  async function regeneratePrompt() {
    const result = await regenerate(page.id, {
      type,
      prompt,
      description,
      settings,
    });
    if (result) setPrompt(result.prompt);
  }

  function updateSetting(key: string, value: string | number) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  const promptLabel =
    type === "storyScene"
      ? "Story prompt"
      : type === "coloringPage"
        ? "Image prompt"
        : "Page prompt";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isBusy) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Page {page.pageNumber} settings</DialogTitle>
          <DialogDescription>
            Update this page&apos;s content type, prompt, and generation settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="plan-page-type">Page type</Label>
            <Select
              value={type}
              onValueChange={(value) => {
                const option = pageTypes.find(
                  (candidate) => candidate.value === value,
                );
                if (!option) return;
                setType(option.value);
                setSettings(getDefaultAiBookPageSettings(option.value));
              }}
            >
              <SelectTrigger id="plan-page-type" className="w-full">
                <SelectValue placeholder="Choose a page type" />
              </SelectTrigger>
              <SelectContent>
                {pageTypes.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === "sudoku" && (
            <div className="space-y-2">
              <Label htmlFor="plan-page-sudoku-squares">Squares</Label>
              <Select
                value={
                  typeof settings.squares === "number"
                    ? String(settings.squares)
                    : "3"
                }
                onValueChange={(value) => {
                  if (value) updateSetting("squares", Number(value));
                }}
              >
                <SelectTrigger id="plan-page-sudoku-squares" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5].map((squares) => (
                    <SelectItem key={squares} value={String(squares)}>
                      {squares} ({squares * squares} × {squares * squares})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label htmlFor="plan-page-difficulty">Difficulty</Label>
              <Select
                value={
                  typeof settings.difficulty === "string"
                    ? settings.difficulty
                    : "medium"
                }
                onValueChange={(value) => {
                  if (value) updateSetting("difficulty", value);
                }}
              >
                <SelectTrigger id="plan-page-difficulty" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["easy", "medium", "hard", "insane"].map((difficulty) => (
                    <SelectItem key={difficulty} value={difficulty}>
                      {difficulty[0].toUpperCase() + difficulty.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {type === "maze" && (
            <div className="grid grid-cols-2 gap-3">
              <SettingsNumberInput
                label="Rows"
                setting="rows"
                value={settings.rows}
                defaultValue={15}
                min={5}
                max={40}
                onChange={updateSetting}
              />
              <SettingsNumberInput
                label="Cells per row"
                setting="cols"
                value={settings.cols}
                defaultValue={15}
                min={5}
                max={40}
                onChange={updateSetting}
              />
              <div className="col-span-2 space-y-2">
                <Label htmlFor="plan-page-maze-difficulty">Difficulty</Label>
                <Select
                  value={
                    typeof settings.difficulty === "string"
                      ? settings.difficulty
                      : "medium"
                  }
                  onValueChange={(value) => {
                    if (value) updateSetting("difficulty", value);
                  }}
                >
                  <SelectTrigger
                    id="plan-page-maze-difficulty"
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["easy", "medium", "hard", "insane"].map((difficulty) => (
                      <SelectItem key={difficulty} value={difficulty}>
                        {difficulty[0].toUpperCase() + difficulty.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {type === "wordSearch" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <SettingsNumberInput
                  label="Rows"
                  setting="rows"
                  value={settings.rows}
                  defaultValue={15}
                  min={5}
                  max={30}
                  onChange={updateSetting}
                />
                <SettingsNumberInput
                  label="Columns"
                  setting="cols"
                  value={settings.cols}
                  defaultValue={15}
                  min={5}
                  max={30}
                  onChange={updateSetting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-page-wordsearch-dictionary">
                  Dictionary name
                </Label>
                <Input
                  id="plan-page-wordsearch-dictionary"
                  maxLength={100}
                  value={
                    typeof settings.dictionaryName === "string"
                      ? settings.dictionaryName
                      : "Custom"
                  }
                  onChange={(event) =>
                    updateSetting("dictionaryName", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-page-wordsearch-words">
                  Words (separate with spaces or new lines)
                </Label>
                <Textarea
                  id="plan-page-wordsearch-words"
                  rows={3}
                  maxLength={10000}
                  value={
                    typeof settings.words === "string" ? settings.words : ""
                  }
                  onChange={(event) =>
                    updateSetting("words", event.target.value)
                  }
                />
              </div>
              <SettingsNumberInput
                label="Maximum words per puzzle"
                setting="maxWords"
                value={settings.maxWords}
                defaultValue={12}
                min={1}
                max={100}
                onChange={updateSetting}
              />
            </div>
          )}

          {type === "crossword" && (
            <div className="space-y-2">
              <Label htmlFor="plan-page-grid-size">Grid size</Label>
              <Select
                value={
                  typeof settings.gridSize === "number"
                    ? String(settings.gridSize)
                    : "10"
                }
                onValueChange={(value) => {
                  if (value) updateSetting("gridSize", Number(value));
                }}
              >
                <SelectTrigger id="plan-page-grid-size" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[8, 10, 12, 15].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size} × {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {type === "coloringPage" && (
            <div className="space-y-2">
              <Label htmlFor="plan-page-art-style">Illustration style</Label>
              <Select
                value={
                  typeof settings.artStyle === "string"
                    ? settings.artStyle
                    : "line-art"
                }
                onValueChange={(value) => {
                  if (value) updateSetting("artStyle", value);
                }}
              >
                <SelectTrigger id="plan-page-art-style" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line-art">Black-and-white line art</SelectItem>
                  <SelectItem value="full-color">Full color</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {type === "storyScene" && (
            <div className="space-y-2">
              <Label htmlFor="plan-page-tone">Story tone</Label>
              <Input
                id="plan-page-tone"
                value={
                  typeof settings.tone === "string"
                    ? settings.tone
                    : "warm and adventurous"
                }
                onChange={(event) => updateSetting("tone", event.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="plan-page-prompt">{promptLabel}</Label>
            <Textarea
              id="plan-page-prompt"
              rows={6}
              maxLength={4000}
              required
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {page.regenerationCount > 0
                ? `Regenerated ${page.regenerationCount} ${
                    page.regenerationCount === 1 ? "time" : "times"
                  }.`
                : "Regenerate to get a fresh AI-written prompt."}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-page-description">Page description</Label>
            <Textarea
              id="plan-page-description"
              rows={3}
              maxLength={1000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="A short summary of this page's content."
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={regeneratePrompt}
          >
            {isRegenerating ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <RefreshCw />
            )}
            Regenerate prompt
          </Button>
          <Button type="button" disabled={isBusy || !prompt.trim()} onClick={save}>
            {isSaving ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Save />
            )}
            Save settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SettingsNumberInput({
  label,
  setting,
  value,
  defaultValue,
  min,
  max,
  onChange,
}: {
  label: string;
  setting: string;
  value: string | number | boolean | undefined;
  defaultValue: number;
  min: number;
  max: number;
  onChange: (key: string, value: string | number) => void;
}) {
  const id = `plan-page-${setting}`;
  const numberValue = typeof value === "number" ? value : defaultValue;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        value={numberValue}
        aria-invalid={
          !Number.isSafeInteger(numberValue) ||
          numberValue < min ||
          numberValue > max
        }
        onChange={(event) =>
          onChange(
            setting,
            event.currentTarget.value === ""
              ? 0
              : Number(event.currentTarget.value),
          )
        }
      />
      <p className="text-xs text-muted-foreground">
        Choose {min}–{max}.
      </p>
    </div>
  );
}
