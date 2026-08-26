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
  Fruits: [
    "APPLE", "MANGO", "LEMON", "PEACH", "GRAPE", "MELON", "BERRY", "PLUM",
    "KIWI", "LIME", "PEAR", "FIG", "DATE", "CHERRY", "BANANA", "ORANGE",
    "PAPAYA", "GUAVA", "APRICOT", "LYCHEE", "QUINCE", "CURRANT", "RAISIN",
    "COCONUT", "POMELO", "MULBERRY", "PLANTAIN", "NECTARINE", "PERSIMMON",
    "BLUEBERRY", "RASPBERRY", "TANGERINE",
  ],
  Vegetables: [
    "CARROT", "POTATO", "ONION", "CELERY", "RADISH", "PEPPER", "TURNIP",
    "LEEK", "KALE", "PEA", "BEET", "CORN", "OKRA", "YAM", "CHARD", "ENDIVE",
    "SPINACH", "CABBAGE", "SQUASH", "PUMPKIN", "LETTUCE", "PARSNIP", "SHALLOT",
    "EGGPLANT", "BROCCOLI", "CUCUMBER", "ZUCCHINI", "ARTICHOKE", "ASPARAGUS",
    "CAULIFLOWER",
  ],
  Colors: [
    "RED", "BLUE", "GREEN", "GOLD", "PINK", "TEAL", "CYAN", "NAVY", "PLUM",
    "RUBY", "JADE", "ROSE", "AQUA", "AMBER", "IVORY", "CORAL", "BEIGE", "OLIVE",
    "MAROON", "VIOLET", "INDIGO", "BRONZE", "SILVER", "COPPER", "SCARLET",
    "CRIMSON", "MAGENTA", "MUSTARD", "EMERALD", "LAVENDER", "TURQUOISE",
  ],
  Countries: [
    "SPAIN", "CHINA", "JAPAN", "EGYPT", "INDIA", "ITALY", "CHILE", "KENYA",
    "PERU", "CUBA", "NEPAL", "KOREA", "BRAZIL", "FRANCE", "CANADA", "MEXICO",
    "NORWAY", "POLAND", "GREECE", "TURKEY", "SWEDEN", "GERMANY", "FINLAND",
    "VIETNAM", "IRELAND", "ICELAND", "MOROCCO", "PORTUGAL", "THAILAND",
    "MALAYSIA", "ARGENTINA", "AUSTRALIA",
  ],
  Birds: [
    "ROBIN", "EAGLE", "RAVEN", "FINCH", "HERON", "EGRET", "STORK", "CRANE",
    "SWAN", "WREN", "HAWK", "OWL", "DOVE", "GOOSE", "SPARROW", "PIGEON",
    "TOUCAN", "PARROT", "FALCON", "PUFFIN", "MAGPIE", "OSPREY", "CANARY",
    "ORIOLE", "VULTURE", "KESTREL", "SEAGULL", "PELICAN", "PENGUIN",
    "CARDINAL", "FLAMINGO",
  ],
  Insects: [
    "ANT", "BEE", "WASP", "MOTH", "FLY", "GNAT", "FLEA", "TICK", "APHID",
    "BEETLE", "HORNET", "MANTIS", "LOCUST", "WEEVIL", "EARWIG", "CICADA",
    "FIREFLY", "LADYBUG", "TERMITE", "STINKBUG", "MOSQUITO", "BUTTERFLY",
    "DRAGONFLY", "CENTIPEDE", "MILLIPEDE", "SILKWORM", "BUMBLEBEE",
    "GRASSHOPPER", "CATERPILLAR",
  ],
  Flowers: [
    "ROSE", "LILY", "TULIP", "DAISY", "POPPY", "IRIS", "ASTER", "PANSY",
    "PEONY", "LOTUS", "LILAC", "ORCHID", "VIOLET", "DAHLIA", "AZALEA", "CROCUS",
    "ZINNIA", "PETUNIA", "BEGONIA", "JASMINE", "FUCHSIA", "PRIMROSE",
    "BLUEBELL", "FOXGLOVE", "GERANIUM", "MARIGOLD", "HYACINTH", "SUNFLOWER",
    "CARNATION", "DANDELION", "SNAPDRAGON",
  ],
  Trees: [
    "OAK", "ELM", "PINE", "PALM", "BIRCH", "MAPLE", "CEDAR", "ASPEN", "BEECH",
    "ALDER", "HAZEL", "LARCH", "ROWAN", "BALSAM", "LINDEN", "WILLOW", "POPLAR",
    "SPRUCE", "WALNUT", "JUNIPER", "CYPRESS", "DOGWOOD", "SEQUOIA", "REDWOOD",
    "HICKORY", "CHESTNUT", "SYCAMORE", "MAGNOLIA", "MAHOGANY", "HAWTHORN",
    "EUCALYPTUS",
  ],
  Gemstones: [
    "RUBY", "JADE", "OPAL", "ONYX", "PEARL", "TOPAZ", "AGATE", "AMBER",
    "BERYL", "CORAL", "IVORY", "GARNET", "JASPER", "QUARTZ", "ZIRCON",
    "SPINEL", "PERIDOT", "CITRINE", "EMERALD", "DIAMOND", "SAPPHIRE",
    "AMETHYST", "OBSIDIAN", "MOONSTONE", "TURQUOISE", "MALACHITE", "TANZANITE",
    "AQUAMARINE",
  ],
  Vehicles: [
    "CAR", "VAN", "BUS", "JEEP", "TAXI", "TRAM", "SLED", "TRAIN", "TRUCK",
    "WAGON", "YACHT", "FERRY", "CANOE", "KAYAK", "MOPED", "ROCKET", "SLEIGH",
    "SCOOTER", "TRACTOR", "TROLLEY", "CARAVAN", "MINIVAN", "BICYCLE", "GONDOLA",
    "FRIGATE", "SAILBOAT", "AIRPLANE", "SUBMARINE", "AMBULANCE", "HELICOPTER",
    "MOTORCYCLE",
  ],
  Tools: [
    "SAW", "AXE", "FILE", "HOE", "RAKE", "VISE", "TAPE", "DRILL", "LEVEL",
    "CLAMP", "SPADE", "ANVIL", "TONGS", "HAMMER", "WRENCH", "PLIERS", "CHISEL",
    "RULER", "SANDER", "MALLET", "SHOVEL", "TROWEL", "LADDER", "GAUGE",
    "CUTTER", "ROUTER", "PLANER", "WELDER", "SCRAPER", "NAILGUN", "CROWBAR",
    "SCREWDRIVER",
  ],
  Clothing: [
    "SHIRT", "PANTS", "DRESS", "SKIRT", "JEANS", "SOCKS", "SCARF", "GLOVE",
    "BOOTS", "SHOES", "HAT", "COAT", "VEST", "ROBE", "TIE", "BELT", "CAP",
    "GOWN", "TUNIC", "SHORTS", "JACKET", "HOODIE", "BLAZER", "TSHIRT",
    "SWEATER", "MITTENS", "SANDALS", "SLIPPER", "PAJAMAS", "RAINCOAT",
    "CARDIGAN", "OVERALLS",
  ],
  Furniture: [
    "CHAIR", "TABLE", "SOFA", "DESK", "STOOL", "BENCH", "SHELF", "COUCH",
    "LAMP", "BED", "CRIB", "CHEST", "DIVAN", "FUTON", "PANTRY", "MANTEL",
    "SETTEE", "DAYBED", "MIRROR", "BUREAU", "CRADLE", "DRESSER", "CABINET",
    "OTTOMAN", "HAMMOCK", "CUPBOARD", "WARDROBE", "BOOKCASE", "RECLINER",
    "LOVESEAT", "SIDEBOARD", "NIGHTSTAND",
  ],
  Jobs: [
    "DOCTOR", "NURSE", "PILOT", "CHEF", "BAKER", "JUDGE", "ACTOR", "CLERK",
    "VET", "FARMER", "TAILOR", "LAWYER", "ARTIST", "WRITER", "WAITER",
    "BARBER", "SAILOR", "CASHIER", "DENTIST", "PLUMBER", "TEACHER", "PAINTER",
    "SOLDIER", "SURGEON", "JANITOR", "ENGINEER", "MECHANIC", "MUSICIAN",
    "SCIENTIST", "CARPENTER", "LIBRARIAN", "ELECTRICIAN",
  ],
  Emotions: [
    "JOY", "HOPE", "FEAR", "CALM", "LOVE", "ANGER", "PRIDE", "TRUST", "HAPPY",
    "PROUD", "EAGER", "TENSE", "BORED", "SCARED", "JOYFUL", "GLOOMY", "GRUMPY",
    "LONELY", "WORRIED", "NERVOUS", "CURIOUS", "ANXIOUS", "CONTENT", "EXCITED",
    "HOPEFUL", "RELAXED", "GRATEFUL", "CHEERFUL", "PEACEFUL", "DELIGHTED",
    "SURPRISED",
  ],
  Mythology: [
    "ZEUS", "HERA", "THOR", "ODIN", "LOKI", "ARES", "HADES", "TITAN", "NYMPH",
    "SIREN", "APOLLO", "ATHENA", "HERMES", "MEDUSA", "SPHINX", "KRAKEN",
    "ORACLE", "TROJAN", "GORGON", "OLYMPUS", "ARTEMIS", "CYCLOPS", "GRIFFIN",
    "MERMAID", "CENTAUR", "PHOENIX", "PEGASUS", "CHIMERA", "POSEIDON",
    "HERCULES", "VALKYRIE", "MINOTAUR",
  ],
  Desserts: [
    "CAKE", "PIE", "TART", "FUDGE", "DONUT", "SCONE", "COOKIE", "MUFFIN",
    "ECLAIR", "SUNDAE", "GELATO", "SORBET", "TOFFEE", "MOUSSE", "PUDDING",
    "BROWNIE", "CUPCAKE", "CUSTARD", "CANNOLI", "PARFAIT", "PRALINE", "STRUDEL",
    "TARTLET", "BAKLAVA", "TURNOVER", "MACAROON", "MERINGUE", "TIRAMISU",
    "SHORTCAKE", "CROISSANT", "CHEESECAKE",
  ],
  Beverages: [
    "WATER", "JUICE", "COCOA", "LATTE", "MOCHA", "CIDER", "SODA", "MILK",
    "TEA", "COLA", "PUNCH", "TONIC", "LASSI", "SHAKE", "BREW", "FIZZ", "NECTAR",
    "EGGNOG", "MATCHA", "COFFEE", "SELTZER", "SLUSHIE", "LEMONADE", "ESPRESSO",
    "SMOOTHIE", "COCKTAIL", "KOMBUCHA", "HORCHATA", "MILKSHAKE", "GINGERALE",
    "CAPPUCCINO",
  ],
  Camping: [
    "TENT", "FIRE", "HIKE", "MAP", "ROPE", "GORP", "SMORE", "SCOUT", "BOOTS",
    "TORCH", "STOVE", "TRAIL", "SUMMIT", "RANGER", "FORAGE", "PADDLE", "RAPIDS",
    "BONFIRE", "CANTEEN", "HAMMOCK", "WHISTLE", "MATCHES", "COMPASS", "LANTERN",
    "CAMPSITE", "FIREWOOD", "KINDLING", "BACKPACK", "CAMPFIRE", "WILDLIFE",
    "FLASHLIGHT", "MARSHMALLOW",
  ],
  Reptiles: [
    "SNAKE", "GECKO", "COBRA", "VIPER", "SKINK", "MAMBA", "ADDER", "BOA",
    "ASP", "GILA", "KOMODO", "TAIPAN", "CAIMAN", "PYTHON", "IGUANA", "TURTLE",
    "LIZARD", "MONITOR", "RATTLER", "TUATARA", "GHARIAL", "TORTOISE", "ANACONDA",
    "TERRAPIN", "BASILISK", "CROCODILE", "ALLIGATOR", "CHAMELEON", "SALAMANDER",
    "SIDEWINDER",
  ],
  "Body Parts": [
    "ARM", "LEG", "HAND", "FOOT", "HEAD", "EYE", "EAR", "NOSE", "KNEE", "HEEL",
    "CHIN", "SHIN", "RIB", "HIP", "JAW", "LUNG", "WRIST", "ELBOW", "ANKLE",
    "THUMB", "SPINE", "SKULL", "LIVER", "HEART", "KIDNEY", "MUSCLE", "TENDON",
    "STOMACH", "KNUCKLE", "SHOULDER", "FOREHEAD", "EYEBROW",
  ],
  Kitchen: [
    "OVEN", "POT", "PAN", "WOK", "MITT", "TIMER", "APRON", "KNIFE", "SPOON",
    "FORK", "WHISK", "LADLE", "SIEVE", "TONGS", "MIXER", "GRATER", "KETTLE",
    "PEELER", "SIFTER", "TEAPOT", "TOASTER", "BLENDER", "SPATULA", "SKILLET",
    "STRAINER", "COLANDER", "SAUCEPAN", "CORKSCREW", "MICROWAVE", "FRYINGPAN",
    "DISHWASHER",
  ],
  Winter: [
    "SNOW", "ICE", "FROST", "SLED", "SKI", "SLUSH", "IGLOO", "PARKA", "COCOA",
    "SCARF", "SKATES", "FLURRY", "SHIVER", "FREEZE", "FROZEN", "FLEECE",
    "CHILLY", "ICICLE", "SLEIGH", "MITTEN", "SNOWMAN", "GLACIER", "BLIZZARD",
    "SNOWBALL", "TOBOGGAN", "SNOWFLAKE", "FROSTBITE", "AVALANCHE", "HAILSTONE",
    "SNOWDRIFT",
  ],
  Garden: [
    "SEED", "SOIL", "WEED", "HOSE", "RAKE", "BULB", "VINE", "LAWN", "ROOTS",
    "HEDGE", "PETAL", "MULCH", "BLOOM", "SHRUB", "SPADE", "POLLEN", "SPROUT",
    "TROWEL", "PLANTER", "COMPOST", "TRELLIS", "SAPLING", "NURSERY", "PRUNING",
    "HARVEST", "BLOSSOM", "WATERING", "FLOWERBED", "GREENHOUSE", "FERTILIZER",
  ],
  Dance: [
    "SALSA", "TANGO", "WALTZ", "SAMBA", "DISCO", "RUMBA", "POLKA", "SWING",
    "TAP", "CONGA", "TWIST", "MAMBO", "JIVE", "TWERK", "SHIMMY", "BOLERO",
    "MINUET", "CANCAN", "HIPHOP", "BALLET", "FOXTROT", "FLAMENCO", "BALLROOM",
    "MOONWALK", "JITTERBUG", "PIROUETTE", "BREAKDANCE", "CHOREOGRAPHY",
  ],
  Shapes: [
    "CIRCLE", "SQUARE", "OVAL", "CONE", "CUBE", "STAR", "RING", "ARC", "LOOP",
    "HEART", "PRISM", "ARROW", "CROSS", "HELIX", "WEDGE", "TORUS", "SPIRAL",
    "SPHERE", "POLYGON", "HEXAGON", "OCTAGON", "DECAGON", "CHEVRON", "PYRAMID",
    "ELLIPSE", "RHOMBUS", "CRESCENT", "CYLINDER", "TRIANGLE", "PENTAGON",
    "TRAPEZOID",
  ],
  Metals: [
    "IRON", "GOLD", "TIN", "ZINC", "LEAD", "BRASS", "STEEL", "ALLOY", "INGOT",
    "CHROME", "COPPER", "SILVER", "NICKEL", "BRONZE", "COBALT", "PEWTER",
    "SODIUM", "BARIUM", "RADIUM", "CARBON", "SOLDER", "GALLIUM", "LITHIUM",
    "MERCURY", "URANIUM", "CALCIUM", "TITANIUM", "ALUMINUM", "PLATINUM",
    "TUNGSTEN", "MAGNESIUM", "PALLADIUM",
  ],
  Breakfast: [
    "EGGS", "TOAST", "BACON", "BAGEL", "JAM", "HONEY", "GRITS", "CREPE",
    "DONUT", "CEREAL", "WAFFLE", "MUFFIN", "YOGURT", "OMELET", "BUTTER",
    "COFFEE", "PASTRY", "JUICE", "COMPOTE", "GRANOLA", "OATMEAL", "PANCAKE",
    "SAUSAGE", "BISCUIT", "KIPPERS", "SCRAMBLE", "FRITTATA", "TURNOVER",
    "PORRIDGE", "HASHBROWN", "CROISSANT",
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
  themeName?: string,
  // Themes recently shown to this player (avoided so the category varies), and
  // words they've already seen (preferred to be skipped). Both keep successive
  // puzzles from repeating. Fall back gracefully once everything's been seen.
  excludeThemes?: string[],
  excludeWords?: string[]
): WordSearchPuzzle => {
  const rng = makeRng(seed);
  const themes = Object.keys(THEMES);
  let choices = themes;
  if (!themeName && excludeThemes && excludeThemes.length) {
    const fresh = themes.filter((t) => !excludeThemes.includes(t));
    if (fresh.length) choices = fresh; // if all are recent, allow any
  }
  const theme = themeName ?? choices[Math.floor(rng() * choices.length)];
  const { size, count, dirs } = wordSearchConfig(difficulty);

  // Words that fit the grid, shuffled, then ordered UNSEEN-first (for variety)
  // and longest-first within each group (for easier placement).
  const seen = new Set(excludeWords ?? []);
  const pool = [...THEMES[theme]].filter((w) => w.length <= size);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  pool.sort(
    (a, b) => (seen.has(a) ? 1 : 0) - (seen.has(b) ? 1 : 0) || b.length - a.length
  );

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
