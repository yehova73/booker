"use client";

import { useId, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  FileText,
  FolderOpen,
  LoaderCircle,
  Pencil,
  Ruler,
} from "lucide-react";
import { updateBookDetailsAction } from "@/actions/books/books";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
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
import {
  bookDimensionOptions,
  isBookDimension,
  type BookDimension,
} from "@/lib/book-dimensions";

type BookDetails = {
  id: string;
  title: string;
  description: string;
  dimension: BookDimension;
  pageCount: number;
  createdAt: string;
  updatedAt: string;
  collection: {
    id: string;
    title: string;
    color: string;
  };
};

type CollectionOption = {
  id: string;
  title: string;
};

export function BookDetailsClient({
  book,
  collections,
}: {
  book: BookDetails;
  collections: CollectionOption[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const size = bookDimensionOptions.find(
    (option) => option.value === book.dimension,
  );

  return (
    <main className="p-6">
      <DashboardPageHeader
        pre={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Back to ${book.collection.title}`}
            render={<Link href={`/dashboard/collections/${book.collection.id}`} />}
          >
            <ArrowLeft />
          </Button>
        }
        title={book.title}
        description="Book details and publishing metadata."
        className="mb-8"
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditOpen(true)}
            >
              <Pencil />
              Edit details
            </Button>
            <Button
              type="button"
              render={<Link href={`/editor/${book.id}`} />}
            >
              <BookOpen />
              Edit Book
            </Button>
          </>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(240px,320px)_1fr]">
        <section className="rounded-2xl border bg-muted/30 p-6">
          <h2 className="mb-5 text-sm font-medium text-muted-foreground">
            Cover preview
          </h2>
          <div
            role="img"
            aria-label={`Mock cover for ${book.title}`}
            className="relative mx-auto flex aspect-[3/4] w-full max-w-[260px] items-center justify-center overflow-hidden rounded-r-xl border shadow-xl"
            style={{ backgroundColor: book.collection.color }}
          >
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-3 border-r border-black/10 bg-black/10"
            />
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center">
              <BookOpen aria-hidden="true" className="size-8 opacity-60" />
              <h3 className="line-clamp-4 text-2xl font-semibold leading-tight">
                {book.title}
              </h3>
              <span className="max-w-full truncate text-sm opacity-75">
                {book.collection.title}
              </span>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Cover artwork will be available later.
          </p>
        </section>

        <section className="space-y-6">
          <div className="rounded-2xl border bg-card p-6">
            <h2 className="text-lg font-semibold">Book information</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
              {book.description || "Add a description to tell this book’s story."}
            </p>
            <Link
              href={`/dashboard/collections/${book.collection.id}`}
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
            >
              <FolderOpen
                aria-hidden="true"
                className="size-4"
                style={{ color: book.collection.color }}
              />
              {book.collection.title}
            </Link>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Metadata</h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              <MetadataCard
                icon={<FileText aria-hidden="true" />}
                label="Pages"
                value={`${book.pageCount} ${book.pageCount === 1 ? "page" : "pages"}`}
              />
              <MetadataCard
                icon={<Ruler aria-hidden="true" />}
                label="Book size"
                value={
                  size
                    ? `${size.dimensions} · ${size.label}`
                    : "Unknown size"
                }
              />
              <MetadataCard
                icon={<CalendarDays aria-hidden="true" />}
                label="Created"
                value={formatDate(book.createdAt)}
              />
              <MetadataCard
                icon={<CalendarDays aria-hidden="true" />}
                label="Last updated"
                value={formatDate(book.updatedAt)}
              />
            </dl>
          </div>
        </section>
      </div>

      <BookDetailsDialog
        key={`${book.id}-${book.updatedAt}`}
        book={book}
        collections={collections}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </main>
  );
}

function MetadataCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <dt className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="*:size-4">{icon}</span>
        {label}
      </dt>
      <dd className="mt-2 font-medium">{value}</dd>
    </div>
  );
}

function BookDetailsDialog({
  book,
  collections,
  open,
  onOpenChange,
}: {
  book: BookDetails;
  collections: CollectionOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const collectionId = useId();
  const dimensionId = useId();
  const [title, setTitle] = useState(book.title);
  const [description, setDescription] = useState(book.description);
  const [selectedCollectionId, setSelectedCollectionId] = useState(
    book.collection.id,
  );
  const [dimension, setDimension] = useState(book.dimension);
  const { call: updateBook, loading } = useServerAction(
    updateBookDetailsAction,
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await updateBook(book.id, {
      title,
      description,
      collectionId: selectedCollectionId,
      dimension,
    });
    if (result) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit book details</DialogTitle>
          <DialogDescription>
            Update the book title, description, collection, and size.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor={titleId}>Title</Label>
            <Input
              id={titleId}
              autoFocus
              required
              maxLength={100}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={descriptionId}>Description</Label>
            <Textarea
              id={descriptionId}
              maxLength={1000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={collectionId}>Collection</Label>
            <Select
              value={selectedCollectionId}
              onValueChange={(value) => {
                if (value) setSelectedCollectionId(value);
              }}
            >
              <SelectTrigger id={collectionId} className="w-full">
                <SelectValue placeholder="Choose a collection" />
              </SelectTrigger>
              <SelectContent align="start">
                {collections.map((collection) => (
                  <SelectItem key={collection.id} value={collection.id}>
                    {collection.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={dimensionId}>Book size</Label>
            <Select
              value={dimension}
              onValueChange={(value) => {
                if (isBookDimension(value)) setDimension(value);
              }}
            >
              <SelectTrigger id={dimensionId} className="w-full">
                <SelectValue placeholder="Choose a size" />
              </SelectTrigger>
              <SelectContent align="start">
                {bookDimensionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.dimensions} ({option.label})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <LoaderCircle className="animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}
