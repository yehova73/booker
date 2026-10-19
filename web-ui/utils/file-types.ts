export const maxImageUploadSize = 20 * 1024 * 1024;

export const supportedImageTypes = [
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export function isSupportedImageType(
  value: string,
): value is (typeof supportedImageTypes)[number] {
  return supportedImageTypes.some((contentType) => contentType === value);
}
