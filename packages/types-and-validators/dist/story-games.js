"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
exports.CATEGORIES_PUZZLE_IDS = exports.generateCategories = exports.scoreWordsyGuess = exports.generateWordsy = void 0;
var word_search_1 = require("./word-search");
// Two extra Story-Mode game types, generated entirely from original word lists
// (Wordsy) and original hand-authored puzzles (Categories). Deterministic from a
// seed so a level reproduces on demand, but Story Mode passes a random seed each
// play for variety at a fixed difficulty, plus an "avoid" list so the same
// puzzle doesn't come up twice in a row.
var rng = function (seed) {
    var s = seed >>> 0 || 1;
    var step = function () {
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
    return function () {
        step();
        // Divide by 2^32 (not 2^32-1) so the result is in [0, 1) — dividing by
        // 0xffffffff can return exactly 1.0 at max state, which makes callers like
        // Math.floor(rand()*len) index out of bounds.
        return s / 0x100000000;
    };
};
var shuffle = function (arr, rand) {
    var _a;
    var a = __spreadArray([], arr, true);
    for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(rand() * (i + 1));
        _a = [a[j], a[i]], a[i] = _a[0], a[j] = _a[1];
    }
    return a;
};
// ---- Wordsy (guess the hidden word) --------------------------------------
// Common everyday words by length, used as the answer pool. Guesses aren't
// dictionary-validated (any word of the right length is accepted), so no large
// dictionary needs to ship. Big pools so replays rarely repeat.
var WORDSY_WORDS = {
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
    ]
};
var generateWordsy = function (config, seed, avoid) {
    var _a;
    if (avoid === void 0) { avoid = []; }
    var rand = rng(seed);
    var full = (_a = WORDSY_WORDS[config.length]) !== null && _a !== void 0 ? _a : WORDSY_WORDS[5];
    var avoidSet = new Set(avoid.map(function (w) { return w.toUpperCase(); }));
    // Prefer a word we haven't shown recently; fall back to the full pool.
    var pool = full.filter(function (w) { return !avoidSet.has(w); });
    var use = pool.length > 0 ? pool : full;
    var answer = use[Math.floor(rand() * use.length)];
    return { answer: answer, length: config.length, maxGuesses: config.maxGuesses };
};
exports.generateWordsy = generateWordsy;
// Per-guess feedback: 2 = correct spot, 1 = in word wrong spot, 0 = not in word.
// Standard two-pass scoring so duplicate letters resolve correctly.
var scoreWordsyGuess = function (guess, answer) {
    var n = answer.length;
    var res = new Array(n).fill(0);
    var counts = {};
    for (var i = 0; i < n; i++)
        counts[answer[i]] = (counts[answer[i]] || 0) + 1;
    for (var i = 0; i < n; i++) {
        if (guess[i] === answer[i]) {
            res[i] = 2;
            counts[guess[i]]--;
        }
    }
    for (var i = 0; i < n; i++) {
        if (res[i] === 0 && counts[guess[i]] > 0) {
            res[i] = 1;
            counts[guess[i]]--;
        }
    }
    return res;
};
exports.scoreWordsyGuess = scoreWordsyGuess;
var CATEGORIES_PUZZLES = [
    { id: "ball", groups: [
            { category: "___ BALL", words: ["BASE", "BASKET", "FOOT", "EYE"] },
            { category: "Planets", words: ["MARS", "VENUS", "SATURN", "NEPTUNE"] },
            { category: "Coffee drinks", words: ["LATTE", "MOCHA", "ESPRESSO", "CORTADO"] },
            { category: "Card suits", words: ["HEART", "SPADE", "CLUB", "DIAMOND"] },
        ] },
    { id: "fly", groups: [
            { category: "___ FLY", words: ["BUTTER", "DRAGON", "FIRE", "HORSE"] },
            { category: "Shades of blue", words: ["NAVY", "AZURE", "COBALT", "TEAL"] },
            { category: "Chess pieces", words: ["KING", "QUEEN", "ROOK", "BISHOP"] },
            { category: "Pizza toppings", words: ["OLIVE", "PEPPER", "ONION", "BACON"] },
        ] },
    { id: "berry", groups: [
            { category: "___ BERRY", words: ["STRAW", "BLUE", "RASP", "BLACK"] },
            { category: "Keyboard keys", words: ["SHIFT", "ENTER", "SPACE", "TAB"] },
            { category: "Dog breeds", words: ["BOXER", "POODLE", "BEAGLE", "HUSKY"] },
            { category: "Units of time", words: ["SECOND", "MINUTE", "HOUR", "DECADE"] },
        ] },
    { id: "work", groups: [
            { category: "___ WORK", words: ["HOME", "NET", "ART", "FRAME"] },
            { category: "Herbs", words: ["BASIL", "THYME", "SAGE", "MINT"] },
            { category: "Boxing terms", words: ["JAB", "HOOK", "CROSS", "BOUT"] },
            { category: "Rivers", words: ["NILE", "AMAZON", "THAMES", "VOLGA"] },
        ] },
    { id: "storm", groups: [
            { category: "Types of bread", words: ["RYE", "NAAN", "PITA", "BAGEL"] },
            { category: "___ STORM", words: ["BRAIN", "THUNDER", "SAND", "SNOW"] },
            { category: "Greek letters", words: ["ALPHA", "BETA", "DELTA", "OMEGA"] },
            { category: "Playing cards", words: ["JACK", "QUEEN", "KING", "ACE"] },
        ] },
    { id: "ship", groups: [
            { category: "___ SHIP", words: ["FRIEND", "HARD", "CHAMPION", "PARTNER"] },
            { category: "Sushi", words: ["TUNA", "EEL", "ROLL", "CRAB"] },
            { category: "Mountains", words: ["EVEREST", "DENALI", "FUJI", "RAINIER"] },
            { category: "Emotions", words: ["JOY", "ANGER", "FEAR", "PRIDE"] },
        ] },
    { id: "cake", groups: [
            { category: "___ CAKE", words: ["PAN", "CUP", "CHEESE", "FISH"] },
            { category: "Nuts", words: ["ALMOND", "CASHEW", "PECAN", "WALNUT"] },
            { category: "Wind instruments", words: ["FLUTE", "OBOE", "CLARINET", "TUBA"] },
            { category: "Continents", words: ["ASIA", "EUROPE", "AFRICA", "OCEANIA"] },
        ] },
    { id: "room", groups: [
            { category: "___ ROOM", words: ["BED", "BATH", "CLASS", "MUSH"] },
            { category: "Precious stones", words: ["RUBY", "PEARL", "OPAL", "JADE"] },
            { category: "Tennis terms", words: ["ACE", "LOVE", "SET", "FAULT"] },
            { category: "Farm animals", words: ["COW", "GOAT", "SHEEP", "HEN"] },
        ] },
    { id: "rain", groups: [
            { category: "RAIN ___", words: ["BOW", "COAT", "FALL", "DROP"] },
            { category: "Spanish numbers", words: ["UNO", "DOS", "TRES", "CUATRO"] },
            { category: "Trees", words: ["OAK", "PINE", "BIRCH", "MAPLE"] },
            { category: "Dances", words: ["SALSA", "TANGO", "WALTZ", "RUMBA"] },
        ] },
    { id: "fish", groups: [
            { category: "___ FISH", words: ["JELLY", "STAR", "SWORD", "CAT"] },
            { category: "Currencies", words: ["EURO", "YEN", "PESO", "RUPEE"] },
            { category: "Superhero gear", words: ["CAPE", "MASK", "HERO", "POWER"] },
            { category: "Body parts", words: ["ANKLE", "ELBOW", "WRIST", "SHIN"] },
        ] },
    { id: "fire", groups: [
            { category: "FIRE ___", words: ["PLACE", "WOOD", "WORKS", "FLIES"] },
            { category: "Pasta shapes", words: ["PENNE", "ZITI", "FUSILLI", "ORZO"] },
            { category: "Weather", words: ["SLEET", "HAIL", "FOG", "FROST"] },
            { category: "Roman gods", words: ["JUNO", "MARS", "VENUS", "APOLLO"] },
        ] },
    { id: "line", groups: [
            { category: "___ LINE", words: ["DEAD", "COAST", "OUT", "TIME"] },
            { category: "Cheeses", words: ["BRIE", "GOUDA", "FETA", "SWISS"] },
            { category: "Martial arts", words: ["KARATE", "JUDO", "AIKIDO", "SUMO"] },
            { category: "Birds", words: ["ROBIN", "FINCH", "WREN", "HERON"] },
        ] },
    { id: "sun", groups: [
            { category: "SUN ___", words: ["FLOWER", "SHINE", "RISE", "BURN"] },
            { category: "Kitchen tools", words: ["WHISK", "LADLE", "GRATER", "TONGS"] },
            { category: "Poker hands", words: ["PAIR", "FLUSH", "STRAIGHT", "ROYAL"] },
            { category: "Insects", words: ["ANT", "BEE", "MOTH", "WASP"] },
        ] },
    { id: "case", groups: [
            { category: "___ CASE", words: ["BRIEF", "SUIT", "STAIR", "BOOK"] },
            { category: "Oceans", words: ["PACIFIC", "ATLANTIC", "INDIAN", "ARCTIC"] },
            { category: "Painting gear", words: ["BRUSH", "EASEL", "PALETTE", "CANVAS"] },
            { category: "Citrus fruits", words: ["LEMON", "LIME", "ORANGE", "KUMQUAT"] },
        ] },
    { id: "man", groups: [
            { category: "___ MAN", words: ["SNOW", "POST", "FIRE", "SPIDER"] },
            { category: "Salad greens", words: ["KALE", "SPINACH", "ARUGULA", "ROMAINE"] },
            { category: "Piano parts", words: ["KEY", "PEDAL", "CHORD", "SCALE"] },
            { category: "Reptiles", words: ["GECKO", "IGUANA", "COBRA", "SKINK"] },
        ] },
    { id: "drop", groups: [
            { category: "___ DROP", words: ["RAIN", "DEW", "TEAR", "GUM"] },
            { category: "Desserts", words: ["TIRAMISU", "GELATO", "MOUSSE", "SORBET"] },
            { category: "Constellations", words: ["ORION", "LYRA", "DRACO", "LEO"] },
            { category: "Tools", words: ["HAMMER", "WRENCH", "PLIERS", "DRILL"] },
        ] },
    { id: "board", groups: [
            { category: "___ BOARD", words: ["KEY", "SURF", "CARD", "CHALK"] },
            { category: "Shades of red", words: ["CRIMSON", "SCARLET", "RUBY", "CORAL"] },
            { category: "Months", words: ["MARCH", "MAY", "JUNE", "APRIL"] },
            { category: "Grains", words: ["WHEAT", "CORN", "BARLEY", "OATS"] },
        ] },
    { id: "hand", groups: [
            { category: "HAND ___", words: ["SHAKE", "BAG", "CUFF", "MADE"] },
            { category: "Cocktails", words: ["MOJITO", "MARTINI", "MARGARITA", "NEGRONI"] },
            { category: "Capital cities", words: ["TOKYO", "CAIRO", "LIMA", "OSLO"] },
            { category: "Fabrics", words: ["SILK", "WOOL", "LINEN", "DENIM"] },
        ] },
    { id: "proof", groups: [
            { category: "___ PROOF", words: ["WATER", "BULLET", "FOOL", "CHILD"] },
            { category: "Elements", words: ["IRON", "GOLD", "NEON", "ZINC"] },
            { category: "Beehive words", words: ["HONEY", "QUEEN", "DRONE", "SWARM"] },
            { category: "Pastries", words: ["SCONE", "DONUT", "ECLAIR", "STRUDEL"] },
        ] },
    { id: "stick", groups: [
            { category: "___ STICK", words: ["CHOP", "DRUM", "LIP", "YARD"] },
            { category: "Winter gear", words: ["SCARF", "MITTEN", "PARKA", "BOOTS"] },
            { category: "Fish", words: ["TROUT", "SALMON", "BASS", "PERCH"] },
            { category: "Countries", words: ["BRAZIL", "KENYA", "NEPAL", "CHILE"] },
        ] },
    { id: "over", groups: [
            { category: "OVER ___", words: ["FLOW", "COAT", "TIME", "LOAD"] },
            { category: "Spices", words: ["CUMIN", "PAPRIKA", "NUTMEG", "CLOVE"] },
            { category: "Tennis words", words: ["RACKET", "NET", "COURT", "SERVE"] },
            { category: "Moons", words: ["LUNA", "TITAN", "EUROPA", "PHOBOS"] },
        ] },
    { id: "black", groups: [
            { category: "BLACK ___", words: ["BIRD", "BOARD", "SMITH", "OUT"] },
            { category: "Root vegetables", words: ["CARROT", "TURNIP", "RADISH", "BEET"] },
            { category: "Card games", words: ["POKER", "BRIDGE", "RUMMY", "HEARTS"] },
            { category: "Sea creatures", words: ["SQUID", "CORAL", "PRAWN", "WHALE"] },
        ] },
    { id: "pot", groups: [
            { category: "___ POT", words: ["JACK", "TEA", "CROCK", "HOT"] },
            { category: "Languages", words: ["FRENCH", "HINDI", "ARABIC", "ZULU"] },
            { category: "Bicycle parts", words: ["PEDAL", "CHAIN", "BRAKE", "SADDLE"] },
            { category: "Cloud types", words: ["CIRRUS", "STRATUS", "CUMULUS", "NIMBUS"] },
        ] },
    { id: "light", groups: [
            { category: "___ LIGHT", words: ["MOON", "SPOT", "DAY", "STAR"] },
            { category: "Billiards words", words: ["CUE", "RACK", "POCKET", "BREAK"] },
            { category: "Seeds", words: ["PEANUT", "SESAME", "POPPY", "FLAX"] },
            { category: "Dog commands", words: ["SIT", "STAY", "HEEL", "FETCH"] },
        ] },
];
// Build a Categories puzzle. Prefer a curated puzzle we haven't shown recently
// (that's where the cleverness lives); if the whole bank is exhausted by the
// avoid list, fall back to four non-overlapping themed banks.
var generateCategories = function (config, seed, avoidIds) {
    if (avoidIds === void 0) { avoidIds = []; }
    var rand = rng(seed);
    var avoid = new Set(avoidIds);
    var fresh = CATEGORIES_PUZZLES.filter(function (p) { return !avoid.has(p.id); });
    var bank = fresh.length > 0 ? fresh : CATEGORIES_PUZZLES;
    var pick = bank[Math.floor(rand() * bank.length)];
    if (pick) {
        var groups = pick.groups.map(function (g) { return (__assign(__assign({}, g), { words: __spreadArray([], g.words, true) })); });
        var tiles = shuffle(groups.flatMap(function (g) { return g.words; }), rand);
        return { id: pick.id, groups: groups, tiles: tiles, mistakes: config.mistakes };
    }
    return generateCategoriesThemed(config, seed);
};
exports.generateCategories = generateCategories;
// Fallback: four DISTINCT, non-overlapping themed banks. We keep an exclusion
// map so we never pair banks that share members (e.g. Animals + Birds), which
// would make a tile ambiguous.
var THEME_EXCLUSIONS = {
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
    Winter: ["Weather"]
};
var generateCategoriesThemed = function (config, seed) {
    var rand = rng(seed);
    var themeNames = shuffle(Object.keys(word_search_1.THEMES), rand);
    var used = new Set();
    var chosen = [];
    var groups = [];
    var _loop_1 = function (name) {
        if (groups.length >= 4)
            return "break";
        // Skip a theme that overlaps one we already picked.
        var clashes = chosen.some(function (c) {
            return (THEME_EXCLUSIONS[c] || []).includes(name) ||
                (THEME_EXCLUSIONS[name] || []).includes(c);
        });
        if (clashes)
            return "continue";
        var pool = shuffle(word_search_1.THEMES[name].filter(function (w) { return w.length <= 8 && !used.has(w); }), rand);
        if (pool.length < 4)
            return "continue";
        var words = pool.slice(0, 4);
        words.forEach(function (w) { return used.add(w); });
        chosen.push(name);
        groups.push({ category: name, words: words });
    };
    for (var _i = 0, themeNames_1 = themeNames; _i < themeNames_1.length; _i++) {
        var name = themeNames_1[_i];
        var state_1 = _loop_1(name);
        if (state_1 === "break")
            break;
    }
    var tiles = shuffle(groups.flatMap(function (g) { return g.words; }), rand);
    return { groups: groups, tiles: tiles, mistakes: config.mistakes };
};
// Exposed so Story Mode can avoid repeating recent categories puzzles and tests
// can enumerate the bank.
exports.CATEGORIES_PUZZLE_IDS = CATEGORIES_PUZZLES.map(function (p) { return p.id; });
