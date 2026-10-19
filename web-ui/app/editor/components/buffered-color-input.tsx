"use client";

import { useState, type ComponentProps } from "react";

import { Input } from "@/components/ui/input";

type BufferedColorInputProps = Omit<
  ComponentProps<typeof Input>,
  "onBlur" | "onChange" | "type" | "value"
> & {
  onCommit: (value: string) => void;
  value: string;
};

export function BufferedColorInput({
  onCommit,
  value,
  ...props
}: BufferedColorInputProps) {
  const [localColor, setLocalColor] = useState({ value, draft: value });
  const draft = localColor.value === value ? localColor.draft : value;

  return (
    <Input
      {...props}
      onBlur={() => {
        if (draft !== value) onCommit(draft);
      }}
      onChange={(event) =>
        setLocalColor({ value, draft: event.currentTarget.value })
      }
      type="color"
      value={draft}
    />
  );
}
