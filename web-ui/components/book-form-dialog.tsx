"use client";

import { createBookAction, updateBookAction } from "@/actions/books/books";
import type { BookCardData } from "@/components/book-card";
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
import { Textarea } from "@/components/ui/textarea";
import useServerAction from "@/hooks/use-server-action";
import { type BookDimension } from "@/lib/book-dimensions";
import { LoaderCircle } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

type BookInput = Omit<BookCardData, "id" | "coverUrl">;

export function BookFormDialog({
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

  async function submit(event: FormEvent<HTMLFormElement>) {
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
              maxLength={4000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="A short description of the book."
            />
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
