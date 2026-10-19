"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

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
import { WORD_SEARCH_DICTIONARIES } from "./word-search-dictionaries";
import type { WordSearchDictionary } from "./word-search-dictionaries";
import type { WordSearchGenerationSettings } from "./editor-types";

const minGridDimension = 5;
const maxGridDimension = 30;
const maxPageCount = 50;
const maxWordsLimit = 100;

export function WordSearchGeneratorDialog({
  open,
  onOpenChange,
  onGenerate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (config: WordSearchGenerationSettings) => Promise<void>;
}) {
  const [dictionaries, setDictionaries] = useState(WORD_SEARCH_DICTIONARIES);
  const [selectedDictionaryId, setSelectedDictionaryId] = useState(
    WORD_SEARCH_DICTIONARIES[0].id,
  );
  const [editingDictionaryId, setEditingDictionaryId] = useState<string | null>(
    null,
  );
  const [dictionaryDraft, setDictionaryDraft] = useState("");
  const [dictionaryError, setDictionaryError] = useState<string | null>(null);
  const [cols, setCols] = useState("15");
  const [rows, setRows] = useState("15");
  const [maxWords, setMaxWords] = useState("12");
  const [pageCount, setPageCount] = useState("1");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDictionary = dictionaries.find(
    (dictionary) => dictionary.id === selectedDictionaryId,
  );
  const parsedCols = Number(cols);
  const parsedRows = Number(rows);
  const parsedMaxWords = Number(maxWords);
  const parsedPageCount = Number(pageCount);
  const dimensionsAreValid =
    isIntegerInRange(parsedCols, minGridDimension, maxGridDimension) &&
    isIntegerInRange(parsedRows, minGridDimension, maxGridDimension);
  const maxWordsAreValid = isIntegerInRange(parsedMaxWords, 1, maxWordsLimit);
  const pageCountIsValid = isIntegerInRange(
    parsedPageCount,
    1,
    maxPageCount,
  );
  const usableWords =
    selectedDictionary && dimensionsAreValid
      ? selectedDictionary.words.filter(
          (word) => word.length <= Math.max(parsedCols, parsedRows),
        )
      : [];
  const canGenerate =
    Boolean(selectedDictionary) &&
    dimensionsAreValid &&
    maxWordsAreValid &&
    pageCountIsValid &&
    usableWords.length > 0 &&
    !isGenerating;
  const editingDictionary = dictionaries.find(
    (dictionary) => dictionary.id === editingDictionaryId,
  );

  function startEditing(dictionary: WordSearchDictionary) {
    setEditingDictionaryId(dictionary.id);
    setDictionaryDraft(dictionary.words.join(" "));
    setDictionaryError(null);
  }

  function saveDictionary() {
    const words = parseDictionaryWords(dictionaryDraft);
    if (words.length === 0) {
      setDictionaryError("Enter at least one word containing letters A–Z.");
      return;
    }
    if (editingDictionaryId) {
      setDictionaries((current) =>
        current.map((dictionary) =>
          dictionary.id === editingDictionaryId
            ? { ...dictionary, words }
            : dictionary,
        ),
      );
    }
    setEditingDictionaryId(null);
    setDictionaryError(null);
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (isGenerating && !nextOpen) return;
          setError(null);
          onOpenChange(nextOpen);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Word Search</DialogTitle>
            <DialogDescription>
              Choose a grid, a word list, and how many puzzle pages to add.
              Each page gets its own random selection of words.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Columns"
                min={minGridDimension}
                max={maxGridDimension}
                value={cols}
                onChange={setCols}
              />
              <NumberField
                label="Rows"
                min={minGridDimension}
                max={maxGridDimension}
                value={rows}
                onChange={setRows}
              />
            </div>

            <fieldset className="space-y-2">
              <legend className="text-[11px] font-medium text-[#68736b]">
                Dictionary
              </legend>
              <div className="space-y-2">
                {dictionaries.map((dictionary) => (
                  <div className="flex gap-1.5" key={dictionary.id}>
                    <Button
                      aria-pressed={selectedDictionaryId === dictionary.id}
                      className={`h-8 flex-1 justify-start text-xs ${
                        selectedDictionaryId === dictionary.id
                          ? "bg-[#eaf1e9] text-[#315d44]"
                          : ""
                      }`}
                      onClick={() => setSelectedDictionaryId(dictionary.id)}
                      type="button"
                      variant="outline"
                    >
                      {dictionary.name}
                      <span className="ml-auto text-[10px] text-[#929b94]">
                        {dictionary.words.length} words
                      </span>
                    </Button>
                    <Button
                      aria-label={`Edit ${dictionary.name} dictionary`}
                      className="size-8"
                      onClick={() => startEditing(dictionary)}
                      size="icon"
                      type="button"
                      variant="outline"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[#929b94]">
                {usableWords.length} words fit the current grid. Longer words
                are skipped.
              </p>
            </fieldset>

            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Max words per page"
                min={1}
                max={maxWordsLimit}
                value={maxWords}
                onChange={setMaxWords}
              />
              <NumberField
                label="Number of pages"
                min={1}
                max={maxPageCount}
                value={pageCount}
                onChange={setPageCount}
              />
            </div>
            {error && (
              <p aria-live="assertive" className="text-xs text-red-600">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              disabled={isGenerating}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={!canGenerate}
              onClick={async () => {
                if (!selectedDictionary) return;
                setError(null);
                setIsGenerating(true);
                try {
                  await onGenerate({
                    cols: parsedCols,
                    rows: parsedRows,
                    dictionaryName: selectedDictionary.name,
                    dictionary: usableWords,
                    maxWords: Math.min(parsedMaxWords, usableWords.length),
                    pageCount: parsedPageCount,
                  });
                  onOpenChange(false);
                } catch (generationError) {
                  setError(
                    generationError instanceof Error
                      ? generationError.message
                      : "Word Search generation failed.",
                  );
                } finally {
                  setIsGenerating(false);
                }
              }}
              type="button"
            >
              {isGenerating ? "Generating..." : "Generate puzzles"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingDictionary !== undefined}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setEditingDictionaryId(null);
            setDictionaryError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit {editingDictionary?.name} dictionary</DialogTitle>
            <DialogDescription>
              Separate words with spaces. Only letters A–Z are kept.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              aria-label="Dictionary words"
              className="min-h-36"
              onChange={(event) => setDictionaryDraft(event.currentTarget.value)}
              value={dictionaryDraft}
            />
            {dictionaryError && (
              <p aria-live="assertive" className="text-xs text-red-600">
                {dictionaryError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => setEditingDictionaryId(null)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={saveDictionary} type="button">
              Save dictionary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NumberField({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-[11px] font-medium text-[#68736b]">
      {label}
      <Input
        aria-label={label}
        aria-invalid={!isIntegerInRange(Number(value), min, max)}
        className="h-9 text-sm"
        max={max}
        min={min}
        onChange={(event) => onChange(event.currentTarget.value)}
        type="number"
        value={value}
      />
      <span className="font-normal text-[#929b94]">
        Choose {min}–{max}.
      </span>
    </label>
  );
}

function parseDictionaryWords(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\s+/)
        .map((word) => word.replace(/[^a-z]/gi, "").toUpperCase())
        .filter(Boolean),
    ),
  );
}

function isIntegerInRange(value: number, min: number, max: number) {
  return Number.isInteger(value) && value >= min && value <= max;
}
