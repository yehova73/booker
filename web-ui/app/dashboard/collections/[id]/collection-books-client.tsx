"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  LoaderCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { BookCard, type BookCardData } from "@/components/book-card";
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
import useServerAction from "@/hooks/use-server-action";
import { deleteBookAction } from "@/actions/books/books";

type CollectionData = {
  id: string;
  title: string;
  description: string;
  color: string;
};

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
        <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              collection={collection}
              onEdit={() => openEditDialog(book)}
              onDelete={() => setDeletingBook(book)}
            />
          ))}
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
