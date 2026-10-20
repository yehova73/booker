"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Check,
  LoaderCircle,
  LayoutGrid,
  RefreshCw,
  Settings2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { PageSettingsDialog } from "@/components/ai-studio/page-settings-dialog";
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
import type {
  EditablePlanPage,
  PageTypeOption,
} from "@/components/ai-studio/page-settings-dialog";
import { useServerAction } from "@/hooks/use-server-action";
import {
  AI_BOOK_PAGE_SIZES,
  AI_BOOK_PLAN_PAGE_TYPES,
  AI_BOOK_STORY_WORD_LIMIT,
  AI_STUDIO_PUZZLE_OPTIONS,
  getDefaultAiBookPageSettings,
} from "@/lib/ai-studio";
import { updateAiBookPlanPageAction } from "@/actions/ai-studio/ai-book-plan-pages";
import { generateAiBookBlueprintAction } from "@/actions/ai-studio/ai-book-blueprints";
import {
  createAiBookFromPlanAction,
  generateNextAiBookStoryPageAction,
  setAiBookPlanStoryWordLimitAction,
} from "@/actions/ai-studio/story-book-generation";
import type {
  AiBookPageSize,
  AiBookPlanPageType,
  AiBookPuzzleType,
  AiBookStoryPageStatus,
} from "@/generated/prisma/client";

type PlanPage = EditablePlanPage & {
  updatedAt: string;
  storyText: string | null;
  continuitySummary: string | null;
  storyStatus: AiBookStoryPageStatus;
  storyError: string | null;
};
type CollectionOption = { id: string; title: string };
type GeneratedBook = { id: string; title: string; createdAt: string };
type AiBookPlanWorkspaceData = {
  id: string;
  title: string;
  kdpDescription: string;
  niche: string;
  pageCount: number;
  pageSize: AiBookPageSize;
  storyMaxWordsPerPage: number;
  initialPrompt: string;
  storyPuzzle: boolean;
  status: string;
  puzzles: AiBookPuzzleType[];
  pages: PlanPage[];
  generatedBooks: GeneratedBook[];
  collections: CollectionOption[];
};

type WorkspaceView = "spread" | "grid";

export function AiBookPlanWorkspace({
  plan,
}: {
  plan: AiBookPlanWorkspaceData;
}) {
  const router = useRouter();
  const collectionSelectId = useId();
  const maxWordsInputId = useId();
  const [view, setView] = useState<WorkspaceView>("spread");
  const [selectedPageId, setSelectedPageId] = useState(
    plan.pages[0]?.id ?? "",
  );
  const [editingPageId, setEditingPageId] = useState("");
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [collectionId, setCollectionId] = useState(
    plan.collections[0]?.id ?? "",
  );
  const [maxWordsPerPage, setMaxWordsPerPage] = useState(
    String(plan.storyMaxWordsPerPage),
  );
  const [generationProgress, setGenerationProgress] = useState<{
    completed: number;
    total: number;
    pageNumber?: number;
  } | null>(null);
  const { call: updatePage, loading: isSwapping } = useServerAction(
    updateAiBookPlanPageAction,
  );
  const { call: generateBlueprint, loading: isGenerating } = useServerAction(
    generateAiBookBlueprintAction,
  );
  const { call: generateStoryPage, loading: isGeneratingStory } =
    useServerAction(generateNextAiBookStoryPageAction);
  const { call: createBook, loading: isCreatingBook } = useServerAction(
    createAiBookFromPlanAction,
  );
  const { call: setStoryWordLimit, loading: isSettingWordLimit } =
    useServerAction(setAiBookPlanStoryWordLimitAction);
  const parsedMaxWordsPerPage = Number(maxWordsPerPage);
  const isMaxWordsPerPageValid =
    Number.isSafeInteger(parsedMaxWordsPerPage) &&
    parsedMaxWordsPerPage >= AI_BOOK_STORY_WORD_LIMIT.minimum &&
    parsedMaxWordsPerPage <= AI_BOOK_STORY_WORD_LIMIT.maximum;
  const isGeneratingBook =
    isGeneratingStory || isCreatingBook || isSettingWordLimit;
  const selectedPage =
    plan.pages.find((page) => page.id === selectedPageId) ?? plan.pages[0];
  const editingPage = plan.pages.find((page) => page.id === editingPageId);
  const pageSize = AI_BOOK_PAGE_SIZES.find(
    (option) => option.value === plan.pageSize,
  );
  const pageTypeOptions = (pageNumber: number) =>
    getAvailablePageTypes(plan, pageNumber);
  const spreads = useMemo(() => getPageSpreads(plan.pages), [plan.pages]);

  async function generateBook() {
    if (!collectionId || !isMaxWordsPerPageValid) return;
    const configuredLimit = await setStoryWordLimit(
      plan.id,
      parsedMaxWordsPerPage,
    );
    if (!configuredLimit) return;
    setGenerationProgress(null);

    while (true) {
      const progress = await generateStoryPage(plan.id);
      if (!progress) return;
      setGenerationProgress({
        completed: progress.completedStoryPages,
        total: progress.totalStoryPages,
        pageNumber: progress.generatedPageNumber,
      });
      if (!progress.complete) continue;

      const book = await createBook(plan.id, collectionId);
      if (book) {
        setGenerateDialogOpen(false);
        router.push(`/editor/${book.id}`);
      }
      return;
    }
  }

  async function swapPageType(page: PlanPage) {
    const types = pageTypeOptions(page.pageNumber);
    if (types.length < 2) return;
    const currentIndex = types.findIndex((option) => option.value === page.type);
    const nextType = types[(currentIndex + 1) % types.length];
    if (!nextType) return;
    setSelectedPageId(page.id);
    await updatePage(page.id, {
      type: nextType.value,
      prompt: page.prompt,
      description: page.description,
      settings: getDefaultAiBookPageSettings(nextType.value),
    });
  }

  return (
    <main className="flex min-h-[calc(100svh-3.5rem)] flex-col gap-4 p-4 sm:p-6 lg:h-[calc(100svh-3.5rem)] lg:min-h-0 lg:overflow-hidden">
      <DashboardPageHeader
        pre={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Back to AI Studio"
            render={<Link href="/dashboard/ai-studio" />}
          >
            <ArrowLeft />
          </Button>
        }
        title={plan.title}
        description={`AI book blueprint · ${plan.status}`}
        className="shrink-0"
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium capitalize text-muted-foreground">
              <Sparkles className="size-3.5" />
              {plan.status}
            </span>
            {plan.generatedBooks[0] && (
              <Button
                type="button"
                variant="outline"
                render={<Link href={`/editor/${plan.generatedBooks[0].id}`} />}
              >
                <BookOpen />
                Open Latest
              </Button>
            )}
            <Button
              type="button"
              onClick={() => setGenerateDialogOpen(true)}
            >
              <BookOpen />
              {plan.generatedBooks.length > 0
                ? "Generate Another Book"
                : "Generate Book"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isGenerating}
              onClick={() => generateBlueprint(plan.id)}
            >
              {isGenerating ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Sparkles />
              )}
              {plan.status === "generated"
                ? "Regenerate Blueprint"
                : "Generate Blueprint"}
            </Button>
          </div>
        }
      />

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(280px,3fr)]">
        <section className="min-h-[32rem] rounded-xl border bg-muted/20 p-3 sm:p-5 lg:min-h-0 lg:overflow-y-auto">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Book pages</h2>
              <p className="text-sm text-muted-foreground">
                {plan.pageCount} pages · Select a page to edit its prompt and settings.
              </p>
            </div>
            <div
              aria-label="Page layout"
              className="inline-flex rounded-lg border bg-background p-1"
            >
              <Button
                type="button"
                variant={view === "spread" ? "secondary" : "ghost"}
                size="sm"
                aria-pressed={view === "spread"}
                onClick={() => setView("spread")}
              >
                <BookOpen />
                Spread
              </Button>
              <Button
                type="button"
                variant={view === "grid" ? "secondary" : "ghost"}
                size="sm"
                aria-pressed={view === "grid"}
                onClick={() => setView("grid")}
              >
                <LayoutGrid />
                Grid
              </Button>
            </div>
          </div>

          {view === "spread" ? (
            <div className="space-y-4">
              {spreads.map((spread) => (
                <div
                  key={spread.map((page) => page.id).join("-")}
                  className={`grid gap-3 ${
                    spread.length === 1
                      ? "grid-cols-1"
                      : "grid-cols-1 md:grid-cols-2"
                  }`}
                >
                  {spread.map((page) => (
                    <PageCard
                      key={page.id}
                      page={page}
                      selected={selectedPage?.id === page.id}
                      storyPuzzle={plan.storyPuzzle}
                      swapping={isSwapping}
                      canSwap={pageTypeOptions(page.pageNumber).length > 1}
                      onOpen={() => {
                        setSelectedPageId(page.id);
                        setEditingPageId(page.id);
                      }}
                      onSwap={() => swapPageType(page)}
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {plan.pages.map((page) => (
                <PageCard
                  key={page.id}
                  page={page}
                  selected={selectedPage?.id === page.id}
                  storyPuzzle={plan.storyPuzzle}
                  swapping={isSwapping}
                  canSwap={pageTypeOptions(page.pageNumber).length > 1}
                  onOpen={() => {
                    setSelectedPageId(page.id);
                    setEditingPageId(page.id);
                  }}
                  onSwap={() => swapPageType(page)}
                  compact
                />
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100svh-6rem)] lg:overflow-y-auto">
          <section className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-primary" />
              <h2 className="font-semibold">Book inspector</h2>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <InspectorRow label="Niche" value={plan.niche || "Not specified"} />
              <InspectorRow label="Pages" value={`${plan.pageCount}`} />
              <InspectorRow
                label="Page size"
                value={pageSize?.dimensions ?? plan.pageSize}
              />
              <InspectorRow
                label="Content"
                value={
                  plan.puzzles.length
                    ? plan.puzzles
                        .map(
                          (type) =>
                            AI_STUDIO_PUZZLE_OPTIONS.find(
                              (option) => option.value === type,
                            )?.label ?? type,
                        )
                        .join(", ")
                    : "No puzzles selected"
                }
              />
              {plan.storyPuzzle && (
                <InspectorRow label="Story mode" value="Active" />
              )}
            </dl>
          </section>

          <section className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">
                {selectedPage
                  ? `Page ${selectedPage.pageNumber}`
                  : "Book idea"}
              </h2>
              {selectedPage && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingPageId(selectedPage.id)}
                >
                  <Settings2 />
                  Edit
                </Button>
              )}
            </div>
            {selectedPage ? (
              <>
                <p className="mt-1 text-xs font-medium text-primary">
                  {getPageTypeLabel(selectedPage.type)}
                </p>
                {selectedPage.description && (
                  <p className="mt-3 text-sm leading-6">
                    {selectedPage.description}
                  </p>
                )}
                {selectedPage.type === "storyScene" && (
                  <div className="mt-4 rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium">Story page</p>
                      <span className="text-xs capitalize text-muted-foreground">
                        {selectedPage.storyStatus}
                      </span>
                    </div>
                    {selectedPage.storyText ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                        {selectedPage.storyText}
                      </p>
                    ) : selectedPage.storyError ? (
                      <p className="mt-2 text-sm text-destructive">
                        {selectedPage.storyError}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Story prose will be generated when you create the book.
                      </p>
                    )}
                  </div>
                )}
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {selectedPage.prompt}
                </p>
                {selectedPage.regenerationCount > 0 && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Prompt regenerated {selectedPage.regenerationCount}{" "}
                    {selectedPage.regenerationCount === 1 ? "time" : "times"}.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {plan.initialPrompt}
              </p>
            )}
          </section>

          <section className="rounded-xl border bg-card p-5">
            <h2 className="font-semibold">Initial book idea</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
              {plan.initialPrompt}
            </p>
          </section>

          {plan.kdpDescription && (
            <section className="rounded-xl border bg-card p-5">
              <h2 className="font-semibold">KDP description</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {plan.kdpDescription}
              </p>
            </section>
          )}

          {plan.generatedBooks.length > 0 && (
            <section className="rounded-xl border bg-card p-5">
              <h2 className="font-semibold">Books from this blueprint</h2>
              <ul className="mt-3 space-y-2">
                {plan.generatedBooks.map((book, index) => (
                  <li key={book.id}>
                    <Link
                      href={`/editor/${book.id}`}
                      className="flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted"
                    >
                      <span className="min-w-0 truncate">
                        {book.title}
                        {index === 0 && (
                          <span className="ml-2 text-xs text-primary">
                            Latest
                          </span>
                        )}
                      </span>
                      <time
                        dateTime={book.createdAt}
                        className="shrink-0 text-xs text-muted-foreground"
                      >
                        {book.createdAt.slice(0, 10)}
                      </time>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>

      {editingPage && (
        <PageSettingsDialog
          key={`${editingPage.id}-${editingPage.updatedAt}`}
          page={editingPage}
          pageTypes={pageTypeOptions(editingPage.pageNumber)}
          open={!!editingPageId}
          onOpenChange={(open) => {
            if (!open) setEditingPageId("");
          }}
        />
      )}

      <Dialog
        open={generateDialogOpen}
        onOpenChange={(open) => {
          if (!isGeneratingBook) setGenerateDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {plan.generatedBooks.length > 0
                ? "Generate another book"
                : "Generate your book"}
            </DialogTitle>
            <DialogDescription>
              Create a separate editable book from this blueprint. Existing
              books remain unchanged. Story pages will be written in page order
              and continue from the previous story page; other pages keep their
              blueprint details.
            </DialogDescription>
          </DialogHeader>
          {plan.collections.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create a collection before generating a book.
              </p>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setGenerateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  render={<Link href="/dashboard/collections" />}
                >
                  Create a collection
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor={collectionSelectId}>Collection</Label>
                <Select
                  value={collectionId}
                  onValueChange={(value) => setCollectionId(value ?? "")}
                  disabled={isGeneratingBook}
                >
                  <SelectTrigger id={collectionSelectId} className="w-full">
                    <SelectValue placeholder="Choose a collection" />
                  </SelectTrigger>
                  <SelectContent align="start">
                    {plan.collections.map((collection) => (
                      <SelectItem key={collection.id} value={collection.id}>
                        {collection.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={maxWordsInputId}>
                  Maximum words per story page
                </Label>
                <Input
                  id={maxWordsInputId}
                  type="number"
                  min={AI_BOOK_STORY_WORD_LIMIT.minimum}
                  max={AI_BOOK_STORY_WORD_LIMIT.maximum}
                  step={1}
                  value={maxWordsPerPage}
                  disabled={isGeneratingBook}
                  aria-invalid={!isMaxWordsPerPageValid}
                  onChange={(event) =>
                    setMaxWordsPerPage(event.currentTarget.value)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Choose {AI_BOOK_STORY_WORD_LIMIT.minimum}–
                  {AI_BOOK_STORY_WORD_LIMIT.maximum} words. Changing the saved
                  limit clears existing story text so every page uses the same
                  maximum.
                </p>
                {!isMaxWordsPerPageValid && (
                  <p className="text-xs text-destructive">
                    Enter a whole number from{" "}
                    {AI_BOOK_STORY_WORD_LIMIT.minimum} to{" "}
                    {AI_BOOK_STORY_WORD_LIMIT.maximum}.
                  </p>
                )}
              </div>
              {generationProgress && (
                <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      {generationProgress.pageNumber
                        ? `Generated story page ${generationProgress.pageNumber}`
                        : "Generating story pages"}
                    </span>
                    <span className="text-muted-foreground">
                      {generationProgress.completed}/
                      {generationProgress.total}
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={generationProgress.total || 1}
                    aria-valuenow={generationProgress.completed}
                    className="h-2 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${
                          generationProgress.total
                            ? (generationProgress.completed /
                                generationProgress.total) *
                              100
                            : 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isGeneratingBook}
                  onClick={() => setGenerateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={
                    isGeneratingBook ||
                    !collectionId ||
                    !isMaxWordsPerPageValid
                  }
                  onClick={generateBook}
                >
                  {isGeneratingBook ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Sparkles />
                  )}
                  {isGeneratingBook ? "Generating..." : "Generate Book"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function PageCard({
  page,
  selected,
  storyPuzzle,
  swapping,
  canSwap,
  onOpen,
  onSwap,
  compact = false,
}: {
  page: PlanPage;
  selected: boolean;
  storyPuzzle: boolean;
  swapping: boolean;
  canSwap: boolean;
  onOpen: () => void;
  onSwap: () => void;
  compact?: boolean;
}) {
  const spreadLabel = storyPuzzle
    ? page.type === "storyScene"
      ? "Story Scene"
      : page.type !== "titlePage"
        ? "Activity / Puzzle"
        : null
    : null;

  return (
    <article
      className={`group relative flex min-h-52 flex-col overflow-hidden rounded-xl border bg-card transition-colors ${
        selected ? "border-primary ring-1 ring-primary" : "hover:border-primary/50"
      } ${compact ? "min-h-44" : ""}`}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open settings for page ${page.pageNumber}, ${getPageTypeLabel(page.type)}`}
        className="flex flex-1 flex-col items-start p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <div className="flex w-full items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Page {page.pageNumber}
          </span>
          {selected && <Check aria-hidden="true" className="size-4 text-primary" />}
        </div>
        {spreadLabel && (
          <span className="mt-3 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {spreadLabel}
          </span>
        )}
        <span className="mt-2 rounded-md bg-muted px-2 py-1 text-xs font-medium">
          {getPageTypeLabel(page.type)}
        </span>
        {page.type === "storyScene" && (
          <span className="mt-2 text-[11px] font-medium capitalize text-primary">
            Story {page.storyStatus}
          </span>
        )}
        <span
          className={`mt-3 text-sm leading-5 text-muted-foreground ${
            compact ? "line-clamp-3" : "line-clamp-4"
          }`}
        >
          {page.storyText || page.description || page.prompt}
        </span>
      </button>
      <div className="flex gap-2 border-t px-3 py-2 transition-opacity lg:absolute lg:inset-x-2 lg:top-2 lg:justify-end lg:border-0 lg:p-0 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-7 bg-background/95 text-xs shadow-sm"
          onClick={onOpen}
        >
          <Settings2 />
          Edit Settings
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-7 bg-background/95 text-xs shadow-sm"
          disabled={swapping || !canSwap}
          onClick={onSwap}
        >
          <RefreshCw />
          Swap Type
        </Button>
      </div>
    </article>
  );
}

function InspectorRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function getAvailablePageTypes(
  plan: AiBookPlanWorkspaceData,
  pageNumber: number,
): PageTypeOption[] {
  if (pageNumber === 1) {
    return AI_BOOK_PLAN_PAGE_TYPES.filter(
      (option) => option.value === "titlePage",
    );
  }
  if (plan.storyPuzzle && plan.puzzles.length === 0) {
    return AI_BOOK_PLAN_PAGE_TYPES.filter(
      (option) => option.value === "storyScene",
    );
  }
  if (plan.storyPuzzle) {
    return AI_BOOK_PLAN_PAGE_TYPES.filter(
      (option) =>
        option.value === "storyScene" ||
        plan.puzzles.some((puzzle) => puzzle === option.value),
    );
  }
  if (plan.puzzles.length === 0) {
    return AI_BOOK_PLAN_PAGE_TYPES.filter(
      (option) => option.value === "activity",
    );
  }
  return AI_BOOK_PLAN_PAGE_TYPES.filter((option) =>
    plan.puzzles.some((puzzle) => puzzle === option.value),
  );
}

function getPageTypeLabel(type: AiBookPlanPageType) {
  return (
    AI_BOOK_PLAN_PAGE_TYPES.find((option) => option.value === type)?.label ??
    "Activity"
  );
}

function getPageSpreads(pages: PlanPage[]): PlanPage[][] {
  const spreads: PlanPage[][] = [];
  pages.forEach((page, index) => {
    if (page.pageNumber === 1) {
      spreads.push([page]);
    } else if (page.pageNumber % 2 === 0) {
      const rightPage = pages[index + 1];
      spreads.push(rightPage ? [page, rightPage] : [page]);
    }
  });
  return spreads;
}
