"use client";

import { useId, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Image as ImageIcon,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useServerAction from "@/hooks/use-server-action";
import {
  bookDimensionOptions,
  isBookDimension,
  type BookDimension,
} from "@/lib/book-dimensions";
import {
  createBookAction,
  deleteBookAction,
  updateBookAction,
} from "@/actions/books/books";

type BookCardData = {
  id: string;
  title: string;
  description: string;
  dimension: BookDimension;
};

type CollectionData = {
  id: string;
  title: string;
  description: string;
  color: string;
};

type BookInput = Omit<BookCardData, "id">;

export function CollectionBooksClient({
  collection,
  books,
}: {
  collection: CollectionData;
  books: BookCardData[];
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<BookCardData | null>(null);
  const [deletingBook, setDeletingBook] = useState<BookCardData | null>(null);
  const { call: deleteBook, loading: isDeleting } =
    useServerAction(deleteBookAction);

  function openCreateDialog() {
    setEditingBook(null);
    setFormOpen(true);
  }

  function openEditDialog(book: BookCardData) {
    setEditingBook(book);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deletingBook) return;
    const result = await deleteBook(collection.id, deletingBook.id);
    if (result) {
      setDeletingBook(null);
    }
  }

  return (
    <div className="p-6">
      <DashboardPageHeader
        pre={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Back to collections"
            render={<Link href="/dashboard/collections" />}
          >
            <ArrowLeft />
          </Button>
        }
        title={collection.title}
        description={collection.description || "Books in this collection."}
        className="mb-8"
        actions={
          <Button type="button" onClick={openCreateDialog}>
            <Plus />
            New book
          </Button>
        }
      />

      {books.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
          <h2 className="text-lg font-medium">No books yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a book to start building this collection.
          </p>
          <Button type="button" className="mt-4" onClick={openCreateDialog}>
            <Plus />
            New book
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => {
            const dimension = bookDimensionOptions.find(
              (option) => option.value === book.dimension,
            );

            return (
              <article
                key={book.id}
                className="overflow-hidden rounded-xl border bg-card shadow-sm"
              >
                <div className="relative">
                  <Link
                    href={`/dashboard/book/${book.id}`}
                    aria-label={`View ${book.title}`}
                    className="flex aspect-video items-center justify-center"
                    style={{ backgroundColor: `${collection.color}22` }}
                  >
                    <ImageIcon
                      aria-hidden="true"
                      className="size-8 text-muted-foreground/50"
                    />
                  </Link>
                  <div className="absolute right-3 top-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon-sm"
                            aria-label={`Actions for ${book.title}`}
                          />
                        }
                      >
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => openEditDialog(book)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeletingBook(book)}
                        >
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <Link
                  href={`/dashboard/book/${book.id}`}
                  className="block space-y-2 p-4"
                >
                  <h2 className="truncate font-medium">{book.title}</h2>
                  <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
                    {book.description || "No description yet."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {dimension?.dimensions} · {dimension?.label}
                  </p>
                </Link>
              </article>
            );
          })}
        </div>
      )}

      <BookFormDialog
        key={formOpen ? (editingBook?.id ?? "new") : "closed"}
        open={formOpen}
        collectionId={collection.id}
        book={editingBook}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingBook(null);
        }}
      />

      <Dialog
        open={deletingBook !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeletingBook(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete book?</DialogTitle>
            <DialogDescription>
              {deletingBook
                ? `“${deletingBook.title}” will be permanently deleted.`
                : "This book will be permanently deleted."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeletingBook(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={confirmDelete}
            >
              {isDeleting ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Trash2 />
              )}
              Delete book
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BookFormDialog({
  open,
  collectionId,
  book,
  onOpenChange,
}: {
  open: boolean;
  collectionId: string;
  book: BookCardData | null;
  onOpenChange: (open: boolean) => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dimensionId = useId();
  const [title, setTitle] = useState(book?.title ?? "");
  const [description, setDescription] = useState(book?.description ?? "");
  const [dimension, setDimension] = useState<BookDimension>(
    book?.dimension ?? "paperback",
  );
  const { call: createBook, loading: isCreating } =
    useServerAction(createBookAction);
  const { call: updateBook, loading: isUpdating } =
    useServerAction(updateBookAction);
  const isSaving = isCreating || isUpdating;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: BookInput = { title, description, dimension };
    const result = book
      ? await updateBook(collectionId, book.id, input)
      : await createBook(collectionId, input);
    if (result) {
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{book ? "Edit book" : "New book"}</DialogTitle>
          <DialogDescription>
            Set the book title, description, and page dimensions.
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
              placeholder="e.g. The Garden Adventures"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={descriptionId}>Description</Label>
            <Textarea
              id={descriptionId}
              maxLength={1000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="A short description of the book."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={dimensionId}>Dimensions</Label>
            <Select
              value={dimension}
              onValueChange={(value) => {
                if (isBookDimension(value)) setDimension(value);
              }}
            >
              <SelectTrigger id={dimensionId} className="w-full">
                <SelectValue placeholder="Choose dimensions" />
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
              disabled={isSaving}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <LoaderCircle className="animate-spin" />}
              {book ? "Save changes" : "Create book"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
