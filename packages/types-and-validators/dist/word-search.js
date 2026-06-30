"use strict";
// Self-contained word-search generation + checking. Puzzles are generated on the
// client and stored inline in the game (gameState.__wordsearch) — same approach
// challenges use — so no content table / RPC / FK plumbing is needed and the
// whole mode ships over-the-air. Both players in a race share the one puzzle
// stored on the game, so it's identical for everyone.
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
exports.wordSearchProgress = exports.matchSelection = exports.generateWordSearch = exports.wordSearchConfig = void 0;
// Themed banks keep puzzles coherent and give us "categories" for parity with
// trivia. Words are 3–8 letters, uppercase, no spaces.
var THEMES = {
    Animals: [
        "TIGER", "PANDA", "OTTER", "EAGLE", "MOOSE", "ZEBRA", "KOALA", "LEMUR",
        "BISON", "HORSE", "SHARK", "WHALE", "GECKO", "RAVEN", "FERRET", "WALRUS",
        "BADGER", "JAGUAR", "FALCON", "IGUANA", "BEAVER", "TURTLE",
    ],
    Food: [
        "BREAD", "MANGO", "OLIVE", "PASTA", "HONEY", "LEMON", "PEACH", "BACON",
        "PIZZA", "SALAD", "WAFFLE", "PEPPER", "CARROT", "WALNUT", "BANANA", "TOMATO",
        "GARLIC", "MUFFIN", "NOODLE", "PICKLE",
    ],
    Travel: [
        "BEACH", "HOTEL", "TRAIN", "CABIN", "COAST", "RIVER", "TOKYO", "PARIS",
        "FLIGHT", "ISLAND", "DESERT", "CANYON", "JUNGLE", "AIRPORT", "PASSPORT",
        "HARBOR", "SAFARI", "VOYAGE",
    ],
    Sports: [
        "RUGBY", "TENNIS", "BOXING", "SKIING", "HOCKEY", "SOCCER", "GOLF", "RELAY",
        "SPRINT", "RACKET", "HELMET", "REFEREE", "STADIUM", "ARCHERY", "PADDLE",
        "DISCUS", "HURDLE",
    ],
    Science: [
        "ATOM", "LASER", "COMET", "PRISM", "FORCE", "ORBIT", "QUARK", "PROTON",
        "GENOME", "MAGNET", "FUSION", "PLASMA", "NEURON", "GRAVITY", "MOLECULE",
        "VOLTAGE", "ENTROPY",
    ]
};
// Regular: across, down, and both forward diagonals (a proper word search).
// Hard adds the reversed directions on top.
var DIRS_EASY = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 }, // diagonal ↙
];
var DIRS_HARD = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 },
    { dr: 0, dc: -1 },
    { dr: -1, dc: 0 },
    { dr: -1, dc: 1 },
    { dr: -1, dc: -1 },
];
var ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
// Deterministic-ish pick driven by a simple xorshift so a given seed reproduces
// a puzzle (Math.random is unavailable in some contexts; callers pass a seed).
var makeRng = function (seed) {
    var s = seed >>> 0 || 1;
    return function () {
        s ^= s << 13;
        s ^= s >>> 17;
        s ^= s << 5;
        s >>>= 0;
        return s / 0xffffffff;
    };
};
var inBounds = function (r, c, size) {
    return r >= 0 && c >= 0 && r < size && c < size;
};
// Try to place a word into the grid in some direction without conflicting with
// already-placed letters (shared letters are fine).
var tryPlace = function (grid, word, size, dirs, rng) {
    for (var attempt = 0; attempt < 80; attempt++) {
        var dir = dirs[Math.floor(rng() * dirs.length)];
        var r0 = Math.floor(rng() * size);
        var c0 = Math.floor(rng() * size);
        var cells = [];
        var ok = true;
        for (var i = 0; i < word.length; i++) {
            var r = r0 + dir.dr * i;
            var c = c0 + dir.dc * i;
            if (!inBounds(r, c, size)) {
                ok = false;
                break;
            }
            var existing = grid[r][c];
            if (existing !== null && existing !== word[i]) {
                ok = false;
                break;
            }
            cells.push({ r: r, c: c });
        }
        if (ok)
            return { word: word, cells: cells };
    }
    return null;
};
var wordSearchConfig = function (difficulty) {
    return difficulty === "HARD"
        ? { size: 12, count: 8, dirs: DIRS_HARD }
        : { size: 9, count: 7, dirs: DIRS_EASY };
};
exports.wordSearchConfig = wordSearchConfig;
var generateWordSearch = function (difficulty, seed, themeName) {
    var _a;
    var rng = makeRng(seed);
    var themes = Object.keys(THEMES);
    var theme = themeName !== null && themeName !== void 0 ? themeName : themes[Math.floor(rng() * themes.length)];
    var _b = (0, exports.wordSearchConfig)(difficulty), size = _b.size, count = _b.count, dirs = _b.dirs;
    // Pick `count` distinct words that fit the grid, longest first for easier placement.
    var pool = __spreadArray([], THEMES[theme], true).filter(function (w) { return w.length <= size; })
        .sort(function (a, b) { return b.length - a.length; });
    // Shuffle within length buckets via the rng.
    for (var i = pool.length - 1; i > 0; i--) {
        var j = Math.floor(rng() * (i + 1));
        _a = [pool[j], pool[i]], pool[i] = _a[0], pool[j] = _a[1];
    }
    var grid = Array.from({ length: size }, function () {
        return Array.from({ length: size }, function () { return null; });
    });
    var placements = [];
    var _loop_1 = function (word) {
        if (placements.length >= count)
            return "break";
        var placed = tryPlace(grid, word, size, dirs, rng);
        if (placed) {
            placed.cells.forEach(function (_a, i) {
                var r = _a.r, c = _a.c;
                return (grid[r][c] = word[i]);
            });
            placements.push(placed);
        }
    };
    for (var _i = 0, pool_1 = pool; _i < pool_1.length; _i++) {
        var word = pool_1[_i];
        var state_1 = _loop_1(word);
        if (state_1 === "break")
            break;
    }
    // Fill blanks with random letters.
    var filled = grid.map(function (row) {
        return row.map(function (ch) { return ch !== null && ch !== void 0 ? ch : ALPHABET[Math.floor(rng() * 26)]; });
    });
    return {
        size: size,
        grid: filled,
        words: placements.map(function (p) { return p.word; }),
        placements: placements,
        theme: theme
    };
};
exports.generateWordSearch = generateWordSearch;
// Given an ordered run of selected cells, return the matching word (or null).
// Matches a placement whose cell sequence equals the selection forwards or back.
var matchSelection = function (puzzle, selection) {
    var key = function (cells) { return cells.map(function (c) { return "".concat(c.r, ",").concat(c.c); }).join("|"); };
    var fwd = key(selection);
    var rev = key(__spreadArray([], selection, true).reverse());
    for (var _i = 0, _a = puzzle.placements; _i < _a.length; _i++) {
        var p = _a[_i];
        var pk = key(p.cells);
        if (pk === fwd || pk === rev)
            return p.word;
    }
    return null;
};
exports.matchSelection = matchSelection;
// Progress 0–100 from the set of found words.
var wordSearchProgress = function (puzzle, found) {
    if (!puzzle || puzzle.words.length === 0)
        return 0;
    var set = new Set(found !== null && found !== void 0 ? found : []);
    var got = puzzle.words.filter(function (w) { return set.has(w); }).length;
    return Math.round((got / puzzle.words.length) * 100);
};
exports.wordSearchProgress = wordSearchProgress;
