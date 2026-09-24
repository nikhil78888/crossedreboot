"use strict";
exports.__esModule = true;
exports.storyLevel = exports.isOnDifficulty = exports.storyDifficultyBand = exports.wordSearchSecondsFor = exports.storyTargetSolve = exports.estimateWordSearchSolve = exports.storyGenerosity = exports.bossAvatar = exports.STORY_PUBLISHED_5X5 = exports.STORY_MAX_LEVEL = void 0;
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
// Avatar key per level's boss (maps to the client's `avatars` image set).
// Deterministic, so a level always shows the same boss face. Milestone bosses
// get the fiercest faces; regular levels cycle the rest.
var STORY_AVATARS = [
    "avatar_frog", "avatar_bee", "avatar_pig", "avatar_bird", "avatar_penguin",
    "avatar_monkey", "avatar_panda", "avatar_donkey",
];
var bossAvatar = function (level) {
    if (isBossLevel(level)) {
        return (level / 25) % 2 === 0 ? "avatar_lion" : "avatar_snake";
    }
    return STORY_AVATARS[(level * 3) % STORY_AVATARS.length];
};
exports.bossAvatar = bossAvatar;
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
var tierFor = function (p) { return (p < 0.2 ? 0 : p < 0.5 ? 1 : p < 0.8 ? 2 : 3); };
// Average word length across the theme banks (words are 3–9 letters). Used to
// anchor the config-based target on the SAME model as the per-puzzle measurement
// so the two agree and the difficulty band holds.
var AVG_WORD_LEN = 6;
// Hardness of a direction VECTOR — the same scale estimateWordSearchSolve()
// applies to a placed word's actual direction, so target and measurement match.
var vectorHardness = function (d) {
    var isDiag = d.dr !== 0 && d.dc !== 0;
    var isReversed = d.dc < 0 || d.dr < 0;
    return 1.0 + (isDiag ? 0.3 : 0) + (isReversed ? 0.35 : 0);
};
// Estimated competent-player solve time for a level's NOMINAL puzzle (before the
// generosity multiplier) — computed with the same word/direction model as the
// per-puzzle measurement, so it's a faithful target for the difficulty band.
var estimatedSolve = function (level) {
    if (level % 2 === 1) {
        // Crossword: a published 5x5 mini (~10 answers). Fixed puzzle, so difficulty
        // comes from the clock (and hints) rather than the grid.
        return 70;
    }
    var _a = wsConfigFor(level), size = _a.size, count = _a.count, dirs = _a.dirs;
    var scan = 6 + (size - 8) * 1.6;
    var avgHard = dirs.reduce(function (a, d) { return a + vectorHardness(d); }, 0) / dirs.length;
    var perWord = (2.0 + 0.7 * AVG_WORD_LEN) * avgHard;
    return scan + perWord * count;
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
// levels are tight-but-possible (with hints), never impossible. This is THE
// strategic time-lowering lever: same shape regardless of the actual puzzle.
var storyGenerosity = function (level) {
    var p = (level - 1) / (exports.STORY_MAX_LEVEL - 1);
    return Math.max(0.9, 2.6 - 1.7 * Math.pow(p, 1.25));
};
exports.storyGenerosity = storyGenerosity;
var generosity = exports.storyGenerosity;
// ---- Measuring a puzzle's ACTUAL difficulty -------------------------------
//
// Because Story Mode generates a fresh random puzzle each play, two draws of the
// same level can differ in real difficulty (word lengths, and — crucially — the
// DIRECTIONS the words landed in: a reversed diagonal takes far longer to spot
// than a forward across). We measure the generated puzzle so both the accepted
// difficulty band AND the time-to-beat track the puzzle you actually got, not
// just the level's nominal config.
// How much longer a word takes to find given its direction. Forward straight = 1;
// a forward diagonal is harder to scan; anything reversed (leftward/upward) is
// harder still; a reversed diagonal is the worst.
var dirHardness = function (a, b) {
    var isDiag = a.r !== b.r && a.c !== b.c;
    var isReversed = b.c < a.c || b.r < a.r; // travels left and/or up
    var f = 1.0;
    if (isDiag)
        f += 0.3;
    if (isReversed)
        f += 0.35;
    return f; // 1.0 (fwd straight) … 1.65 (reversed diagonal)
};
// Estimated seconds a competent player needs to fully solve THIS puzzle.
var estimateWordSearchSolve = function (puzzle) {
    var scan = 6 + (puzzle.size - 8) * 1.6; // orient to the grid
    var find = 0;
    for (var _i = 0, _a = puzzle.placements; _i < _a.length; _i++) {
        var pl = _a[_i];
        var len = pl.word.length;
        var hard = pl.cells.length >= 2 ? dirHardness(pl.cells[0], pl.cells[1]) : 1;
        find += (2.0 + 0.7 * len) * hard; // base + per-letter, scaled by direction
    }
    return scan + find;
};
exports.estimateWordSearchSolve = estimateWordSearchSolve;
// The level's NOMINAL (config-average) solve estimate — the target the accepted
// random draw should sit near, so difficulty stays consistent across replays.
var storyTargetSolve = function (level) { return estimatedSolve(level); };
exports.storyTargetSolve = storyTargetSolve;
// The time-to-beat for a word-search level given the ACTUAL generated puzzle's
// estimated solve: estimate × the level's generosity. Same challenge every play
// (beat your expected pace × the level's slack), fair to the specific draw.
var wordSearchSecondsFor = function (level, puzzleEstimate) { return Math.max(30, Math.round(puzzleEstimate * generosity(level))); };
exports.wordSearchSecondsFor = wordSearchSecondsFor;
// A generated puzzle is "on-difficulty" for its level if its measured solve is
// within this fraction of the level's target — used to reject outlier draws so
// replays feel like the same difficulty. ±18%.
exports.storyDifficultyBand = 0.18;
var isOnDifficulty = function (level, puzzleEstimate) {
    var target = (0, exports.storyTargetSolve)(level);
    return Math.abs(puzzleEstimate - target) <= target * exports.storyDifficultyBand;
};
exports.isOnDifficulty = isOnDifficulty;
var storyLevel = function (level) {
    var lvl = Math.max(1, Math.min(exports.STORY_MAX_LEVEL, Math.round(level)));
    var variant = lvl % 2 === 1 ? "CROSSWORD" : "WORD_SEARCH";
    var seconds = Math.max(30, Math.round(estimatedSolve(lvl) * generosity(lvl)));
    var base = {
        level: lvl,
        variant: variant,
        seconds: seconds,
        boss: bossNameFor(lvl),
        avatar: (0, exports.bossAvatar)(lvl),
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
