export const bookDimensionOptions = [
  { value: "letter", label: "Letter Size", dimensions: '8.5" × 11"' },
  { value: "paperback", label: "Standard Paperback", dimensions: '6" × 9"' },
  { value: "square", label: "Square Activity Book", dimensions: '8.25" × 8.25"' },
] as const;

export type BookDimension =
  (typeof bookDimensionOptions)[number]["value"];

export function isBookDimension(value: unknown): value is BookDimension {
  return (
    typeof value === "string" &&
    bookDimensionOptions.some((option) => option.value === value)
  );
}
