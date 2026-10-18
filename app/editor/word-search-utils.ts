import type { WordSearchPlacement } from "./components/editor-types";

export type WordSearchGenerationOptions = {
  cols: number;
  rows: number;
  dictionary: string[];
  maxWords: number;
  pageCount: number;
};

export type GeneratedWordSearch = {
  grid: string[][];
  words: WordSearchPlacement[];
};

export function generateWordSearches(
  options: WordSearchGenerationOptions,
): Promise<GeneratedWordSearch[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./word-search.worker.ts", import.meta.url),
      { type: "module" },
    );
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      worker.terminate();
      callback();
    };
    worker.onmessage = (event: MessageEvent<WordSearchWorkerResponse>) => {
      const results = event.data.results;
      if (event.data.error) {
        finish(() => reject(new Error(event.data.error)));
      } else if (results && results.length === options.pageCount) {
        finish(() => resolve(results));
      } else {
        finish(() =>
          reject(new Error("Word Search generation returned an invalid result.")),
        );
      }
    };
    worker.onerror = (event) => {
      event.preventDefault();
      finish(() =>
        reject(new Error(event.message || "Word Search generation failed.")),
      );
    };
    worker.onmessageerror = () => {
      finish(() =>
        reject(new Error("Word Search generation returned unreadable data.")),
      );
    };
    worker.postMessage(options);
  });
}

type WordSearchWorkerResponse = {
  results?: GeneratedWordSearch[];
  error?: string;
};
