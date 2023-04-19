export type TCrossword = {
  version: string;
  kind: string[];
  title: string;
  copyright: string;
  author: string;
  dimensions: Dimensions;
  puzzle: string[][];
  solution: (string | null)[][];
  clues: Clues;
};

export type Dimensions = {
  width: number;
  height: number;
};

export type Clues = {
  Across: Clue[];
  Down: Clue[];
};

export interface Clue {
  number: string;
  cells?: number[][];
  clue: string;
}

export type Game = {
  players: [string];
  play_state: "PLAYING";
  game_type: "SOLO" | "FRIENDLY";
  crossword: TCrossword;
  game_state?: Record<string, GameState>;
};

export type GameState = {
  currentCell: { x: number; y: number };
  direction: "Across" | "Down";
  solution: (string | null)[][];
};
