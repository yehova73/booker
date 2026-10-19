"use client";

import Link from "next/link";
import Image from "next/image";
import { BookOpen, MoreHorizontal, Trash2 } from "lucide-react";
import {
  bookDimensionOptions,
  type BookDimension,
} from "@/lib/book-dimensions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type BookCardData = {
  id: string;
  title: string;
  description: string;
  dimension: BookDimension;
  coverUrl: string | null;
};

export type BookCollectionData = {
  id: string;
  title: string;
  color: string;
};

export function BookCard({
  book,
  collection,
  onEdit,
  onDelete,
}: {
  book: BookCardData;
  collection: BookCollectionData;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const dimension = bookDimensionOptions.find(
    (option) => option.value === book.dimension,
  );

  return (
    <article className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="relative">
        <Link
          href={`/dashboard/book/${book.id}`}
          aria-label={`View ${book.title}`}
          className="relative flex h-64 items-center justify-center"
          style={{ backgroundColor: `${collection.color}22` }}
        >
          {book.coverUrl ? (
            <Image
              alt={`Cover artwork for ${book.title}`}
              className="object-cover"
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
              src={book.coverUrl}
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
              <BookOpen
                aria-hidden="true"
                className="size-8 text-muted-foreground/50"
              />
              <span className="line-clamp-3 font-medium">{book.title}</span>
            </div>
          )}
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
              <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
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
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1.5 truncate">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: collection.color }}
            />
            <span className="truncate">{collection.title}</span>
          </span>
          <span className="shrink-0">
            {dimension?.dimensions} · {dimension?.label}
          </span>
        </div>
      </Link>
    </article>
  );
}
