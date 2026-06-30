// Self-contained word-search generation + checking. Puzzles are generated on the
// client and stored inline in the game (gameState.__wordsearch) — same approach
// challenges use — so no content table / RPC / FK plumbing is needed and the
// whole mode ships over-the-air. Both players in a race share the one puzzle
// stored on the game, so it's identical for everyone.

export type Cell = { r: number; c: number };
export type Placement = { word: string; cells: Cell[] };
export type WordSearchPuzzle = {
  size: number;
  grid: string[][]; // fully filled with uppercase letters
  words: string[]; // the words to find (uppercase)
  placements: Placement[]; // where each word sits (for checking + the bot)
  theme: string;
};

// Themed banks keep puzzles coherent and give us "categories" for parity with
// trivia. Words are 3–8 letters, uppercase, no spaces.
// Themes for the word lists. Each pool is large so a given puzzle samples only a
// subset (see generateWordSearch) — the bigger the pool, the rarer a repeat of
// the same set of words. Keep every word ≤9 letters (A–Z only) so it fits the
// regular 9×9 grid as well as the hard 12×12 one.
const THEMES: Record<string, string[]> = {
  Animals: [
    "TIGER", "PANDA", "OTTER", "EAGLE", "MOOSE", "ZEBRA", "KOALA", "LEMUR",
    "BISON", "HORSE", "SHARK", "WHALE", "GECKO", "RAVEN", "FERRET", "WALRUS",
    "BADGER", "JAGUAR", "FALCON", "IGUANA", "BEAVER", "TURTLE", "COBRA", "LLAMA",
    "RHINO", "HYENA", "PUMA", "LYNX", "STOAT", "VIPER", "WEASEL",
    "MARMOT", "OCELOT", "PANTHER", "GIRAFFE", "DOLPHIN", "PENGUIN", "OSTRICH",
    "GORILLA", "MEERKAT", "ANTELOPE", "FLAMINGO", "HEDGEHOG",
  ],
  Food: [
    "BREAD", "MANGO", "OLIVE", "PASTA", "HONEY", "LEMON", "PEACH", "BACON",
    "PIZZA", "SALAD", "WAFFLE", "PEPPER", "CARROT", "WALNUT", "BANANA", "TOMATO",
    "GARLIC", "MUFFIN", "NOODLE", "PICKLE", "CHEESE", "BUTTER", "YOGURT", "CELERY",
    "GINGER", "ALMOND", "CASHEW", "RADISH", "PUMPKIN", "AVOCADO", "CABBAGE",
    "PRETZEL", "CRACKER", "OATMEAL", "PANCAKE", "SAUSAGE", "BISCUIT", "POPCORN",
  ],
  Travel: [
    "BEACH", "HOTEL", "TRAIN", "CABIN", "COAST", "RIVER", "TOKYO", "PARIS",
    "FLIGHT", "ISLAND", "DESERT", "CANYON", "JUNGLE", "AIRPORT", "PASSPORT",
    "HARBOR", "SAFARI", "VOYAGE", "RESORT", "TICKET", "LUGGAGE", "CRUISE",
    "BORDER", "EMBASSY", "TROPICS", "LAGOON", "SUMMIT", "VILLAGE", "CASTLE",
    "MARKET", "TEMPLE", "MUSEUM", "SHUTTLE", "TRANSIT", "JOURNEY",
  ],
  Sports: [
    "RUGBY", "TENNIS", "BOXING", "SKIING", "HOCKEY", "SOCCER", "GOLF", "RELAY",
    "SPRINT", "RACKET", "HELMET", "REFEREE", "STADIUM", "ARCHERY", "PADDLE",
    "DISCUS", "HURDLE", "ROWING", "CYCLING", "SKATING", "DIVING", "FENCING",
    "NETBALL", "CRICKET", "BOWLING", "JAVELIN", "MARATHON", "DRIBBLE", "GOALIE",
    "UMPIRE", "TROPHY", "JERSEY", "WHISTLE", "SURFING", "CLIMBING",
  ],
  Science: [
    "ATOM", "LASER", "COMET", "PRISM", "FORCE", "ORBIT", "QUARK", "PROTON",
    "GENOME", "MAGNET", "FUSION", "PLASMA", "NEURON", "GRAVITY", "MOLECULE",
    "VOLTAGE", "ENTROPY", "PHOTON", "ENZYME", "GALAXY", "CIRCUIT", "ECLIPSE",
    "ISOTOPE", "VACCINE", "GLACIER", "MINERAL", "BACTERIA", "ELECTRON",
    "NEUTRON", "PENDULUM", "CRYSTAL", "OXYGEN", "HELIUM", "VELOCITY", "FRICTION",
  ],
  Nature: [
    "RIVER", "MEADOW", "FOREST", "CANYON", "VALLEY", "STREAM", "BOULDER",
    "BREEZE", "SUNSET", "BLOSSOM", "PRAIRIE", "TUNDRA", "MARSH", "GROVE",
    "WILLOW", "MAPLE", "CEDAR", "FERN", "MOSS", "PEBBLE", "LAGOON", "RIDGE",
    "SUMMIT", "GLACIER", "CRATER", "GEYSER", "ORCHARD", "WETLAND", "RAINBOW",
    "THUNDER", "LIGHTNING", "WATERFALL", "VOLCANO", "WILDLIFE",
  ],
  Music: [
    "PIANO", "GUITAR", "VIOLIN", "DRUMS", "FLUTE", "TRUMPET", "CELLO", "BANJO",
    "HARP", "OBOE", "TEMPO", "RHYTHM", "MELODY", "CHORUS", "OCTAVE", "ANTHEM",
    "BALLAD", "CONCERT", "ENCORE", "LYRICS", "BASSOON", "TROMBONE", "ORGAN",
    "UKULELE", "MAESTRO", "QUARTET", "SOPRANO", "REMIX", "STUDIO", "VOCALS",
  ],
  Space: [
    "PLANET", "ROCKET", "GALAXY", "NEBULA", "COMET", "METEOR", "ORBIT",
    "ECLIPSE", "QUASAR", "PULSAR", "COSMOS", "CRATER", "SATURN", "VENUS",
    "MERCURY", "NEPTUNE", "JUPITER", "GRAVITY", "STARDUST", "ASTEROID",
    "TELESCOPE", "GALILEO", "LANDER", "ROVER", "LAUNCH", "VOYAGER", "MOON",
    "SOLAR", "LUNAR", "COSMIC", "STELLAR",
  ],
  Weather: [
    "CLOUD", "STORM", "FROST", "BREEZE", "DRIZZLE", "THUNDER", "RAINBOW",
    "BLIZZARD", "CYCLONE", "MONSOON", "HUMID", "SUNNY", "WINDY", "FOGGY",
    "SLEET", "HAIL", "TORNADO", "DROUGHT", "OVERCAST", "FORECAST", "PRESSURE",
    "GUSTY", "SHOWER", "CHILLY", "TROPICAL",
  ],
  Ocean: [
    "WHALE", "CORAL", "SHARK", "OCTOPUS", "DOLPHIN", "LOBSTER", "SEAWEED",
    "STARFISH", "JELLYFISH", "URCHIN", "MARLIN", "PLANKTON", "CURRENT", "REEF",
    "TIDE", "WAVE", "LAGOON", "HARBOR", "ANCHOR", "VESSEL", "SEASHELL", "MUSSEL",
    "STINGRAY", "WALRUS", "NARWHAL", "SARDINE", "MACKEREL",
  ],
};

// Regular: across, down, and both forward diagonals (a proper word search).
// Hard adds the reversed directions on top.
const DIRS_EASY = [
  { dr: 0, dc: 1 }, // across →
  { dr: 1, dc: 0 }, // down ↓
  { dr: 1, dc: 1 }, // diagonal ↘
  { dr: 1, dc: -1 }, // diagonal ↙
];
const DIRS_HARD = [
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
  { dr: 1, dc: 1 },
  { dr: 1, dc: -1 },
  { dr: 0, dc: -1 },
  { dr: -1, dc: 0 },
  { dr: -1, dc: 1 },
  { dr: -1, dc: -1 },
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Deterministic-ish pick driven by a simple xorshift so a given seed reproduces
// a puzzle (Math.random is unavailable in some contexts; callers pass a seed).
const makeRng = (seed: number) => {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0xffffffff;
  };
};

const inBounds = (r: number, c: number, size: number) =>
  r >= 0 && c >= 0 && r < size && c < size;

// Try to place a word into the grid in some direction without conflicting with
// already-placed letters (shared letters are fine).
const tryPlace = (
  grid: (string | null)[][],
  word: string,
  size: number,
  dirs: { dr: number; dc: number }[],
  rng: () => number
): Placement | null => {
  for (let attempt = 0; attempt < 80; attempt++) {
    const dir = dirs[Math.floor(rng() * dirs.length)];
    const r0 = Math.floor(rng() * size);
    const c0 = Math.floor(rng() * size);
    const cells: Cell[] = [];
    let ok = true;
    for (let i = 0; i < word.length; i++) {
      const r = r0 + dir.dr * i;
      const c = c0 + dir.dc * i;
      if (!inBounds(r, c, size)) {
        ok = false;
        break;
      }
      const existing = grid[r][c];
      if (existing !== null && existing !== word[i]) {
        ok = false;
        break;
      }
      cells.push({ r, c });
    }
    if (ok) return { word, cells };
  }
  return null;
};

export const wordSearchConfig = (difficulty: "REGULAR" | "HARD") =>
  difficulty === "HARD"
    ? { size: 12, count: 8, dirs: DIRS_HARD }
    : { size: 9, count: 7, dirs: DIRS_EASY };

export const generateWordSearch = (
  difficulty: "REGULAR" | "HARD",
  seed: number,
  themeName?: string
): WordSearchPuzzle => {
  const rng = makeRng(seed);
  const themes = Object.keys(THEMES);
  const theme = themeName ?? themes[Math.floor(rng() * themes.length)];
  const { size, count, dirs } = wordSearchConfig(difficulty);

  // Pick `count` distinct words that fit the grid, longest first for easier placement.
  const pool = [...THEMES[theme]]
    .filter((w) => w.length <= size)
    .sort((a, b) => b.length - a.length);
  // Shuffle within length buckets via the rng.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const grid: (string | null)[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null)
  );
  const placements: Placement[] = [];
  for (const word of pool) {
    if (placements.length >= count) break;
    const placed = tryPlace(grid, word, size, dirs, rng);
    if (placed) {
      placed.cells.forEach(({ r, c }, i) => (grid[r][c] = word[i]));
      placements.push(placed);
    }
  }

  // Fill blanks with random letters.
  const filled: string[][] = grid.map((row) =>
    row.map((ch) => ch ?? ALPHABET[Math.floor(rng() * 26)])
  );

  return {
    size,
    grid: filled,
    words: placements.map((p) => p.word),
    placements,
    theme,
  };
};

// Given an ordered run of selected cells, return the matching word (or null).
// Matches a placement whose cell sequence equals the selection forwards or back.
export const matchSelection = (
  puzzle: WordSearchPuzzle,
  selection: Cell[]
): string | null => {
  const key = (cells: Cell[]) => cells.map((c) => `${c.r},${c.c}`).join("|");
  const fwd = key(selection);
  const rev = key([...selection].reverse());
  for (const p of puzzle.placements) {
    const pk = key(p.cells);
    if (pk === fwd || pk === rev) return p.word;
  }
  return null;
};

// Progress 0–100 from the set of found words.
export const wordSearchProgress = (
  puzzle: WordSearchPuzzle | null | undefined,
  found: string[] | null | undefined
): number => {
  if (!puzzle || puzzle.words.length === 0) return 0;
  const set = new Set(found ?? []);
  const got = puzzle.words.filter((w) => set.has(w)).length;
  return Math.round((got / puzzle.words.length) * 100);
};
