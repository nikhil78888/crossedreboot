"use strict";
exports.__esModule = true;
exports.storyLevel = exports.isOnDifficulty = exports.storyDifficultyBand = exports.wordSearchSecondsFor = exports.storyTargetSolve = exports.estimateWordSearchSolve = exports.storyGenerosity = exports.categoriesConfigFor = exports.wordsyConfigFor = exports.bossAvatar = exports.STORY_PUBLISHED_5X5 = exports.STORY_VARIANTS = exports.STORY_MAX_LEVEL = void 0;
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
// Story Mode rotates through four game types, one per level in order.
exports.STORY_VARIANTS = [
    "CROSSWORD",
    "WORD_SEARCH",
    "WORDSY",
    "CATEGORIES",
];
var variantForLevel = function (level) {
    return exports.STORY_VARIANTS[(level - 1) % exports.STORY_VARIANTS.length];
};
// Number of published 5x5 minis to seed a pick from (same pool the daily duel
// uses). Keeps the crossword pick deterministic without a count query.
exports.STORY_PUBLISHED_5X5 = 384;
// ---- Bosses ---------------------------------------------------------------
// Every level has its own boss: a NAME, an emoji AVATAR, and a difficulty tier.
// Both escalate — early bosses are goofy critters, late bosses are fearsome —
// and every level differs from its neighbors. Milestone levels (every 25) get a
// signature named boss with a crown-tier avatar.
var isBossLevel = function (level) { return level % 25 === 0; };
// Difficulty tier 0..3 from level (kept here so the boss flavor tracks the same
// bands as the puzzle difficulty).
var bossTier = function (level) {
    var p = (level - 1) / (exports.STORY_MAX_LEVEL - 1);
    return p < 0.2 ? 0 : p < 0.5 ? 1 : p < 0.8 ? 2 : 3;
};
// Emoji boss faces per tier — escalating menace (cute → monstrous). Emoji so
// they ship over-the-air with no image assets and look distinct at every level.
var BOSS_EMOJI = [
    ["🐣", "🦆", "🐹", "🐸", "🐨", "🦊", "🐵", "🐧", "🐰", "🦔", "🐤", "🦫"],
    ["🦝", "🐺", "🦉", "🦇", "🦍", "🐯", "🦈", "🐗", "🦅", "🐍", "🦂", "🕷️"],
    ["🧙", "🥷", "👻", "🤠", "🧟", "🦹", "👺", "🗿", "🧞", "🕵️", "🧛", "⚔️"],
    ["👹", "👾", "🤖", "🐉", "💀", "🦾", "🔥", "👽", "☠️", "🌋", "⚡", "🦑"],
];
var MILESTONE_EMOJI = ["👹", "🐲", "🧙‍♂️", "🦹", "👾", "🗿", "🐉", "☠️"];
var bossAvatar = function (level) {
    if (isBossLevel(level)) {
        return MILESTONE_EMOJI[Math.min(7, level / 25 - 1)];
    }
    var pool = BOSS_EMOJI[bossTier(level)];
    return pool[(level * 7) % pool.length];
};
exports.bossAvatar = bossAvatar;
// Signature milestone boss names (levels 25/50/…/200).
var MILESTONE_NAMES = [
    "Captain Anagram",
    "The Cruciverbalist",
    "Gigi Gridlock",
    "The Lexicon",
    "Vex the Vowel Eater",
    "The Puzzle Warden",
    "The Wordsmith Warlord",
    "OMNIGLOT, the Final Cipher", // 200
];
// A big, tier-escalating name space built from a title + a core, so nearly every
// level gets a distinct boss without a 200-entry hand list.
var TITLES = [
    ["Lil", "Baby", "Novice", "Wee", "Sir", "Little", "Young", "Junior"],
    ["Captain", "Madame", "Tricky", "Swift", "Sneaky", "Clever", "Sly", "Quick"],
    ["Professor", "Baron", "Mistress", "Grand", "Shadow", "Dark", "Master", "Vex"],
    ["Lord", "Dread", "Doom", "The Dread", "Warlord", "Nightmare", "Ancient", "Eternal"],
];
var CORES = [
    ["Doodle", "Scribbles", "Vowel", "Newt", "Pencil", "Bingo", "Sprout", "Giggles",
        "Puddle", "Button", "Muffin", "Pip"],
    ["Anagram", "Gridlock", "Cipher", "Riddle", "Rebus", "Syllable", "Verbatim",
        "Lexicon", "Crossbones", "Tangle", "Puzzler", "Scramble"],
    ["Wordsmith", "Acrostic", "Vex", "Reaper", "Sphinx", "Warden", "Enigma",
        "Obelisk", "Phantom", "Hex", "Oracle", "Wraith"],
    ["Omniglot", "Voidword", "Cataclysm", "Abyss", "Overmind", "Doomscript",
        "Endgame", "Final Cipher", "Nemesis", "Annihilator", "Grandmaster", "Leviathan"],
];
var bossNameFor = function (level) {
    if (isBossLevel(level))
        return MILESTONE_NAMES[Math.min(7, level / 25 - 1)];
    var t = bossTier(level);
    var titles = TITLES[t];
    var cores = CORES[t];
    // Coprime strides spread picks so consecutive levels never collide.
    var title = titles[(level * 5) % titles.length];
    var core = cores[(level * 3) % cores.length];
    return "".concat(title, " ").concat(core);
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
// Config progress — heavily front-loaded (p^0.55) so the grid/word-count/
// directions ramp up FAST in the early levels. Combined with the steep time
// curve below, this makes the game genuinely challenging within the first
// ~20-25 levels rather than staying trivially easy.
var configProgress = function (level) {
    return Math.pow((level - 1) / (exports.STORY_MAX_LEVEL - 1), 0.55);
};
var tierFor = function (level) {
    var cp = configProgress(level);
    return cp < 0.1 ? 0 : cp < 0.34 ? 1 : cp < 0.64 ? 2 : 3;
};
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
// Wordsy (guess-the-word): longer words = fewer guesses = harder. Config ramps
// with the level so the game tightens the same way the others do.
var wordsyConfigFor = function (level) {
    var cp = configProgress(level);
    var length = Math.min(6, 4 + Math.floor(cp * 2.4)); // 4 → 6
    var maxGuesses = Math.max(4, 7 - Math.floor(cp * 3.2)); // 7 → 4
    return { length: length, maxGuesses: maxGuesses };
};
exports.wordsyConfigFor = wordsyConfigFor;
// Categories (group 16 words into 4 sets): fewer mistakes allowed = harder, and
// trickiness rises so higher levels can share words between groups.
var categoriesConfigFor = function (level) {
    var cp = configProgress(level);
    var mistakes = Math.max(1, 4 - Math.floor(cp * 3.2)); // 4 → 1
    return { mistakes: mistakes, trickiness: cp };
};
exports.categoriesConfigFor = categoriesConfigFor;
// Estimated competent-player solve time for a level's NOMINAL puzzle (before the
// generosity multiplier). For word search it's the word/direction model (also
// used as the per-puzzle difficulty-band target); the others use a nominal that
// grows with their config.
var estimatedSolve = function (level) {
    var v = variantForLevel(level);
    if (v === "CROSSWORD") {
        // A published 5x5 mini (~10 answers). Fixed puzzle → difficulty from clock.
        return 70;
    }
    if (v === "WORDSY") {
        var length = (0, exports.wordsyConfigFor)(level).length;
        return 45 + (length - 4) * 16; // 45 / 61 / 77
    }
    if (v === "CATEGORIES") {
        return 78; // a 16-tile grouping puzzle
    }
    // WORD_SEARCH
    var _a = wsConfigFor(level), size = _a.size, count = _a.count, dirs = _a.dirs;
    var scan = 6 + (size - 8) * 1.6;
    var avgHard = dirs.reduce(function (a, d) { return a + vectorHardness(d); }, 0) / dirs.length;
    var perWord = (2.0 + 0.7 * AVG_WORD_LEN) * avgHard;
    return scan + perWord * count;
};
var wsConfigFor = function (level) {
    var cp = configProgress(level); // heavily front-loaded — grows fast early
    var size = Math.round(7 + cp * 6); // 7 → 13
    var count = Math.min(12, Math.round(3 + cp * 9)); // 3 → 12
    return { size: size, count: count, dirs: DIRS_TIER[tierFor(level)] };
};
// Generosity = time-to-beat / estimated-solve — THE per-level difficulty lever.
// Felt difficulty = 1 / generosity, and because generosity STRICTLY decreases
// every single level, every level is harder than the last. The curve drops FAST
// early (p^0.42, sqrt-like) so the game gets genuinely tight within the first
// ~20-25 levels — L1 gives 1.55× the solve time (comfortable), by ~L25 you're
// near 1.2× (must be quick), and it keeps tightening to 0.68× at L200 (needs
// speed / hints).
var GEN_HI = 1.55; // L1 — comfortable cushion, not trivial
var GEN_LO = 0.68; // L200 — must be fast / lean on hints
var GEN_EXP = 0.42; // < 1 → steep early drop
var storyGenerosity = function (level) {
    var p = (level - 1) / (exports.STORY_MAX_LEVEL - 1);
    return GEN_LO + (GEN_HI - GEN_LO) * (1 - Math.pow(p, GEN_EXP));
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
exports.storyDifficultyBand = 0.12;
var isOnDifficulty = function (level, puzzleEstimate) {
    var target = (0, exports.storyTargetSolve)(level);
    return Math.abs(puzzleEstimate - target) <= target * exports.storyDifficultyBand;
};
exports.isOnDifficulty = isOnDifficulty;
var storyLevel = function (level) {
    var lvl = Math.max(1, Math.min(exports.STORY_MAX_LEVEL, Math.round(level)));
    var variant = variantForLevel(lvl);
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
    else if (variant === "CROSSWORD") {
        // Deterministic pick from the published 5x5 pool (seeded by level).
        base.crosswordOffset = (lvl * 2654435761) % exports.STORY_PUBLISHED_5X5;
    }
    else if (variant === "WORDSY") {
        base.wordsy = (0, exports.wordsyConfigFor)(lvl);
    }
    else {
        base.categories = (0, exports.categoriesConfigFor)(lvl);
    }
    return base;
};
exports.storyLevel = storyLevel;
