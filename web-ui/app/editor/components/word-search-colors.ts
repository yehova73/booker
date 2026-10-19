import type { WordSearchPlacement } from "./editor-types";

export function withWordSearchSolutionColors(words: WordSearchPlacement[]) {
  return words.map((word, index) => ({
    ...word,
    solutionColor: saturatedHslToHex((index * 137.508) % 360),
  }));
}

export function getWordSearchSolutionCellColors(
  words: WordSearchPlacement[],
) {
  const colorsByCell = new Map<string, string[]>();
  for (const word of words) {
    const color = word.solutionColor ?? "#2b4736";
    for (const { x, y } of word.path) {
      const key = `${x}-${y}`;
      const colors = colorsByCell.get(key) ?? [];
      if (!colors.includes(color)) colors.push(color);
      colorsByCell.set(key, colors);
    }
  }
  return colorsByCell;
}

export function getWordSearchSolutionCellBackground(
  colors: string[] | undefined,
) {
  if (!colors?.length) return undefined;
  if (colors.length === 1) return colors[0];
  const stopSize = 100 / colors.length;
  const stops = colors
    .map(
      (color, index) =>
        `${color} ${index * stopSize}% ${(index + 1) * stopSize}%`,
    )
    .join(", ");
  return `conic-gradient(${stops})`;
}

function saturatedHslToHex(hue: number) {
  const saturation = 0.82;
  const lightness = 0.26;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const section = hue / 60;
  const secondary = chroma * (1 - Math.abs((section % 2) - 1));
  const [red, green, blue] =
    section < 1
      ? [chroma, secondary, 0]
      : section < 2
        ? [secondary, chroma, 0]
        : section < 3
          ? [0, chroma, secondary]
          : section < 4
            ? [0, secondary, chroma]
            : section < 5
              ? [secondary, 0, chroma]
              : [chroma, 0, secondary];
  const offset = lightness - chroma / 2;
  return `#${[red, green, blue]
    .map((channel) =>
      Math.round((channel + offset) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}
