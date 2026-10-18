import animals from "./animals";
import nature from "./nature";
import space from "./space";

export type WordSearchDictionary = {
  id: string;
  name: string;
  words: string[];
};

export const WORD_SEARCH_DICTIONARIES: WordSearchDictionary[] = [
  { id: "nature", name: "Nature", words: nature },
  { id: "animals", name: "Animals", words: animals },
  { id: "space", name: "Space", words: space },
];
