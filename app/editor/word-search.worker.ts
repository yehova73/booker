import WordSearch from "@blex41/word-search";

import type {
  GeneratedWordSearch,
  WordSearchGenerationOptions,
} from "./word-search-utils";

self.addEventListener(
  "message",
  (event: MessageEvent<WordSearchGenerationOptions>) => {
    try {
      const { cols, rows, dictionary, maxWords, pageCount } = event.data;
      if (
        !Number.isInteger(cols) ||
        !Number.isInteger(rows) ||
        cols < 5 ||
        cols > 30 ||
        rows < 5 ||
        rows > 30 ||
        !Number.isInteger(maxWords) ||
        maxWords < 1 ||
        !Number.isInteger(pageCount) ||
        pageCount < 1 ||
        pageCount > 50
      ) {
        throw new Error("Word Search settings are outside the supported range.");
      }

      const usableWords = Array.from(
        new Set(
          dictionary
            .map((word) => word.replace(/[^a-z]/gi, "").toUpperCase())
            .filter((word) => word.length > 0 && word.length <= Math.max(cols, rows)),
        ),
      );
      if (usableWords.length === 0) {
        throw new Error(
          "The selected dictionary has no words that fit this grid. Edit the dictionary or make the grid larger.",
        );
      }

      const results = Array.from({ length: pageCount }, () => {
        const selectedWords = shuffle([...usableWords]).slice(
          0,
          Math.min(maxWords, usableWords.length),
        );
        let result: WordSearch | null = null;
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const candidate = new WordSearch({
            cols,
            rows,
            dictionary: selectedWords,
            maxWords: selectedWords.length,
            upperCase: true,
          });
          if (candidate.words.length > 0) {
            result = candidate;
            break;
          }
        }
        if (!result) {
          throw new Error(
            "No words could be placed in a generated grid. Try a larger grid or a different dictionary.",
          );
        }
        if (
          result.grid.length !== rows ||
          result.grid.some((row) => row.length !== cols)
        ) {
          throw new Error("Word Search generation returned an invalid grid.");
        }
        return {
          grid: result.grid,
          words: result.words,
        };
      });
      self.postMessage({ results: results satisfies GeneratedWordSearch[] });
    } catch (error) {
      self.postMessage({
        error:
          error instanceof Error
            ? error.message
            : "Word Search generation failed.",
      });
    }
  },
);

function shuffle(values: string[]) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
  return values;
}
