import { THEMES } from "./word-search";

// Two extra Story-Mode game types, generated entirely from original word lists
// (Wordsy) and the existing themed banks (Categories). Deterministic from a seed
// so a level reproduces on demand, but Story Mode passes a random seed each play
// for variety at a fixed difficulty.

const rng = (seed: number) => {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0xffffffff;
  };
};
const shuffle = <T>(arr: T[], rand: () => number): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ---- Wordsy (guess the hidden word) --------------------------------------
// Common everyday words by length, used as the answer pool. Guesses aren't
// dictionary-validated (any word of the right length is accepted), so no large
// dictionary needs to ship.
const WORDSY_WORDS: Record<number, string[]> = {
  4: [
    "TIME", "YEAR", "GIFT", "GAME", "WORD", "PLAY", "HAND", "PART",
    "CITY", "TREE", "BOOK", "DOOR", "ROAD", "FIRE", "SNOW", "RAIN", "STAR",
    "MOON", "SHIP", "BIRD", "FISH", "GOLD", "BLUE", "LIME", "MINT", "SALT",
    "SOUP", "CAKE", "MILK", "CORN", "BEAN", "RICE", "LAMP", "DESK", "SOFA",
    "RING", "COIN", "KEYS", "BELL", "DRUM", "FLAG", "KITE", "BOAT", "TRAM",
    "WOLF", "BEAR", "DEER", "GOAT", "FROG", "SEAL", "CRAB", "MOTH", "WASP",
    "LEAF", "ROSE", "FERN", "PALM", "ROCK", "SAND", "WAVE", "WIND", "GATE",
    "PATH", "HILL", "LAKE", "CAVE", "DUNE", "REEF", "GLEN", "PEAK", "MAZE",
  ],
  5: [
    "APPLE", "BREAD", "CHAIR", "DANCE", "EAGLE", "FLAME", "GRAPE", "HOUSE",
    "IVORY", "JELLY", "KOALA", "LEMON", "MANGO", "NIGHT", "OCEAN", "PIANO",
    "QUILT", "RIVER", "STONE", "TIGER", "UNITE", "VOICE", "WATER", "YACHT",
    "ZEBRA", "BEACH", "CLOUD", "DREAM", "EARTH", "FRUIT", "GLASS", "HONEY",
    "LIGHT", "MUSIC", "NURSE", "OLIVE", "PEACH", "ROBOT", "SUGAR", "TABLE",
    "TRAIN", "PLANT", "SMILE", "SPICE", "STORM", "SWORD", "TOWER", "WHALE",
    "WHEAT", "BERRY", "CANDY", "CHESS", "CLOCK", "CROWN", "DAISY", "FENCE",
    "FIELD", "FLOUR", "FROST", "GHOST", "GIANT", "HEART", "JUICE", "KNIFE",
    "MAPLE", "MEDAL", "MONEY", "MOUSE", "PARTY", "PEARL", "PILOT", "PIZZA",
    "QUEEN", "RADIO", "SHARK", "SHEEP", "SHINE", "SHIRT", "SHORE", "SNAKE",
  ],
  6: [
    "ORANGE", "GARDEN", "PLANET", "CASTLE", "FOREST", "ISLAND", "MARKET",
    "PENCIL", "ROCKET", "SILVER", "WINTER", "SUMMER", "SPRING", "BREEZE",
    "CANDLE", "CARPET", "CHERRY", "COFFEE", "COUPLE", "DINNER", "DRAGON",
    "FLOWER", "GALAXY", "GUITAR", "HAMMER", "JACKET", "JUNGLE", "KETTLE",
    "LADDER", "LETTER", "MEADOW", "MIRROR", "MONKEY", "NEEDLE", "ORCHID",
    "PALACE", "PARROT", "PEPPER", "PIGEON", "PILLOW", "POTATO", "PUZZLE",
    "RABBIT", "RIBBON", "SADDLE", "SALMON", "SCHOOL", "SHADOW", "SIGNAL",
    "SPIDER", "SPONGE", "SQUARE", "STREAM", "SUNSET", "TEMPLE", "TENNIS",
    "THRONE", "TICKET", "TUNNEL", "TURTLE", "VALLEY", "VIOLET", "WALNUT",
    "WINDOW", "YELLOW", "ZIPPER", "BASKET", "BOTTLE", "BRIDGE", "BUTTON",
  ],
};

export type WordsyPuzzle = {
  answer: string;
  length: number;
  maxGuesses: number;
};

export const generateWordsy = (
  config: { length: number; maxGuesses: number },
  seed: number
): WordsyPuzzle => {
  const rand = rng(seed);
  const pool = WORDSY_WORDS[config.length] ?? WORDSY_WORDS[5];
  const answer = pool[Math.floor(rand() * pool.length)];
  return { answer, length: config.length, maxGuesses: config.maxGuesses };
};

// Per-guess feedback: 2 = correct spot, 1 = in word wrong spot, 0 = not in word.
// Standard two-pass scoring so duplicate letters resolve correctly.
export const scoreWordsyGuess = (guess: string, answer: string): number[] => {
  const n = answer.length;
  const res = new Array(n).fill(0);
  const counts: Record<string, number> = {};
  for (let i = 0; i < n; i++) counts[answer[i]] = (counts[answer[i]] || 0) + 1;
  for (let i = 0; i < n; i++) {
    if (guess[i] === answer[i]) {
      res[i] = 2;
      counts[guess[i]]--;
    }
  }
  for (let i = 0; i < n; i++) {
    if (res[i] === 0 && counts[guess[i]] > 0) {
      res[i] = 1;
      counts[guess[i]]--;
    }
  }
  return res;
};

// ---- Categories (group 16 words into 4 sets) ------------------------------
export type CategoryGroup = { category: string; words: string[] };
export type CategoriesPuzzle = {
  groups: CategoryGroup[]; // 4 groups of 4
  tiles: string[]; // 16 words, shuffled
  mistakes: number; // wrong guesses allowed
};

// Build a puzzle from four distinct themed banks: pick 4 themes, 4 short,
// grid-friendly words from each (deduped across groups so a word belongs to
// exactly one category). Trickiness biases toward themes that could plausibly
// share members, but we still guarantee each answer word sits in one group only.
export const generateCategories = (
  config: { mistakes: number; trickiness: number },
  seed: number
): CategoriesPuzzle => {
  const rand = rng(seed);
  const themeNames = shuffle(Object.keys(THEMES), rand);
  const used = new Set<string>();
  const groups: CategoryGroup[] = [];
  for (const name of themeNames) {
    if (groups.length >= 4) break;
    // Short-ish words read cleanly on tiles; unique across the whole puzzle.
    const pool = shuffle(
      THEMES[name].filter((w) => w.length <= 8 && !used.has(w)),
      rand
    );
    if (pool.length < 4) continue;
    const words = pool.slice(0, 4);
    words.forEach((w) => used.add(w));
    groups.push({ category: name, words });
  }
  const tiles = shuffle(
    groups.flatMap((g) => g.words),
    rand
  );
  return { groups, tiles, mistakes: config.mistakes };
};
