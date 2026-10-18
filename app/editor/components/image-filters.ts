import type { ImageFilterSettings } from "./editor-types";

export function buildImageFilter(filters: ImageFilterSettings) {
  return [
    `brightness(${filters.brightness}%)`,
    `contrast(${filters.contrast}%)`,
    `saturate(${filters.saturation}%)`,
    `grayscale(${filters.grayscale}%)`,
    `sepia(${filters.sepia}%)`,
    `blur(${filters.blur}px)`,
    `hue-rotate(${filters.hueRotation}deg)`,
  ].join(" ");
}
