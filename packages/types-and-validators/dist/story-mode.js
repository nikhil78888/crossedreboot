"use strict";
exports.__esModule = true;
exports.storyLevel = exports.STORY_PUBLISHED_5X5 = exports.STORY_MAX_LEVEL = void 0;
var word_search_1 = require("./word-search");
// Story Mode — a 200-level solo ladder. Odd levels are crosswords, even levels
// are word searches (alternating, starting with a crossword at level 1). Each
// level is a "beat the clock" solve: finish under the time-to-beat to advance.
//
// The design goal (and the thing that has to be right) is the RATIO of puzzle
// difficulty to time-to-beat:
//   • Early levels: very easy puzzles + very generous time → almost everyone
//     flies through the first ~15-20 levels. This is deliberate — it pulls new
//     players deep into their first session (the activation the retention data
//     says matters most).
//   • The curve then tightens: puzzles get bigger/harder and the clock gets
//     stingier, so high levels become a genuine "how far can you get?" wall.
//
// Everything here is a pure function of the level number, so a level always
// produces the same puzzle + time (progress is stored client-side).
exports.STORY_MAX_LEVEL = 200;
// Number of published 5x5 minis to seed a pick from (same pool the daily duel
// uses). Keeps the crossword pick deterministic without a count query.
exports.STORY_PUBLISHED_5X5 = 384;
// ---- Boss names -----------------------------------------------------------
// Ordered loosely by menace. A level's boss is picked by scaling into the band
// that matches its difficulty, so early bosses are goofy and late bosses are
// fearsome. Milestone levels (every 25) get their own distinct "big boss".
var BOSS_MINIONS = [
    "Doodle", "Scribbles", "Lil Vowel", "Novice Newt", "Penny Pencil",
    "Sir Types-a-Lot", "Betty Letters", "Wordy Wendy", "Clueless Carl",
    "Gary Grid", "Vinny Vowels", "Sally Syllable", "Bingo Bob", "Zippy Zoe",
    "Tilly Timer", "Max Verbatim", "Ricky Rebus", "Nana Nine-Down",
    "Speedy Steve", "Quick Quinn", "Hasty Harriet", "Ms. Across",
    "Barry Backspace", "Chad Checkmate", "Ophelia Overthinks", "Larry Lexicon",
    "Captain Anagram", "The Crossword Bandit", "Gigi Gridlock", "Professor Puzzlebottom",
    "The Letterman", "Mabel Mini", "The Daily Dasher", "Wanda Wordsmith",
    "Dr. Acrostic", "The Puzzle Pirate", "Sir Solves-a-Lot", "Nervous Nelly",
    "The Anagram Assassin", "Grid Reaper", "The Cruciverbalist", "Vex the Vowel Eater",
    "The Lexicon", "Cipher Sphinx", "The Gridmaster", "Wraith of Words",
    "The Puzzle Warden", "Diagonal Dread", "The Wordsmith Warlord", "Omniglot",
];
// One distinct, escalating name per 25-level milestone (8 of them, levels
// 25/50/…/200). These are the "bosses" you fight to clear each tier.
var BIG_BOSSES = [
    "Captain Anagram",
    "The Cruciverbalist",
    "Gigi Gridlock",
    "The Lexicon",
    "Vex the Vowel Eater",
    "The Puzzle Warden",
    "The Wordsmith Warlord",
    "OMNIGLOT, the Final Cipher", // 200
];
var isBossLevel = function (level) { return level % 25 === 0; };
var bossNameFor = function (level) {
    if (isBossLevel(level))
        return BIG_BOSSES[Math.min(7, level / 25 - 1)];
    // Scale into the minion list by overall progress so the flavor escalates.
    var p = (level - 1) / (exports.STORY_MAX_LEVEL - 1);
    var idx = Math.min(BOSS_MINIONS.length - 1, Math.floor(p * BOSS_MINIONS.length));
    // Vary within the band by level so adjacent levels differ.
    var bandStart = Math.max(0, idx - 2);
    var pick = bandStart + (level % Math.max(1, idx - bandStart + 1));
    return BOSS_MINIONS[Math.min(BOSS_MINIONS.length - 1, pick)];
};
// ---- The difficulty / time curve -----------------------------------------
// Diagonal-heavy direction sets, escalating. Diagonals are intentionally
// over-represented (listed multiple times) so word placement favors them —
// "lots of diagonals" at every tier, with reversed directions added later.
var D = word_search_1.WS_DIR;
var DIRS_TIER = [
    // Tier 0 (easiest): forward + both down-diagonals, diagonals doubled.
    [D.RIGHT, D.DOWN, D.DOWN_RIGHT, D.DOWN_LEFT, D.DOWN_RIGHT, D.DOWN_LEFT],
    // Tier 1: add the up-diagonals (harder to scan), all 4 diagonals doubled.
    [
        D.RIGHT, D.DOWN, D.DOWN_RIGHT, D.DOWN_LEFT, D.UP_RIGHT, D.UP_LEFT,
        D.DOWN_RIGHT, D.DOWN_LEFT, D.UP_RIGHT, D.UP_LEFT,
    ],
    // Tier 2: add reversed straights; still diagonal-weighted.
    [
        D.RIGHT, D.DOWN, D.LEFT, D.UP,
        D.DOWN_RIGHT, D.DOWN_LEFT, D.UP_RIGHT, D.UP_LEFT,
        D.DOWN_RIGHT, D.DOWN_LEFT, D.UP_RIGHT, D.UP_LEFT,
    ],
    // Tier 3 (hardest): all 8, diagonals tripled — a diagonal-dominated grid.
    [
        D.RIGHT, D.LEFT, D.DOWN, D.UP,
        D.DOWN_RIGHT, D.DOWN_RIGHT, D.DOWN_RIGHT,
        D.DOWN_LEFT, D.DOWN_LEFT, D.DOWN_LEFT,
        D.UP_RIGHT, D.UP_RIGHT, D.UP_RIGHT,
        D.UP_LEFT, D.UP_LEFT, D.UP_LEFT,
    ],
];
// Per-word solve pace (seconds) assumed for each tier — reversed/upward
// diagonals take longer to spot, so the pace rises with the tier.
var TIER_PACE = [5.5, 7.5, 9.5, 11.5];
var tierFor = function (p) { return (p < 0.2 ? 0 : p < 0.5 ? 1 : p < 0.8 ? 2 : 3); };
// Estimated competent-player solve time for a level's puzzle (before the
// generosity multiplier). This is the anchor the time-to-beat scales off.
var estimatedSolve = function (level) {
    var p = (level - 1) / (exports.STORY_MAX_LEVEL - 1);
    if (level % 2 === 1) {
        // Crossword: a published 5x5 mini (~10 answers). Fixed puzzle, so difficulty
        // comes from the clock (and hints) rather than the grid.
        return 70;
    }
    // Word search: scan time grows with grid size; per-word pace with the tier.
    var _a = wsConfigFor(level), size = _a.size, count = _a.count;
    var scan = 6 + (size - 8) * 1.6;
    return scan + TIER_PACE[tierFor(p)] * count;
};
var wsConfigFor = function (level) {
    var p = (level - 1) / (exports.STORY_MAX_LEVEL - 1);
    var size = Math.round(8 + p * 5); // 8 → 13
    var count = Math.round(4 + p * 5); // 4 → 9
    return { size: size, count: count, dirs: DIRS_TIER[tierFor(p)] };
};
// Generosity multiplier on the estimated solve time. Starts very high (early
// levels are a breeze) and tightens; a gentle-early, steep-late curve so the
// first ~20 levels stay trivially beatable. Floored at 0.9 so the hardest
// levels are tight-but-possible (with hints), never impossible.
var generosity = function (level) {
    var p = (level - 1) / (exports.STORY_MAX_LEVEL - 1);
    return Math.max(0.9, 2.6 - 1.7 * Math.pow(p, 1.25));
};
var storyLevel = function (level) {
    var lvl = Math.max(1, Math.min(exports.STORY_MAX_LEVEL, Math.round(level)));
    var variant = lvl % 2 === 1 ? "CROSSWORD" : "WORD_SEARCH";
    var seconds = Math.max(30, Math.round(estimatedSolve(lvl) * generosity(lvl)));
    var base = {
        level: lvl,
        variant: variant,
        seconds: seconds,
        boss: bossNameFor(lvl),
        isBoss: isBossLevel(lvl)
    };
    if (variant === "WORD_SEARCH") {
        base.ws = wsConfigFor(lvl);
    }
    else {
        // Deterministic pick from the published 5x5 pool (seeded by level).
        base.crosswordOffset = (lvl * 2654435761) % exports.STORY_PUBLISHED_5X5;
    }
    return base;
};
exports.storyLevel = storyLevel;
