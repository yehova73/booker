"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { BookOpen, LoaderCircle, Plus, Trash2 } from "lucide-react";
import {
  createBookAction,
  deleteBookAction,
} from "@/actions/books/books";
import {
  BookCard,
  type BookCardData,
  type BookCollectionData,
} from "@/components/book-card";
import { BookFormDialog } from "@/components/book-form-dialog";
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

type EbookCardData = BookCardData & { collection: BookCollectionData };

type CollectionOption = {
  id: string;
  title: string;
};

export function EbooksClient({
  books,
  collections,
}: {
  books: EbookCardData[];
  collections: CollectionOption[];
}) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<EbookCardData | null>(null);
  const [deletingBook, setDeletingBook] = useState<EbookCardData | null>(null);
  const { call: deleteBook, loading: isDeleting } =
    useServerAction(deleteBookAction);

  async function confirmDelete() {
    if (!deletingBook) return;
    const result = await deleteBook(deletingBook.collection.id, deletingBook.id);
    if (result) {
      setDeletingBook(null);
    }
  }

  return (
    <main className="p-6">
      <DashboardPageHeader
        title="Ebooks"
        description="Browse all the books in your account."
        className="mb-8"
        actions={
          <Button type="button" onClick={() => setCreateDialogOpen(true)}>
            <Plus />
            New book
          </Button>
        }
      />

      {books.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
          <BookOpen
            aria-hidden="true"
            className="size-8 text-muted-foreground/50"
          />
          <h2 className="mt-3 text-lg font-medium">No books yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a book to start building your library.
          </p>
          <Button
            type="button"
            className="mt-4"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus />
            New book
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              collection={book.collection}
              onEdit={() => setEditingBook(book)}
              onDelete={() => setDeletingBook(book)}
            />
          ))}
        </div>
      )}

      <CreateBookDialog
        open={createDialogOpen}
        collections={collections}
        onOpenChange={setCreateDialogOpen}
      />
      <BookFormDialog
        key={editingBook?.id ?? "closed"}
        open={editingBook !== null}
        collectionId={editingBook?.collection.id ?? ""}
        book={editingBook}
        onOpenChange={(open) => {
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
    </main>
  );
}

function CreateBookDialog({
  open,
  collections,
  onOpenChange,
}: {
  open: boolean;
  collections: CollectionOption[];
  onOpenChange: (open: boolean) => void;
}) {
  const collectionIdId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const dimensionId = useId();
  const [collectionId, setCollectionId] = useState(collections[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dimension, setDimension] = useState<BookDimension>("paperback");
  const { call: createBook, loading: isCreating } =
    useServerAction(createBookAction);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!collectionId) return;

    const result = await createBook(collectionId, {
      title,
      description,
      dimension,
    });
    if (result) {
      onOpenChange(false);
      setTitle("");
      setDescription("");
      setDimension("paperback");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New book</DialogTitle>
          <DialogDescription>
            Choose a collection and enter the book details.
          </DialogDescription>
        </DialogHeader>

        {collections.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create a collection before adding a book.
            </p>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
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
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor={collectionIdId}>Collection</Label>
              <Select
                value={collectionId}
                onValueChange={(value) => setCollectionId(value ?? "")}
              >
                <SelectTrigger id={collectionIdId} className="w-full">
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
                disabled={isCreating}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating || !collectionId}
              >
                {isCreating && <LoaderCircle className="animate-spin" />}
                Create book
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
