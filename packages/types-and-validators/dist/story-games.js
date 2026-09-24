"use strict";
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
exports.generateCategories = exports.scoreWordsyGuess = exports.generateWordsy = void 0;
var word_search_1 = require("./word-search");
// Two extra Story-Mode game types, generated entirely from original word lists
// (Wordsy) and the existing themed banks (Categories). Deterministic from a seed
// so a level reproduces on demand, but Story Mode passes a random seed each play
// for variety at a fixed difficulty.
var rng = function (seed) {
    var s = seed >>> 0 || 1;
    return function () {
        s ^= s << 13;
        s ^= s >>> 17;
        s ^= s << 5;
        s >>>= 0;
        return s / 0xffffffff;
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
// dictionary needs to ship.
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
    ]
};
var generateWordsy = function (config, seed) {
    var _a;
    var rand = rng(seed);
    var pool = (_a = WORDSY_WORDS[config.length]) !== null && _a !== void 0 ? _a : WORDSY_WORDS[5];
    var answer = pool[Math.floor(rand() * pool.length)];
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
// Build a puzzle from four distinct themed banks: pick 4 themes, 4 short,
// grid-friendly words from each (deduped across groups so a word belongs to
// exactly one category). Trickiness biases toward themes that could plausibly
// share members, but we still guarantee each answer word sits in one group only.
var generateCategories = function (config, seed) {
    var rand = rng(seed);
    var themeNames = shuffle(Object.keys(word_search_1.THEMES), rand);
    var used = new Set();
    var groups = [];
    for (var _i = 0, themeNames_1 = themeNames; _i < themeNames_1.length; _i++) {
        var name = themeNames_1[_i];
        if (groups.length >= 4)
            break;
        // Short-ish words read cleanly on tiles; unique across the whole puzzle.
        var pool = shuffle(word_search_1.THEMES[name].filter(function (w) { return w.length <= 8 && !used.has(w); }), rand);
        if (pool.length < 4)
            continue;
        var words = pool.slice(0, 4);
        words.forEach(function (w) { return used.add(w); });
        groups.push({ category: name, words: words });
    }
    var tiles = shuffle(groups.flatMap(function (g) { return g.words; }), rand);
    return { groups: groups, tiles: tiles, mistakes: config.mistakes };
};
exports.generateCategories = generateCategories;
