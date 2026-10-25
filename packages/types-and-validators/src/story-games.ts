import { THEMES } from "./word-search";
import { WORDSY_DICTIONARY } from "./wordsy-dictionary";

// Two extra Story-Mode game types, generated entirely from original word lists
// (Wordsy) and original hand-authored puzzles (Categories). Deterministic from a
// seed so a level reproduces on demand, but Story Mode passes a random seed each
// play for variety at a fixed difficulty, plus an "avoid" list so the same
// puzzle doesn't come up twice in a row.

const rng = (seed: number) => {
  let s = seed >>> 0 || 1;
  const step = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
  };
  // Warm up so nearby seeds decorrelate — the first output of a raw xorshift is
  // highly correlated across sequential seeds, which would cluster picks.
  step();
  step();
  step();
  return () => {
    step();
    // Divide by 2^32 (not 2^32-1) so the result is in [0, 1) — dividing by
    // 0xffffffff can return exactly 1.0 at max state, which makes callers like
    // Math.floor(rand()*len) index out of bounds.
    return s / 0x100000000;
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
// dictionary needs to ship. Big pools so replays rarely repeat.
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
    "DAWN", "DUSK", "TIDE", "MIST", "HERB", "PEAR", "PLUM", "KALE", "TUNA",
    "CLAM", "DUCK", "SWAN", "HAWK", "LARK", "DOVE", "LION", "PONY", "COLT",
    "MOLE", "TOAD", "NEWT", "BASS", "PIKE", "CARP", "OWLS", "CUBS", "OPAL",
    "JADE", "RUBY", "COAL", "CLAY", "SILK", "WOOL", "YARN", "ROPE", "NAIL",
    "BOLT", "GEAR", "TENT", "MAPS", "OARS", "MAST", "HELM", "DOCK", "PORT",
    "FORT", "BARN", "MILL", "WELL", "POND", "BUSH", "VINE", "MOSS", "PINE",
    "OAKS", "REED", "CANE", "HUSK", "BRAN", "OATS", "SAGE", "DILL", "CHEF",
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
    "ACORN", "AMBER", "ANGEL", "ARROW", "BADGE", "BASIL", "BISON", "BRICK",
    "BRUSH", "CABIN", "CAMEL", "CHALK", "CHARM", "CHILI", "CIDER", "CLIFF",
    "COAST", "CORAL", "CRANE", "CRISP", "DELTA", "DIARY", "DONUT", "EMBER",
    "FABLE", "FERRY", "FLOAT", "FLUTE", "GRAIN", "GRASS", "GROVE", "HAZEL",
    "HOTEL", "IGLOO", "JEWEL", "LEMUR", "LILAC", "LLAMA", "LOTUS", "MAIZE",
    "MARSH", "MELON", "METAL", "MOTOR", "OASIS", "ONION", "OTTER", "PANDA",
    "PATIO", "PEDAL", "PLANK", "PLUMB", "POPPY", "PRISM", "QUARK", "QUEST",
    "RAVEN", "ROOST", "SCARF", "SEDAN", "SIREN", "SLOTH", "SPARK", "SPOON",
    "SQUID", "STALK", "STEAM", "STOOL", "SWARM", "TANGO", "THORN", "TOAST",
    "TRUCK", "TULIP", "VAULT", "VILLA", "VIOLA", "WAGON", "WINCH",
    "WRIST", "YEAST", "ZESTY",
    "ABOUT", "ABOVE", "ACTOR", "ADOPT", "ADULT", "AGENT", "AGREE", "ALARM",
    "ALBUM", "ALERT", "ALIVE", "ALLOW", "ALONE", "ALTAR", "ANKLE", "APART",
    "APRON", "ARENA", "ARGUE", "ARISE", "ASIDE", "ASSET", "AVOID", "AWAKE",
    "AWARD", "BACON", "BAGEL", "BAKER", "BANJO", "BASIN", "BATCH", "BEARD",
    "BEAST", "BEGIN", "BELOW", "BENCH", "BIRTH", "BLADE", "BLAME", "BLANK",
    "BLAST", "BLAZE", "BLEND", "BLINK", "BLOCK", "BLOOM", "BLUNT", "BLUSH",
    "BOARD", "BOAST", "BONUS", "BOOST", "BOOTH", "BOUND", "BOXER", "BRACE",
    "BRAID", "BRAIN", "BRAKE", "BRAND", "BRAVE", "BREAK", "BREED", "BRIBE",
    "BRIDE", "BRIEF", "BRING", "BRINK", "BRISK", "BROAD", "BROOK", "BROOM",
    "BROTH", "BROWN", "BUDDY", "BUGLE", "BUILD", "BUNCH", "BURST", "BUYER",
    "CABLE", "CADET", "CANAL", "CANOE", "CARGO", "CAROL", "CARVE", "CATCH",
    "CAUSE", "CEDAR", "CHAIN", "CHAMP", "CHANT", "CHART", "CHASE", "CHEAP",
    "CHECK", "CHEEK", "CHEER", "CHEST", "CHIEF", "CHILD", "CHIME", "CHIRP",
    "CHOIR", "CHORE", "CHUNK", "CIGAR", "CIVIL", "CLAIM", "CLAMP", "CLASH",
    "CLASP", "CLEAN", "CLEAR", "CLERK", "CLICK", "CLIMB", "CLING", "CLOAK",
    "CLONE", "CLOSE", "CLOTH", "CLOWN", "CLUMP", "COACH", "COCOA", "COLON",
    "COLOR", "COMET", "COMIC", "COUCH", "COUGH", "COUNT", "COURT", "COVER",
    "CRACK", "CRAFT", "CRASH", "CRATE", "CRAVE", "CRAWL", "CRAZY", "CREAM",
    "CREEK", "CREST", "CRIME", "CROWD", "CRUDE", "CRUEL", "CRUMB", "CRUSH",
    "CRUST", "CURVE", "CYCLE", "DAIRY", "DEALT", "DEBUT", "DECAY", "DELAY",
    "DENIM", "DEPTH", "DEVIL", "DIGIT", "DINER", "DITCH", "DIVER", "DODGE",
    "DONOR", "DOUGH", "DOZEN", "DRAFT", "DRAIN", "DRAMA", "DRANK", "DRAPE",
    "DREAD", "DRESS", "DRIFT", "DRILL", "DRINK", "DRIVE", "DRONE", "DROVE",
    "DROWN", "DRUNK", "DWARF", "DWELL", "EAGER", "EARLY", "EATEN", "EBONY",
    "EIGHT", "ELBOW", "ELDER", "ELECT", "ELITE", "EMPTY", "ENEMY", "ENJOY",
    "ENTER", "ENTRY", "EQUAL", "ERASE", "ERECT", "ERUPT", "ESSAY", "EVENT",
    "EVERY", "EVOKE", "EXACT", "EXCEL", "EXILE", "EXIST", "EXTRA", "FAINT",
    "FAIRY", "FAITH", "FANCY", "FATAL", "FAULT", "FAVOR", "FEAST", "FETCH",
    "FEVER", "FIBER", "FIFTH", "FIGHT", "FINAL", "FINCH", "FIRST", "FJORD",
    "FLAIR", "FLAKE", "FLANK", "FLASH", "FLASK", "FLEET", "FLESH", "FLICK",
    "FLING", "FLINT", "FLIRT", "FLOCK", "FLOOD", "FLOOR", "FLUID", "FLUSH",
    "FOCUS", "FORCE", "FORGE", "FORTH", "FORTY", "FORUM", "FOUND", "FOYER",
    "FRAME", "FRANK", "FRAUD", "FRESH", "FRILL", "FROCK", "FRONT", "FROTH",
    "FROWN", "FUDGE", "FUNNY", "GAUGE", "GAVEL", "GECKO", "GENIE", "GENRE",
    "GIVEN", "GLADE", "GLAND", "GLARE", "GLAZE", "GLEAM", "GLIDE", "GLINT",
    "GLOBE", "GLOOM", "GLORY", "GLOVE", "GNOME", "GOING", "GOOSE", "GORGE",
    "GRACE", "GRADE", "GRAND", "GRANT", "GRAPH", "GRASP", "GRATE", "GRAVE",
    "GRAVY", "GREAT", "GREED", "GREEN", "GREET", "GRILL", "GRIND", "GROAN",
    "GROOM", "GROUP", "GROWL", "GROWN", "GRUNT", "GUARD", "GUAVA", "GUESS",
    "GUEST", "GUIDE", "GUILD", "GUILT", "GULLY", "GUMBO", "GUSTO", "HABIT",
    "HAIRY", "HANDY", "HAPPY", "HARDY", "HARSH", "HASTE", "HATCH", "HAUNT",
    "HAVEN", "HAVOC", "HEATH", "HEAVE", "HEAVY", "HEDGE", "HEFTY", "HELLO",
    "HERON", "HINGE", "HIPPO", "HITCH", "HOARD", "HOBBY", "HOIST", "HONOR",
    "HORSE", "HOUND", "HOVER", "HUMID", "HUMOR", "HUNCH", "HUSKY", "HUTCH",
    "IDEAL", "IDIOM", "IDIOT", "IMAGE", "IMPLY", "INDEX", "INLET", "INNER",
    "INPUT", "IRATE", "IRONY", "ISSUE", "JERKY", "JETTY", "JOINT", "JOKER",
    "JOLLY", "JUDGE", "JUICY", "JUMBO", "KAYAK", "KHAKI", "KIOSK", "KNACK",
    "KNEAD", "KNEEL", "KNOCK", "KNOLL", "KNOWN", "LABEL", "LABOR", "LANCE",
    "LARGE", "LARVA", "LASER", "LASSO", "LATCH", "LATER", "LATHE", "LAUGH",
    "LAYER", "LEAFY", "LEARN", "LEASE", "LEASH", "LEAST", "LEDGE", "LEGAL",
    "LEVEL", "LEVER", "LINEN", "LINER", "LIVER", "LOBBY", "LOCAL", "LODGE",
    "LOFTY", "LOGIC", "LOOSE", "LOSER", "LOVER", "LOYAL", "LUCID", "LUCKY",
    "LUNAR", "LUNGE", "LURCH", "LYRIC", "MACAW", "MAGIC", "MAJOR", "MAKER",
    "MANIA", "MANOR", "MARCH", "MARRY", "MASON", "MATCH", "MAYBE", "MAYOR",
    "MEANT", "MEDIC", "MERCY", "MERGE", "MERIT", "MERRY", "METER", "MIGHT",
    "MIMIC", "MINCE", "MINER", "MINOR", "MIRTH", "MISER", "MODEL", "MOGUL",
    "MOIST", "MOLAR", "MORAL", "MOTEL", "MOTIF", "MOTTO", "MOUND", "MOUNT",
    "MOURN", "MOUTH", "MOVIE", "MUCKY", "MUDDY", "MURAL", "MURKY", "MUSTY",
    "NAIVE", "NASTY", "NAVAL", "NEEDY", "NERVE", "NEVER", "NICHE", "NIECE",
    "NINJA", "NINTH", "NOBLE", "NOISE", "NOMAD", "NORTH", "NOTCH", "NOVEL",
    "NUDGE", "OCCUR", "OCTET", "OFFER", "OLDER", "OMEGA", "ONSET", "OPERA",
    "ORBIT", "ORGAN", "OTHER", "OUNCE", "OWNER", "OXIDE", "OZONE", "PAINT",
    "PANEL", "PANIC", "PAPER", "PARKA", "PASTE", "PATCH", "PAUSE", "PEACE",
    "PECAN", "PENNY", "PERCH", "PERIL", "PESTO", "PETAL", "PHASE", "PHONE",
    "PHOTO", "PIECE", "PINCH", "PITCH", "PIVOT", "PIXEL", "PIXIE", "PLAID",
    "PLAIN", "PLANE", "PLATE", "PLAZA", "PLEAD", "PLUCK", "PLUME", "PLUMP",
    "PLUSH", "POACH", "POINT", "POLAR", "POLKA", "PORCH", "POUCH", "POUND",
    "POWER", "PRANK", "PRAWN", "PRESS", "PRICE", "PRIDE", "PRIME", "PRINT",
    "PRIOR", "PRIZE", "PROBE", "PRONE", "PROOF", "PROSE", "PROUD", "PROVE",
    "PROWL", "PRUNE", "PULSE", "PUPIL", "PUREE", "PURGE", "PURSE", "QUACK",
    "QUAIL", "QUAKE", "QUART", "QUEUE", "QUICK", "QUIET", "QUILL", "QUIRK",
    "QUITE", "QUOTE", "RADAR", "RAINY", "RAISE", "RALLY", "RANCH", "RANGE",
    "RAPID", "RATIO", "REACH", "REACT", "READY", "REALM", "REBEL", "REFER",
    "REGAL", "RELAX", "RELAY", "RELIC", "REPAY", "REPEL", "REPLY", "RESET",
    "RESIN", "REUSE", "RHINO", "RHYME", "RIDER", "RIDGE", "RIFLE", "RIGID",
    "RINSE", "RIPEN", "RISKY", "RIVAL", "ROACH", "ROAST", "ROBIN", "ROCKY",
    "RODEO", "ROGUE", "ROTOR", "ROUGE", "ROUGH", "ROUND", "ROUSE", "ROUTE",
    "ROVER", "ROWDY", "ROYAL", "RUGBY", "RULER", "RUMOR", "RURAL", "RUSTY",
    "SABER", "SALAD", "SALON", "SALSA", "SALTY", "SANDY", "SATIN", "SAUCE",
    "SAUNA", "SAVOR", "SAVVY", "SCALD", "SCALE", "SCALP", "SCANT", "SCARE",
    "SCARY", "SCENE", "SCENT", "SCOLD", "SCONE", "SCOOP", "SCOPE", "SCORE",
    "SCORN", "SCOUT", "SCOWL", "SCRAP", "SCREW", "SCRUB", "SCUBA", "SEIZE",
    "SENSE", "SEPIA", "SERVE", "SETUP", "SEVEN", "SEVER", "SHACK", "SHADE",
    "SHADY", "SHAFT", "SHAKE", "SHAKY", "SHALL", "SHAME", "SHAPE", "SHARE",
    "SHARP", "SHAVE", "SHAWL", "SHEAR", "SHEEN", "SHEER", "SHEET", "SHELF",
    "SHELL", "SHINY", "SHOAL", "SHOCK", "SHOOT", "SHORT", "SHOUT", "SHOVE",
    "SHOWN", "SHOWY", "SHRED", "SHREW", "SHRUB", "SHRUG", "SIEGE", "SIEVE",
    "SIGHT", "SILKY", "SILLY", "SINCE", "SINGE", "SIXTH", "SIXTY", "SKATE",
    "SKIER", "SKILL", "SKIRT", "SKULL", "SKUNK", "SLACK", "SLANG", "SLANT",
    "SLASH", "SLATE", "SLEEK", "SLEEP", "SLEET", "SLICE", "SLICK", "SLIDE",
    "SLIME", "SLING", "SLOPE", "SLUMP", "SLUSH", "SMACK", "SMALL", "SMART",
    "SMASH", "SMEAR", "SMELL", "SMIRK", "SMITH", "SMOKE", "SMOKY", "SNACK",
    "SNAIL", "SNARE", "SNARL", "SNEAK", "SNEER", "SNIFF", "SNIPE", "SNOOP",
    "SNORE", "SNORT", "SNOUT", "SNOWY", "SOBER", "SOGGY", "SOLAR", "SOLID",
    "SOLVE", "SONAR", "SONIC", "SORRY", "SOUND", "SOUTH", "SPACE", "SPADE",
    "SPANK", "SPARE", "SPAWN", "SPEAK", "SPEAR", "SPECK", "SPEED", "SPELL",
    "SPEND", "SPENT", "SPICY", "SPIKE", "SPILL", "SPINE", "SPIRE", "SPITE",
    "SPLIT", "SPOIL", "SPOKE", "SPOOK", "SPOOL", "SPORE", "SPORT", "SPOUT",
    "SPRAY", "SPREE", "SPRIG", "SPURN", "SPURT", "SQUAD", "SQUAT", "STACK",
    "STAFF", "STAGE", "STAIN", "STAIR", "STAKE", "STALE", "STALL", "STAMP",
    "STAND", "STARK", "START", "STATE", "STEAK", "STEAL", "STEEL", "STEEP",
    "STEER", "STERN", "STICK", "STIFF", "STILL", "STILT", "STING", "STINK",
    "STOCK", "STOLE", "STOMP", "STOOD", "STOOP", "STORE", "STORK", "STORY",
    "STOUT", "STOVE", "STRAP", "STRAW", "STRAY", "STRIP", "STRUT", "STUCK",
    "STUDY", "STUFF", "STUMP", "STUNT", "STYLE", "SUAVE", "SUEDE", "SUITE",
    "SUNNY", "SUPER", "SURGE", "SUSHI", "SWAMP", "SWEAR", "SWEAT", "SWEEP",
    "SWEET", "SWELL", "SWIFT", "SWINE", "SWING", "SWIRL", "SWISH", "SWOON",
    "SWOOP", "SWORE", "SWORN", "SYRUP", "TABBY", "TABOO", "TALLY", "TALON",
    "TAMER", "TANGY", "TAPIR", "TAROT", "TASTE", "TASTY", "TAUNT", "TAWNY",
    "TEACH", "TEMPO", "TENOR", "TENSE", "TENTH", "TEPEE", "TEPID", "TERSE",
    "THANK", "THEFT", "THEME", "THICK", "THIEF", "THIGH", "THING", "THINK",
    "THIRD", "THONG", "THREE", "THREW", "THROB", "THROW", "THUMB", "THUMP",
    "THYME", "TIARA", "TIDAL", "TIGHT", "TIMER", "TIMID", "TITAN", "TOKEN",
    "TONIC", "TOOTH", "TOPAZ", "TOPIC", "TORCH", "TORSO", "TOTAL", "TOTEM",
    "TOUCH", "TOUGH", "TOWEL", "TOXIC", "TOXIN", "TRACE", "TRACK", "TRADE",
    "TRAIL", "TRAIT", "TRAMP", "TRASH", "TREAD", "TREAT", "TREND", "TRIAL",
    "TRIBE", "TRICK", "TROLL", "TROOP", "TROUT", "TRUCE", "TRULY", "TRUMP",
    "TRUNK", "TRUST", "TRUTH", "TUBER", "TUMOR", "TUNIC", "TURBO", "TUTOR",
    "TWANG", "TWEAK", "TWEED", "TWEET", "TWICE", "TWINE", "TWIRL", "TWIST",
    "ULCER", "ULTRA", "UNCLE", "UNDER", "UNFIT", "UNION", "UNITY", "UNTIE",
    "UNTIL", "UPPER", "UPSET", "URBAN", "USAGE", "USHER", "USING", "UTTER",
    "VAGUE", "VALID", "VALOR", "VALUE", "VALVE", "VAPOR", "VEGAN", "VENOM",
    "VENUE", "VERGE", "VERSE", "VICAR", "VIDEO", "VIGIL", "VIGOR", "VINYL",
    "VIPER", "VIRAL", "VIRUS", "VISIT", "VISOR", "VISTA", "VITAL", "VIVID",
    "VIXEN", "VOCAL", "VODKA", "VOGUE", "VOMIT", "VOTER", "VOUCH", "VOWEL",
    "WACKY", "WAFER", "WAGER", "WAIST", "WALTZ", "WASTE", "WATCH", "WAVER",
    "WEARY", "WEAVE", "WEDGE", "WEIGH", "WEIRD", "WENCH", "WHARF", "WHEEL",
    "WHERE", "WHICH", "WHIFF", "WHILE", "WHINE", "WHIRL", "WHISK", "WHITE",
    "WHOLE", "WHOOP", "WHOSE", "WIDEN", "WIDOW", "WIDTH", "WIELD", "WINCE",
    "WINDY", "WIPER", "WISER", "WITCH", "WITTY", "WOMAN", "WORLD", "WORRY",
    "WORSE", "WORST", "WORTH", "WOULD", "WOUND", "WOVEN", "WRATH", "WRECK",
    "WRING", "WRITE", "WRONG", "WROTE", "YEARN", "YIELD", "YODEL", "YOUNG",
    "YOUTH", "YUMMY", "ZONAL",
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
    "ANCHOR", "ANTLER", "BAMBOO", "BEACON", "BEAVER", "BELFRY", "BONNET",
    "BRANCH", "BUBBLE", "BUCKET", "CACTUS", "CAMERA", "CANYON", "CARROT",
    "CASHEW", "CELLAR", "CHEESE", "CIRCUS", "CLOVER", "COBALT", "COMETS",
    "COPPER", "CORNER", "COTTON", "CRAYON", "CYMBAL", "DAHLIA", "DESERT",
    "DIMPLE", "DOLLAR", "DONKEY", "EMBERS", "FALCON", "FENNEL",
    "FIDDLE", "FLEECE", "FONDUE", "FRIDGE", "GADGET", "GARLIC", "GEYSER",
    "GINGER", "GLIDER", "GRAVEL", "GROTTO",
    "HANGAR", "HARBOR", "HELMET", "HERMIT", "HOLLOW", "ICICLE", "INKPOT",
    "JAGUAR", "JERSEY", "KIMONO",
    "LAGOON", "LOCKET", "MAGNET",
    "MARBLE", "MITTEN", "MUFFIN", "NECTAR", "NUTMEG", "ONIONS",
    "OYSTER", "PADDLE", "PEBBLE", "PEWTER",
    "PISTON", "POCKET", "POLLEN", "POODLE", "PUMICE",
    "QUARTZ", "QUIVER", "RACKET", "RADISH", "RAISIN", "RAPTOR",
    "RATTLE", "ROSTER", "RUDDER", "SANDAL", "SAVORY",
    "SEQUIN", "SHRIMP", "SHRINE", "SLEIGH", "SORREL",
    "SPRUCE", "STABLE", "STUCCO", "SUMMIT",
    "SWATCH", "TASSEL", "TEAPOT", "THRUSH", "TIMBER", "TINSEL", "TOFFEE",
    "TOUCAN", "TROWEL", "TUXEDO", "VELVET",
    "VESSEL", "WAFFLE", "WALRUS", "WICKER", "WIDGET", "WIGWAM", "YOGURT",
  ],
};

export type WordsyPuzzle = {
  answer: string;
  length: number;
  maxGuesses: number;
};

// Wordle rules: a guess must be a REAL 5-letter word (plurals excluded). The
// dictionary is the system word list with plurals filtered; the answer pool is
// unioned in so every answer is always a legal guess.
const WORDSY_VALID: Set<string> = new Set([
  ...WORDSY_DICTIONARY,
  ...WORDSY_WORDS[5],
]);
export const isValidWordsyGuess = (word: string): boolean =>
  typeof word === "string" &&
  word.length === 5 &&
  WORDSY_VALID.has(word.toUpperCase());

export const generateWordsy = (
  config: { length: number; maxGuesses: number },
  seed: number,
  avoid: string[] = []
): WordsyPuzzle => {
  const rand = rng(seed);
  const full = WORDSY_WORDS[config.length] ?? WORDSY_WORDS[5];
  const avoidSet = new Set(avoid.map((w) => w.toUpperCase()));
  // Prefer a word we haven't shown recently; fall back to the full pool.
  const pool = full.filter((w) => !avoidSet.has(w));
  const use = pool.length > 0 ? pool : full;
  const answer = use[Math.floor(rand() * use.length)];
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

// ---- Categories (group 16 words into 4 clever sets) -----------------------
export type CategoryGroup = { category: string; words: string[] };
export type CategoriesPuzzle = {
  id?: string; // curated-puzzle id (for repeat-avoidance); absent for themed
  groups: CategoryGroup[]; // 4 groups of 4
  tiles: string[]; // 16 words, shuffled
  mistakes: number; // wrong guesses allowed
};

// A bank of ORIGINAL, hand-authored Categories puzzles. What makes them "clever"
// is the surface overlap: a word looks like it could belong to several groups
// (e.g. RUBY is a gem AND a shade of red), but sits in exactly one group in the
// intended solution — the trap of a good grouping game. All original content.
// Each puzzle's 16 words are unique within that puzzle (validated at build).
type CuratedPuzzle = { id: string; groups: CategoryGroup[] };
const CATEGORIES_PUZZLES: CuratedPuzzle[] = [
  // The cleverness is the TRAP: several words plausibly fit more than one group
  // (a bird that's also a verb, a snake that's also a coding language), but each
  // belongs to exactly one group in the intended solution.
  { id: "duck", groups: [
    { category: "Verbs (that are also animals)", words: ["DUCK", "CROW", "BADGER", "CLAM"] },
    { category: "Birds", words: ["ROBIN", "WREN", "FINCH", "HERON"] },
    { category: "Flowers (and girls' names)", words: ["HOLLY", "IVY", "ROSE", "HEATHER"] },
    { category: "Trees", words: ["OAK", "PINE", "BIRCH", "ELM"] },
  ]},
  { id: "spell", groups: [
    { category: "Witchcraft", words: ["SPELL", "CHARM", "HEX", "WAND"] },
    { category: "Snakes", words: ["VIPER", "MAMBA", "ADDER", "PYTHON"] },
    { category: "Coding languages", words: ["JAVA", "RUST", "SWIFT", "RUBY"] },
    { category: "Coffee orders", words: ["MOCHA", "BREW", "ROAST", "DECAF"] },
  ]},
  { id: "firefly", groups: [
    { category: "FIRE ___", words: ["PLACE", "WOOD", "WORKS", "ARM"] },
    { category: "___ FLY", words: ["BUTTER", "DRAGON", "HORSE", "MAY"] },
    { category: "Camping gear", words: ["TENT", "LANTERN", "CANOE", "TRAIL"] },
    { category: "Neon colors", words: ["LIME", "CORAL", "GOLD", "PINK"] },
  ]},
  { id: "pitch", groups: [
    { category: "Verbs (that are also animals)", words: ["BAT", "FLY", "HOUND", "PARROT"] },
    { category: "Baseball", words: ["PITCH", "BUNT", "STEAL", "INNING"] },
    { category: "Music terms", words: ["TEMPO", "CHORD", "SCALE", "REST"] },
    { category: "Weather", words: ["SLEET", "HAIL", "FROST", "GALE"] },
  ]},
  { id: "starfish", groups: [
    { category: "___ FISH", words: ["STAR", "JELLY", "SWORD", "CAT"] },
    { category: "___ LIGHT", words: ["SUN", "MOON", "SPOT", "DAY"] },
    { category: "Space", words: ["COMET", "ORBIT", "NOVA", "METEOR"] },
    { category: "Fabrics", words: ["DENIM", "LINEN", "SILK", "WOOL"] },
  ]},
  { id: "hook", groups: [
    { category: "Boxing", words: ["JAB", "CLINCH", "BOUT", "SPAR"] },
    { category: "Fishing", words: ["HOOK", "CAST", "LINE", "REEL"] },
    { category: "Trees", words: ["CEDAR", "ASPEN", "WILLOW", "ASH"] },
    { category: "Pasta shapes", words: ["PENNE", "ZITI", "ORZO", "FUSILLI"] },
  ]},
  { id: "sole", groups: [
    { category: "Fish", words: ["BASS", "PIKE", "SOLE", "CARP"] },
    { category: "Shoe parts", words: ["HEEL", "LACE", "TONGUE", "ARCH"] },
    { category: "Body parts", words: ["SHIN", "RIB", "HIP", "JAW"] },
    { category: "Complain", words: ["GRIPE", "WHINE", "MOAN", "FUSS"] },
  ]},
  { id: "bark", groups: [
    { category: "Dog sounds", words: ["BARK", "GROWL", "YELP", "HOWL"] },
    { category: "Tree parts", words: ["TRUNK", "ROOT", "BRANCH", "LEAF"] },
    { category: "Car parts", words: ["HOOD", "WHEEL", "BRAKE", "CLUTCH"] },
    { category: "Math words", words: ["SUM", "ANGLE", "PRIME", "POWER"] },
  ]},
  { id: "crane", groups: [
    { category: "Tall birds", words: ["SWAN", "STORK", "EGRET", "CRANE"] },
    { category: "Construction machines", words: ["DIGGER", "LOADER", "DOZER", "DERRICK"] },
    { category: "Yoga poses", words: ["PLANK", "BRIDGE", "LUNGE", "COBRA"] },
    { category: "At the pool", words: ["LANE", "DIVE", "LAP", "KICK"] },
  ]},
  { id: "jam", groups: [
    { category: "Traffic words", words: ["JAM", "RUSH", "MERGE", "LANE"] },
    { category: "Spreads", words: ["JELLY", "HONEY", "BUTTER", "HUMMUS"] },
    { category: "Basketball", words: ["DUNK", "DRIBBLE", "ASSIST", "REBOUND"] },
    { category: "Office supplies", words: ["TONER", "STAPLE", "PAPER", "INK"] },
  ]},
  { id: "bill", groups: [
    { category: "Parts of a bird", words: ["BILL", "WING", "TALON", "PLUME"] },
    { category: "At a restaurant", words: ["MENU", "TIP", "TABLE", "CHECK"] },
    { category: "Chess", words: ["PAWN", "MATE", "CASTLE", "RANK"] },
    { category: "Currencies", words: ["PESO", "EURO", "YEN", "RAND"] },
  ]},
  { id: "ball", groups: [
    { category: "___ BALL", words: ["BASE", "BASKET", "FOOT", "EYE"] },
    { category: "Planets", words: ["MARS", "VENUS", "SATURN", "NEPTUNE"] },
    { category: "Coffee drinks", words: ["LATTE", "MOCHA", "ESPRESSO", "CORTADO"] },
    { category: "Card suits", words: ["HEART", "SPADE", "CLUB", "DIAMOND"] },
  ]},
  { id: "berry", groups: [
    { category: "___ BERRY", words: ["STRAW", "BLUE", "RASP", "BLACK"] },
    { category: "Keyboard keys", words: ["SHIFT", "ENTER", "SPACE", "TAB"] },
    { category: "Dog breeds", words: ["BOXER", "POODLE", "BEAGLE", "HUSKY"] },
    { category: "Units of time", words: ["SECOND", "MINUTE", "HOUR", "DECADE"] },
  ]},
  { id: "storm", groups: [
    { category: "Types of bread", words: ["RYE", "NAAN", "PITA", "BAGEL"] },
    { category: "___ STORM", words: ["BRAIN", "THUNDER", "SAND", "SNOW"] },
    { category: "Greek letters", words: ["ALPHA", "BETA", "DELTA", "OMEGA"] },
    { category: "Playing cards", words: ["JACK", "QUEEN", "KING", "ACE"] },
  ]},
  { id: "drop", groups: [
    { category: "___ DROP", words: ["RAIN", "DEW", "TEAR", "GUM"] },
    { category: "Desserts", words: ["TIRAMISU", "GELATO", "MOUSSE", "SORBET"] },
    { category: "Constellations", words: ["ORION", "LYRA", "DRACO", "LEO"] },
    { category: "Tools", words: ["HAMMER", "WRENCH", "PLIERS", "DRILL"] },
  ]},
  { id: "black", groups: [
    { category: "BLACK ___", words: ["BIRD", "BOARD", "SMITH", "OUT"] },
    { category: "Root vegetables", words: ["CARROT", "TURNIP", "RADISH", "BEET"] },
    { category: "Card games", words: ["POKER", "BRIDGE", "RUMMY", "HEARTS"] },
    { category: "Sea creatures", words: ["SQUID", "PRAWN", "WHALE", "OYSTER"] },
  ]},
  { id: "board", groups: [
    { category: "___ BOARD", words: ["KEY", "SURF", "CARD", "CHALK"] },
    { category: "Shades of red", words: ["CRIMSON", "SCARLET", "MAROON", "CORAL"] },
    { category: "Months", words: ["MARCH", "MAY", "JUNE", "APRIL"] },
    { category: "Grains", words: ["WHEAT", "CORN", "BARLEY", "OATS"] },
  ]},
  { id: "pot", groups: [
    { category: "___ POT", words: ["JACK", "TEA", "CROCK", "HOT"] },
    { category: "Languages", words: ["FRENCH", "HINDI", "ARABIC", "ZULU"] },
    { category: "Bicycle parts", words: ["PEDAL", "CHAIN", "BRAKE", "SADDLE"] },
    { category: "Cloud types", words: ["CIRRUS", "STRATUS", "CUMULUS", "NIMBUS"] },
  ]},
  { id: "stick", groups: [
    { category: "___ STICK", words: ["CHOP", "DRUM", "LIP", "YARD"] },
    { category: "Winter gear", words: ["SCARF", "MITTEN", "PARKA", "BOOTS"] },
    { category: "Fish", words: ["TROUT", "SALMON", "MARLIN", "PERCH"] },
    { category: "Countries", words: ["BRAZIL", "KENYA", "NEPAL", "CHILE"] },
  ]},
  { id: "hand", groups: [
    { category: "HAND ___", words: ["SHAKE", "BAG", "CUFF", "MADE"] },
    { category: "Cocktails", words: ["MOJITO", "MARTINI", "MARGARITA", "NEGRONI"] },
    { category: "Capital cities", words: ["TOKYO", "CAIRO", "LIMA", "OSLO"] },
    { category: "Dances", words: ["SALSA", "TANGO", "WALTZ", "RUMBA"] },
  ]},
  { id: "proof", groups: [
    { category: "___ PROOF", words: ["WATER", "BULLET", "FOOL", "CHILD"] },
    { category: "Elements", words: ["IRON", "GOLD", "NEON", "ZINC"] },
    { category: "Beehive words", words: ["HONEY", "QUEEN", "DRONE", "SWARM"] },
    { category: "Pastries", words: ["SCONE", "DONUT", "ECLAIR", "STRUDEL"] },
  ]},
  { id: "over", groups: [
    { category: "OVER ___", words: ["FLOW", "COAT", "TIME", "LOAD"] },
    { category: "Spices", words: ["CUMIN", "PAPRIKA", "NUTMEG", "CLOVE"] },
    { category: "Tennis words", words: ["RACKET", "NET", "COURT", "SERVE"] },
    { category: "Moons", words: ["LUNA", "TITAN", "EUROPA", "PHOBOS"] },
  ]},
  // ---- Red-herring puzzles (Connections-style): each has words that LOOK like
  // they belong to another group in the same puzzle, but resolve to exactly one.
  { id: "greens", groups: [
    { category: "Shades of green", words: ["OLIVE", "JADE", "FOREST", "TEAL"] },
    { category: "Fruits", words: ["PLUM", "PEACH", "LIME", "GRAPE"] },
    { category: "___ TREE", words: ["PALM", "PINE", "GUM", "FIR"] },
    { category: "Types of tea", words: ["CHAI", "OOLONG", "HERBAL", "MATCHA"] },
  ]},
  { id: "bass", groups: [
    { category: "Fish", words: ["BASS", "SOLE", "PIKE", "TROUT"] },
    { category: "Music terms", words: ["TREBLE", "TENOR", "TEMPO", "CHORD"] },
    { category: "Boxing", words: ["JAB", "HOOK", "BOUT", "SPAR"] },
    { category: "Card games", words: ["RUMMY", "POKER", "WHIST", "BRIDGE"] },
  ]},
  { id: "orbit", groups: [
    { category: "___ FISH", words: ["STAR", "JELLY", "SWORD", "CAT"] },
    { category: "Space", words: ["COMET", "GALAXY", "NEBULA", "QUASAR"] },
    { category: "Playground", words: ["SWING", "SLIDE", "SEESAW", "MONKEY"] },
    { category: "___ BAR", words: ["CANDY", "CROW", "SAND", "SPACE"] },
  ]},
  { id: "iron", groups: [
    { category: "Elements", words: ["IRON", "ZINC", "NEON", "ARGON"] },
    { category: "Monopoly tokens", words: ["THIMBLE", "BOOT", "HAT", "DOG"] },
    { category: "Card-play verbs", words: ["DEAL", "SHUFFLE", "TRUMP", "BLUFF"] },
    { category: "Ways to walk", words: ["STROLL", "AMBLE", "TRUDGE", "STRUT"] },
  ]},
  { id: "timber", groups: [
    { category: "Dog sounds", words: ["BARK", "GROWL", "YELP", "HOWL"] },
    { category: "Tree parts", words: ["TRUNK", "ROOT", "BRANCH", "TWIG"] },
    { category: "At the bank", words: ["TELLER", "LOAN", "VAULT", "DEPOSIT"] },
    { category: "Elephant features", words: ["TUSK", "IVORY", "HERD", "TRUMPET"] },
  ]},
  { id: "lamp", groups: [
    { category: "___ HOUSE", words: ["LIGHT", "WARE", "OUT", "GREEN"] },
    { category: "Colors", words: ["AMBER", "CORAL", "RUST", "TAUPE"] },
    { category: "Not heavy", words: ["AIRY", "SLIGHT", "FLIMSY", "FEATHERY"] },
    { category: "Traffic words", words: ["STOP", "YIELD", "MERGE", "SIGNAL"] },
  ]},
  { id: "wrist", groups: [
    { category: "Parts of the hand", words: ["PALM", "THUMB", "KNUCKLE", "CUFF"] },
    { category: "Trees", words: ["OAK", "BIRCH", "MAPLE", "ASPEN"] },
    { category: "Card moves", words: ["CUT", "FORCE", "RIFFLE", "STACK"] },
    { category: "Yoga poses", words: ["PLANK", "LUNGE", "SQUAT", "CRUNCH"] },
  ]},
  { id: "herb", groups: [
    { category: "Herbs", words: ["MINT", "BASIL", "THYME", "DILL"] },
    { category: "Earthy colors", words: ["SAGE", "OCHRE", "SIENNA", "UMBER"] },
    { category: "A wise person", words: ["SEER", "GURU", "ORACLE", "PUNDIT"] },
    { category: "Sewing box", words: ["NEEDLE", "SPOOL", "PIN", "BOBBIN"] },
  ]},
  { id: "genre", groups: [
    { category: "Book genres", words: ["MYSTERY", "ROMANCE", "THRILLER", "FANTASY"] },
    { category: "Means brand-new", words: ["NOVEL", "FRESH", "RECENT", "MODERN"] },
    { category: "Party games", words: ["CHARADES", "TABOO", "TWISTER", "CLUE"] },
    { category: "Spicy / bold", words: ["FIERY", "ZESTY", "PIQUANT", "TANGY"] },
  ]},
  { id: "gem", groups: [
    { category: "Baseball", words: ["DIAMOND", "PITCH", "BASE", "BUNT"] },
    { category: "Gems", words: ["RUBY", "PEARL", "OPAL", "TOPAZ"] },
    { category: "Shapes", words: ["OVAL", "PRISM", "CONE", "RHOMBUS"] },
    { category: "Tools", words: ["WRENCH", "CHISEL", "PLIERS", "MALLET"] },
  ]},

  { id: "snow", groups: [
    { category: "SNOW ___", words: ["BALL", "FLAKE", "STORM", "DRIFT"] },
    { category: "___ BALL", words: ["BASE", "FOOT", "EYE", "ODD"] },
    { category: "Card games", words: ["POKER", "BRIDGE", "RUMMY", "WHIST"] },
    { category: "Shades of blue", words: ["NAVY", "AZURE", "COBALT", "TEAL"] },
  ]},
  { id: "waterfront", groups: [
    { category: "WATER ___", words: ["MELON", "SHED", "FRONT", "MARK"] },
    { category: "___ WORK", words: ["NET", "HOME", "FIRE", "FRAME"] },
    { category: "Big cats", words: ["PUMA", "LYNX", "COUGAR", "JAGUAR"] },
    { category: "Chess pieces", words: ["KING", "QUEEN", "ROOK", "PAWN"] },
  ]},
  { id: "daylight", groups: [
    { category: "___ LIGHT", words: ["DAY", "SPOT", "MOON", "STAR"] },
    { category: "LIGHT ___", words: ["HOUSE", "WEIGHT", "YEAR", "SWITCH"] },
    { category: "Units of length", words: ["METER", "MILE", "YARD", "INCH"] },
    { category: "Shades of green", words: ["OLIVE", "MINT", "LIME", "JADE"] },
  ]},
  { id: "campfire", groups: [
    { category: "FIRE ___", words: ["PLACE", "WOOD", "ARM", "SIDE"] },
    { category: "___ FIRE", words: ["CAMP", "BON", "CROSS", "BACK"] },
    { category: "Ballroom dances", words: ["SALSA", "TANGO", "WALTZ", "RUMBA"] },
    { category: "Pizza toppings", words: ["ONION", "PEPPER", "BACON", "OLIVE"] },
  ]},
  { id: "sunshine", groups: [
    { category: "SUN ___", words: ["FLOWER", "RISE", "BURN", "DIAL"] },
    { category: "___ SHINE", words: ["MOON", "SUN", "OUT", "SHOE"] },
    { category: "Citrus fruits", words: ["LEMON", "LIME", "ORANGE", "CITRON"] },
    { category: "Planets", words: ["VENUS", "MARS", "SATURN", "NEPTUNE"] },
  ]},
  { id: "racecar", groups: [
    { category: "RACE ___", words: ["TRACK", "HORSE", "CAR", "WAY"] },
    { category: "Palindromes", words: ["LEVEL", "KAYAK", "CIVIC", "RADAR"] },
    { category: "Types of bridge", words: ["ARCH", "BEAM", "TRUSS", "CABLE"] },
    { category: "Knots", words: ["HITCH", "BOWLINE", "CLOVE", "REEF"] },
  ]},
  { id: "keystone", groups: [
    { category: "KEY ___", words: ["BOARD", "HOLE", "STONE", "NOTE"] },
    { category: "Piano parts", words: ["PEDAL", "HAMMER", "STRING", "LID"] },
    { category: "___ STROKE", words: ["BACK", "BREAST", "SUN", "KEY"] },
    { category: "Office supplies", words: ["STAPLER", "FOLDER", "MARKER", "CLIP"] },
  ]},
  { id: "raincloud", groups: [
    { category: "RAIN ___", words: ["BOW", "COAT", "DROP", "FOREST"] },
    { category: "___ STORM", words: ["THUNDER", "BRAIN", "SAND", "HAIL"] },
    { category: "Umbrella parts", words: ["CANOPY", "RIB", "SHAFT", "HANDLE"] },
    { category: "Cloud types", words: ["CIRRUS", "CUMULUS", "STRATUS", "NIMBUS"] },
  ]},
  { id: "cupfinal", groups: [
    { category: "CUP ___", words: ["CAKE", "BOARD", "HOLDER", "FINAL"] },
    { category: "Baking measures", words: ["TEASPOON", "OUNCE", "PINCH", "DASH"] },
    { category: "At a birthday", words: ["BALLOON", "CANDLE", "GIFT", "CONFETTI"] },
    { category: "Frosting flavors", words: ["VANILLA", "MOCHA", "LEMON", "CARAMEL"] },
  ]},
  { id: "pinball", groups: [
    { category: "Sports with a net", words: ["TENNIS", "VOLLEY", "BADMINTON", "HOCKEY"] },
    { category: "___ BALL", words: ["FOOT", "BASKET", "PADDLE", "PIN"] },
    { category: "Track & field", words: ["JAVELIN", "HURDLES", "DISCUS", "RELAY"] },
    { category: "Boxing terms", words: ["JAB", "HOOK", "BOUT", "ROUND"] },
  ]},
  { id: "moonbeam", groups: [
    { category: "MOON ___", words: ["WALK", "BEAM", "SHOT", "RISE"] },
    { category: "Dance moves", words: ["SPIN", "DIP", "SLIDE", "TWIRL"] },
    { category: "Apollo mission", words: ["ROCKET", "LANDER", "CAPSULE", "LAUNCH"] },
    { category: "Moon phases", words: ["FULL", "NEW", "WAXING", "GIBBOUS"] },
  ]},
  { id: "seahorse", groups: [
    { category: "SEA ___", words: ["SHELL", "WEED", "HORSE", "SHORE"] },
    { category: "Beach gear", words: ["TOWEL", "COOLER", "UMBRELLA", "BUCKET"] },
    { category: "Crustaceans", words: ["CRAB", "LOBSTER", "SHRIMP", "PRAWN"] },
    { category: "Shades of beige", words: ["TAN", "SAND", "CREAM", "KHAKI"] },
  ]},
  { id: "greenback", groups: [
    { category: "GREEN ___", words: ["HOUSE", "HORN", "LAND", "BACK"] },
    { category: "Garden tools", words: ["TROWEL", "RAKE", "SPADE", "HOE"] },
    { category: "Salad leaves", words: ["ROMAINE", "ARUGULA", "SPINACH", "KALE"] },
    { category: "___ HOUSE", words: ["LIGHT", "WARE", "COURT", "PENT"] },
  ]},
  { id: "backbone", groups: [
    { category: "BACK ___", words: ["PACK", "BONE", "DROP", "FIRE"] },
    { category: "Hiking gear", words: ["COMPASS", "CANTEEN", "MAP", "BOOTS"] },
    { category: "___ BONE", words: ["JAW", "WISH", "COLLAR", "TAIL"] },
    { category: "Mountains", words: ["EVEREST", "FUJI", "DENALI", "RAINIER"] },
  ]},
  { id: "notecard", groups: [
    { category: "NOTE ___", words: ["BOOK", "PAD", "WORTHY", "CARD"] },
    { category: "Musical notes", words: ["WHOLE", "HALF", "QUARTER", "EIGHTH"] },
    { category: "Paper sizes", words: ["LETTER", "LEGAL", "LEDGER", "TABLOID"] },
    { category: "Writing tools", words: ["PEN", "PENCIL", "CRAYON", "QUILL"] },
  ]},
  { id: "goldmine", groups: [
    { category: "GOLD ___", words: ["FISH", "SMITH", "MINE", "RUSH"] },
    { category: "Aquarium fish", words: ["GUPPY", "TETRA", "BETTA", "ANGEL"] },
    { category: "Precious metals", words: ["SILVER", "PLATINUM", "COPPER", "TITANIUM"] },
    { category: "Gemstones", words: ["RUBY", "PEARL", "OPAL", "JADE"] },
  ]},
  { id: "spacebar", groups: [
    { category: "SPACE ___", words: ["SHIP", "SUIT", "BAR", "CRAFT"] },
    { category: "Constellations", words: ["ORION", "LYRA", "DRACO", "LEO"] },
    { category: "Sci-fi films", words: ["ALIEN", "MATRIX", "AVATAR", "DUNE"] },
    { category: "___ CRAFT", words: ["AIR", "HOVER", "WITCH", "WAR"] },
  ]},
];

// Build a Categories puzzle. Prefer a curated puzzle we haven't shown recently
// (that's where the cleverness lives); if the whole bank is exhausted by the
// avoid list, fall back to four non-overlapping themed banks.
export const generateCategories = (
  config: { mistakes: number; trickiness: number },
  seed: number,
  avoidIds: string[] = []
): CategoriesPuzzle => {
  const rand = rng(seed);
  // Difficulty ramp (trickiness 0 = easiest .. 1 = hardest). The curated bank is
  // the CLEVER set — overlapping, red-herring groups (hard). The themed generator
  // makes four clearly-distinct, non-overlapping groups (easy). So at low
  // trickiness (early Story levels) we almost always use the easy themed puzzles,
  // and as trickiness rises (later levels) we increasingly draw the clever
  // curated puzzles. Deterministic per seed.
  const useCurated = rand() < config.trickiness;
  if (useCurated) {
    const avoid = new Set(avoidIds);
    const fresh = CATEGORIES_PUZZLES.filter((p) => !avoid.has(p.id));
    const bank = fresh.length > 0 ? fresh : CATEGORIES_PUZZLES;
    const pick = bank[Math.floor(rand() * bank.length)];
    if (pick) {
      const groups = pick.groups.map((g) => ({ ...g, words: [...g.words] }));
      const tiles = shuffle(
        groups.flatMap((g) => g.words),
        rand
      );
      return { id: pick.id, groups, tiles, mistakes: config.mistakes };
    }
  }
  return generateCategoriesThemed(config, seed);
};

// Fallback: four DISTINCT, non-overlapping themed banks. We keep an exclusion
// map so we never pair banks that share members (e.g. Animals + Birds), which
// would make a tile ambiguous.
const THEME_EXCLUSIONS: Record<string, string[]> = {
  Animals: ["Birds", "Insects", "Reptiles", "Ocean", "Fish"],
  Birds: ["Animals"],
  Insects: ["Animals"],
  Reptiles: ["Animals"],
  Ocean: ["Animals", "Fish"],
  Fruits: ["Food", "Desserts", "Breakfast"],
  Vegetables: ["Food", "Garden"],
  Food: ["Fruits", "Vegetables", "Desserts", "Breakfast", "Beverages"],
  Desserts: ["Food", "Fruits", "Beverages", "Breakfast"],
  Beverages: ["Food", "Desserts", "Breakfast"],
  Breakfast: ["Food", "Fruits", "Desserts", "Beverages"],
  Colors: ["Gemstones"],
  Gemstones: ["Colors", "Metals"],
  Metals: ["Gemstones"],
  Flowers: ["Garden", "Nature", "Trees"],
  Trees: ["Nature", "Flowers", "Garden"],
  Garden: ["Flowers", "Trees", "Vegetables", "Nature"],
  Nature: ["Flowers", "Trees", "Garden", "Weather"],
  Weather: ["Nature", "Space", "Winter"],
  Space: ["Science", "Weather"],
  Science: ["Space"],
  Winter: ["Weather"],
};

const generateCategoriesThemed = (
  config: { mistakes: number; trickiness: number },
  seed: number
): CategoriesPuzzle => {
  const rand = rng(seed);
  const themeNames = shuffle(Object.keys(THEMES), rand);
  const used = new Set<string>();
  const chosen: string[] = [];
  const groups: CategoryGroup[] = [];
  for (const name of themeNames) {
    if (groups.length >= 4) break;
    // Skip a theme that overlaps one we already picked.
    const clashes = chosen.some((c) =>
      (THEME_EXCLUSIONS[c] || []).includes(name) ||
      (THEME_EXCLUSIONS[name] || []).includes(c)
    );
    if (clashes) continue;
    const pool = shuffle(
      THEMES[name].filter((w) => w.length <= 8 && !used.has(w)),
      rand
    );
    if (pool.length < 4) continue;
    const words = pool.slice(0, 4);
    words.forEach((w) => used.add(w));
    chosen.push(name);
    groups.push({ category: name, words });
  }
  const tiles = shuffle(
    groups.flatMap((g) => g.words),
    rand
  );
  return { groups, tiles, mistakes: config.mistakes };
};

// Exposed so Story Mode can avoid repeating recent categories puzzles and tests
// can enumerate the bank.
export const CATEGORIES_PUZZLE_IDS = CATEGORIES_PUZZLES.map((p) => p.id);
