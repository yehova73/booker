"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { Check, ImageIcon } from "lucide-react";

import { listUserFilesAction, type UserFileLibraryItem } from "@/actions/files";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function UploadsDialog({
  open,
  onOpenChange,
  onAddImage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddImage: (fileId: string, src: string, alt: string) => void;
}) {
  const [files, setFiles] = useState<UserFileLibraryItem[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isLoading, startLoading] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let active = true;
    startLoading(async () => {
      try {
        const result = await listUserFilesAction();
        if (!active) return;
        if (result.status !== "ok" || !result.data) {
          setError(
            result.message?.description ??
              result.message?.title ??
              "Your uploads could not be loaded.",
          );
          return;
        }
        setError(null);
        setFiles(result.data.files);
        setSelectedFileId(null);
      } catch (loadError: unknown) {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Your uploads could not be loaded.",
        );
      }
    });

    return () => {
      active = false;
    };
  }, [open]);

  const selectedFile = files.find((file) => file.id === selectedFileId);

  function addSelectedImage() {
    if (!selectedFile) return;
    if (!selectedFile.id.trim() || !selectedFile.storageKey.trim()) {
      setError("This upload is missing its saved file reference.");
      return;
    }

    onAddImage(selectedFile.id, selectedFile.src, selectedFile.originalName);
    onOpenChange(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setSelectedFileId(null);
      setError(null);
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-[#edf0ec] px-6 py-5">
          <DialogTitle className="text-[#34463a]">Your uploads</DialogTitle>
          <DialogDescription>
            Choose an image to add to the current page. Existing uploads are
            reused without uploading them again.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div
              aria-live="polite"
              className="flex min-h-44 items-center justify-center text-sm text-[#89958b]"
            >
              Loading your uploads...
            </div>
          ) : error ? (
            <p
              aria-live="polite"
              className="rounded-lg bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </p>
          ) : files.length === 0 ? (
            <div className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#d9e1d8] bg-[#f8faf7] text-center">
              <ImageIcon className="size-6 text-[#8a9a8a]" />
              <p className="text-sm font-medium text-[#59685d]">
                No uploaded images yet
              </p>
              <p className="text-xs text-[#89958b]">
                Images you upload in the editor will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {files.map((file) => {
                const selected = file.id === selectedFileId;
                return (
                  <button
                    aria-pressed={selected}
                    className={`overflow-hidden rounded-xl border text-left transition ${
                      selected
                        ? "border-[#79977d] ring-2 ring-[#dce8dc]"
                        : "border-[#e5e9e3] hover:border-[#b8c7b8]"
                    }`}
                    key={file.id}
                    onClick={() => {
                      setSelectedFileId(file.id);
                      setError(null);
                    }}
                    type="button"
                  >
                    <span className="relative block aspect-square bg-[#f2f3ef]">
                      <Image
                        alt={file.originalName}
                        className="object-contain"
                        fill
                        sizes="(max-width: 640px) 50vw, 25vw"
                        src={file.src}
                        unoptimized
                      />
                      {selected && (
                        <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-[#416c4b] text-white shadow">
                          <Check className="size-3.5" />
                        </span>
                      )}
                    </span>
                    <span className="block truncate px-2.5 pt-2 text-xs font-medium text-[#526056]">
                      {file.originalName}
                    </span>
                    <span className="block px-2.5 pb-2 pt-0.5 text-[10px] text-[#89958b]">
                      {formatFileSize(file.size)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="border-[#edf0ec]">
          <Button
            disabled={!selectedFile || isLoading || Boolean(error)}
            onClick={addSelectedImage}
            type="button"
          >
            Add image to page
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
