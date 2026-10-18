"use client";

import { useId, useState } from "react";
import Link from "next/link";
import {
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
import useServerAction from "@/hooks/use-server-action";
import {
  createCollectionAction,
  deleteCollectionAction,
  updateCollectionAction,
} from "@/actions/collections/collections";

export type CollectionCardData = {
  id: string;
  title: string;
  color: string;
  description: string;
};

type CollectionInput = Omit<CollectionCardData, "id">;

export function CollectionsClient({
  collections,
}: {
  collections: CollectionCardData[];
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingCollection, setEditingCollection] =
    useState<CollectionCardData | null>(null);
  const [deletingCollection, setDeletingCollection] =
    useState<CollectionCardData | null>(null);
  const { call: deleteCollection, loading: isDeleting } = useServerAction(
    deleteCollectionAction,
  );

  function openCreateDialog() {
    setEditingCollection(null);
    setFormOpen(true);
  }

  function openEditDialog(collection: CollectionCardData) {
    setEditingCollection(collection);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deletingCollection) return;
    const result = await deleteCollection(deletingCollection.id);
    if (result) {
      setDeletingCollection(null);
    }
  }

  return (
    <div className="p-6">
      <DashboardPageHeader
        title="Collections"
        description="Organize your books into collections."
        className="mb-8"
        actions={
          <Button type="button" onClick={openCreateDialog}>
            <Plus />
            New collection
          </Button>
        }
      />

      {collections.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
          <h2 className="text-lg font-medium">No collections yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a collection to group related books together.
          </p>
          <Button
            type="button"
            className="mt-4"
            onClick={openCreateDialog}
          >
            <Plus />
            New collection
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <article
              key={collection.id}
              className="overflow-hidden rounded-xl border bg-card shadow-sm"
            >
              <div
                className="relative"
              >
                <Link
                  href={`/dashboard/collections/${collection.id}`}
                  aria-label={`Open ${collection.title} collection`}
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
                          aria-label={`Actions for ${collection.title}`}
                        />
                      }
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem
                        onClick={() => openEditDialog(collection)}
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeletingCollection(collection)}
                      >
                        <Trash2 />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <Link
                href={`/dashboard/collections/${collection.id}`}
                className="block space-y-2 p-4"
              >
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: collection.color }}
                  />
                  <h2 className="truncate font-medium">{collection.title}</h2>
                </div>
                <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
                  {collection.description || "No description yet."}
                </p>
              </Link>
            </article>
          ))}
        </div>
      )}

      <CollectionFormDialog
        key={formOpen ? (editingCollection?.id ?? "new") : "closed"}
        open={formOpen}
        collection={editingCollection}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingCollection(null);
        }}
      />

      <Dialog
        open={deletingCollection !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeletingCollection(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete collection?</DialogTitle>
            <DialogDescription>
              {deletingCollection
                ? `“${deletingCollection.title}” will be permanently deleted.`
                : "This collection will be permanently deleted."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeletingCollection(null)}
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
              Delete collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CollectionFormDialog({
  open,
  collection,
  onOpenChange,
}: {
  open: boolean;
  collection: CollectionCardData | null;
  onOpenChange: (open: boolean) => void;
}) {
  const titleId = useId();
  const colorId = useId();
  const descriptionId = useId();
  const [title, setTitle] = useState(collection?.title ?? "");
  const [color, setColor] = useState(collection?.color ?? "#dbeafe");
  const [description, setDescription] = useState(
    collection?.description ?? "",
  );
  const { call: createCollection, loading: isCreating } = useServerAction(
    createCollectionAction,
  );
  const { call: updateCollection, loading: isUpdating } = useServerAction(
    updateCollectionAction,
  );
  const isSaving = isCreating || isUpdating;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: CollectionInput = { title, color, description };
    const result = collection
      ? await updateCollection(collection.id, input)
      : await createCollection(input);
    if (result) {
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {collection ? "Edit collection" : "New collection"}
          </DialogTitle>
          <DialogDescription>
            Add a title, color, and description for this collection.
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
              placeholder="e.g. Nature stories"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={colorId}>Color</Label>
            <div className="flex items-center gap-3">
              <Input
                id={colorId}
                type="color"
                className="h-10 w-14 cursor-pointer p-1"
                value={color}
                onChange={(event) => setColor(event.target.value)}
              />
              <span className="text-sm text-muted-foreground">{color}</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={descriptionId}>Description</Label>
            <Textarea
              id={descriptionId}
              maxLength={500}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What kinds of books belong here?"
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
              {collection ? "Save changes" : "Create collection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
