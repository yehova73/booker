declare module "@blex41/word-search" {
  type WordSearchPathPoint = {
    x: number;
    y: number;
  };

  type WordSearchWord = {
    word: string;
    clean: string;
    path: WordSearchPathPoint[];
  };

  type WordSearchOptions = {
    cols: number;
    rows: number;
    dictionary: string[];
    maxWords: number;
    upperCase?: boolean;
    backwardsProbability?: number;
  };

  class WordSearch {
    constructor(options: WordSearchOptions);
    grid: string[][];
    words: WordSearchWord[];
  }

  export = WordSearch;
}
