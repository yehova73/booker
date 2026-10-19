"use client";

import {
  createFileUploadAction,
  deleteFilesAction,
} from "@/actions/files";
import { isSupportedImageType, maxImageUploadSize } from "./file-types";

export async function uploadFileToS3(file: File) {
  if (!isSupportedImageType(file.type)) {
    throw new Error("Choose a JPEG, PNG, WebP, GIF, or AVIF image.");
  }
  if (file.size < 1 || file.size > maxImageUploadSize) {
    throw new Error("Images must be no larger than 20 MiB.");
  }

  const response = await createFileUploadAction({
    fileName: file.name,
    contentType: file.type,
    size: file.size,
  });
  if (response.status !== "ok" || !response.data) {
    throw new Error(response.message?.description ?? response.message?.title ?? "Could not prepare this upload.");
  }

  try {
    const uploadResponse = await fetch(response.data.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!uploadResponse.ok) {
      throw new Error(
        `Image upload failed with HTTP ${uploadResponse.status}.`,
      );
    }
  } catch (uploadError) {
    const cleanup = await deleteFilesAction([response.data.fileId]);
    if (cleanup.status !== "ok") {
      throw new Error(
        `${uploadError instanceof Error ? uploadError.message : "Image upload failed."} ${cleanup.message?.description ?? cleanup.message?.title ?? "The temporary file could not be removed."}`,
      );
    }
    throw uploadError;
  }

  return {
    fileId: response.data.fileId,
    src: response.data.viewUrl,
  };
}
