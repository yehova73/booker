import type { TrimPreset } from "./editor-types";

export const PAGE_PIXEL_DIMENSIONS: Record<
  TrimPreset,
  { width: number; height: number }
> = {
  letter: { width: 816, height: 1056 },
  paperback: { width: 576, height: 864 },
  square: { width: 792, height: 792 },
};

export function percentageToPixels(value: number, totalPixels: number) {
  return Math.round((value / 100) * totalPixels);
}

export function pixelsToPercentage(value: number, totalPixels: number) {
  return (value / totalPixels) * 100;
}
