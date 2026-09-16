"use strict";
exports.__esModule = true;
exports.fmtSeconds = exports.duelMeta = exports.duelSeconds = exports.duelVariant = exports.seedFrom = exports.localDay = exports.PUBLISHED_5X5 = exports.CAST = void 0;
var word_search_1 = require("./word-search");
// ~40 characters. The silly names are the point — they make a win worth sharing.
exports.CAST = [
    "Sir Reginald Puzzlesworth", "Grandma Gladys", "Tony Two-Times",
    "Captain Anagram", "The Crossword Bandit", "Lil Vowel", "Betty Letters",
    "Dr. Acrostic", "Vinny Vowels", "Sally Syllable", "The Puzzle Pirate",
    "Nana Nine-Down", "Speedy Steve", "Clueless Carl", "Wordy Wendy",
    "Max Verbatim", "Gary Grid", "Penny Pencil", "Chad Checkmate",
    "Ophelia Overthinks", "Sir Solves-a-Lot", "Ricky Rebus", "Ms. Across",
    "Barry Backspace", "The Anagram Assassin", "Tilly Timer",
    "Professor Puzzlebottom", "Nervous Nelly", "Quick Quinn", "Slowpoke Sam",
    "The Daily Dasher", "Hasty Harriet", "Gigi Gridlock", "The Letterman",
    "Bingo Bob", "Crossword Karen", "Zippy Zoe", "Larry Lexicon",
    "Mabel Mini", "The Speed Speller",
];
// Number of published 5×5 minis to pick from (seeded). A fixed count keeps the
// pick deterministic without an extra count query.
exports.PUBLISHED_5X5 = 384;
// The opponent's per-word pacing for word-search duels.
var BASE_SECONDS = 10; // initial scan / getting oriented
var PACE_FAST = 6.5; // seconds/word on a hard day → tough to beat
var PACE_SLOW = 11.5; // seconds/word on an easy day → most people beat it
// Local calendar day (YYYY-MM-DD) — the streak/day boundary is the player's own
// midnight, which is fairer than UTC.
var localDay = function (d) {
    if (d === void 0) { d = new Date(); }
    return "".concat(d.getFullYear(), "-").concat(String(d.getMonth() + 1).padStart(2, "0"), "-").concat(String(d.getDate()).padStart(2, "0"));
};
exports.localDay = localDay;
// Stable 32-bit hash of the day string → the day's seed.
var seedFrom = function (day) {
    var h = 2166136261;
    for (var i = 0; i < day.length; i += 1) {
        h ^= day.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
};
exports.seedFrom = seedFrom;
// The day's variant — alternate crossword / word search so it doesn't feel
// samey. Deterministic per day; a shifted seed slice keeps it uncorrelated with
// the opponent pick and the difficulty-of-day.
var duelVariant = function (seed) {
    return (seed >>> 5) % 2 === 0 ? "WORD_SEARCH" : "CROSSWORD";
};
exports.duelVariant = duelVariant;
var duelSeconds = function (seed, variant) {
    // Which "kind of day" it is, 0 (hardest) .. 1 (easiest). Shifted seed slice so
    // difficulty isn't correlated with the opponent or variant pick.
    var dayFactor = ((seed >>> 3) % 1000) / 1000;
    if (variant === "CROSSWORD") {
        // A published 5×5 (~10 answers): tight ~45s .. generous ~95s.
        return Math.round(45 + dayFactor * 50);
    }
    var count = (0, word_search_1.wordSearchConfig)("HARD").count;
    var perWord = PACE_FAST + dayFactor * (PACE_SLOW - PACE_FAST);
    return Math.round(BASE_SECONDS + perWord * count); // ~62s (hard) .. ~102s (easy)
};
exports.duelSeconds = duelSeconds;
// The one function everything derives from: a calendar day → the day's duel.
var duelMeta = function (day) {
    if (day === void 0) { day = (0, exports.localDay)(); }
    var seed = (0, exports.seedFrom)(day);
    var variant = (0, exports.duelVariant)(seed);
    return {
        day: day,
        seed: seed,
        variant: variant,
        opponent: exports.CAST[seed % exports.CAST.length],
        seconds: (0, exports.duelSeconds)(seed, variant)
    };
};
exports.duelMeta = duelMeta;
var fmtSeconds = function (s) {
    return "".concat(Math.floor(s / 60), ":").concat(String(Math.round(s) % 60).padStart(2, "0"));
};
exports.fmtSeconds = fmtSeconds;
