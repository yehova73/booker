"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type BookNameEditorProps = {
  bookName: string;
  onBookNameChange: (bookName: string) => void;
};

export function BookNameEditor({
  bookName,
  onBookNameChange,
}: BookNameEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(bookName);

  if (isEditing) {
    return (
      <Input
        aria-label="Book name"
        autoFocus
        className="h-8 w-[140px] border-[#e4e8e3] bg-white text-xs"
        onBlur={(event) => {
          const nextName = event.currentTarget.value.trim();
          if (nextName) {
            onBookNameChange(nextName);
            setDraftName(nextName);
          } else {
            setDraftName(bookName);
          }
          setIsEditing(false);
        }}
        onChange={(event) => setDraftName(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        value={draftName}
      />
    );
  }

  return (
    <Button
      aria-label={`Rename book: ${bookName}`}
      className="h-8 w-[140px] min-w-0 justify-start gap-1.5 px-2 text-xs text-[#424e47]"
      onClick={() => {
        setDraftName(bookName);
        setIsEditing(true);
      }}
      title={bookName}
      type="button"
      variant="ghost"
    >
      <BookOpen className="size-4 shrink-0" />
      <span className="truncate">{bookName}</span>
    </Button>
  );
}
