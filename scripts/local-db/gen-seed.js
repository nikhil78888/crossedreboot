// Generates synthetic-but-schema-valid seed data for the local Crossed database.
// Crossword grids are filled from the repo's own wordClues corpus by backtracking,
// so every across/down entry is a real word with a real clue.
const fs = require('fs');
const SP = process.argv[2];

// ---------- deterministic RNG (so re-seeding is reproducible) ----------
let _s = 0x9e3779b9;
const rnd = () => (((_s = (_s * 1664525 + 1013904223) >>> 0)) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const shuffled = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

// ---------- corpus ----------
const rows = fs.readFileSync(`${SP}/wordclues.tsv`, 'utf8').trim().split('\n').map(l => l.split('\t'));
const cluesByWord = new Map();
for (const [word, clue, difficulty] of rows) {
  if (!cluesByWord.has(word)) cluesByWord.set(word, []);
  cluesByWord.get(word).push({ clue, difficulty });
}
const byLen = new Map();
for (const w of cluesByWord.keys()) {
  if (!byLen.has(w.length)) byLen.set(w.length, []);
  byLen.get(w.length).push(w);
}
// prefix index: len -> position -> letter -> Set(words)
const idx = new Map();
for (const [len, words] of byLen) {
  const perPos = [];
  for (let p = 0; p < len; p++) {
    const m = new Map();
    for (const w of words) {
      const c = w[p];
      if (!m.has(c)) m.set(c, []);
      m.get(c).push(w);
    }
    perPos.push(m);
  }
  idx.set(len, perPos);
}

// ---------- grid patterns (# = black) ----------
const PATTERNS = [
  ['...##', '.....', '.....', '.....', '##...'],
  ['##...', '.....', '.....', '.....', '...##'],
  ['.....', '.....', '..#..', '.....', '.....'],
  ['#...#', '.....', '.....', '.....', '#...#'],
];

function slotsFor(pat) {
  const n = pat.length, slots = [];
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (pat[r][c] === '#') { c++; continue; }
      let e = c; while (e < n && pat[r][e] !== '#') e++;
      if (e - c >= 3) slots.push({ dir: 'Across', cells: Array.from({ length: e - c }, (_, i) => [r, c + i]) });
      c = e;
    }
  }
  for (let c = 0; c < n; c++) {
    let r = 0;
    while (r < n) {
      if (pat[r][c] === '#') { r++; continue; }
      let e = r; while (e < n && pat[e][c] !== '#') e++;
      if (e - r >= 3) slots.push({ dir: 'Down', cells: Array.from({ length: e - r }, (_, i) => [r + i, c]) });
      r = e;
    }
  }
  return slots;
}

function candidates(len, constraints) {
  const perPos = idx.get(len);
  if (!perPos) return [];
  const keys = Object.keys(constraints);
  if (!keys.length) return byLen.get(len) || [];
  let best = null;
  for (const p of keys) {
    const list = perPos[p].get(constraints[p]) || [];
    if (best === null || list.length < best.length) best = list;
  }
  return best.filter(w => keys.every(p => w[p] === constraints[p]));
}

function fill(pat) {
  const n = pat.length;
  const grid = pat.map(r => r.split('').map(ch => (ch === '#' ? null : '')));
  const slots = slotsFor(pat);
  // hardest (most constrained) slots first
  const order = slots.map((s, i) => i).sort((a, b) => slots[a].cells.length - slots[b].cells.length);
  const used = new Set();
  let steps = 0;

  function solve(k) {
    if (++steps > 400000) return false;
    if (k === order.length) return true;
    const slot = slots[order[k]];
    const cons = {};
    slot.cells.forEach(([r, c], i) => { if (grid[r][c]) cons[i] = grid[r][c]; });
    for (const w of shuffled(candidates(slot.cells.length, cons)).slice(0, 60)) {
      if (used.has(w)) continue;
      const undo = [];
      let ok = true;
      slot.cells.forEach(([r, c], i) => {
        if (!grid[r][c]) { grid[r][c] = w[i]; undo.push([r, c]); }
        else if (grid[r][c] !== w[i]) ok = false;
      });
      if (ok) { used.add(w); if (solve(k + 1)) return true; used.delete(w); }
      for (const [r, c] of undo) grid[r][c] = '';
    }
    return false;
  }
  return solve(0) ? { grid, slots } : null;
}

function buildCrossword() {
  for (let attempt = 0; attempt < 40; attempt++) {
    const pat = pick(PATTERNS);
    const res = fill(pat);
    if (!res) continue;
    const { grid, slots } = res;
    const n = grid.length;

    // standard crossword numbering
    const numAt = {};
    let num = 0;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (grid[r][c] === null) continue;
      const startsAcross = (c === 0 || grid[r][c - 1] === null) && c + 1 < n && grid[r][c + 1] !== null;
      const startsDown = (r === 0 || grid[r - 1][c] === null) && r + 1 < n && grid[r + 1][c] !== null;
      if (startsAcross || startsDown) numAt[`${r},${c}`] = String(++num);
    }

    const puzzle = grid.map((row, r) => row.map((cell, c) => cell === null ? '#' : (numAt[`${r},${c}`] ?? '0')));
    const solution = grid.map(row => row.map(cell => cell));

    const clues = { Across: [], Down: [] };
    const usedWords = [];
    for (const s of slots) {
      const word = s.cells.map(([r, c]) => grid[r][c]).join('');
      const [r0, c0] = s.cells[0];
      const entry = cluesByWord.get(word);
      if (!entry) return null;
      clues[s.dir].push({ number: numAt[`${r0},${c0}`], cells: s.cells, clue: pick(entry).clue });
      usedWords.push(word);
    }
    clues.Across.sort((a, b) => +a.number - +b.number);
    clues.Down.sort((a, b) => +a.number - +b.number);
    return { puzzle, solution, clues, usedWords };
  }
  return null;
}

// ---------- SQL emitters ----------
const q = (s) => s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`;
const arr2d = (rows) => `'{${rows.map(r => `{${r.map(c => c === null ? 'NULL' : `"${String(c).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',')}}`).join(',')}}'::text[]`;
const arr1d = (xs) => `'{${xs.map(x => `"${x}"`).join(',')}}'::text[]`;
const jsonb = (o) => `${q(JSON.stringify(o))}::jsonb`;
const uuid = (n) => { const h = '0123456789abcdef'; let s = ''; for (let i = 0; i < 32; i++) s += h[Math.floor(rnd() * 16)]; return `${s.slice(0,8)}-${s.slice(8,12)}-4${s.slice(13,16)}-a${s.slice(17,20)}-${s.slice(20,32)}`; };

const CATEGORIES = ['general','sports','history','geography','science','politics','movies','television','pop_culture'];
const out = [];
out.push('-- Synthetic seed data. Generated by scripts/local-db/gen-seed.js — NOT production data.');
out.push('BEGIN;');
out.push('TRUNCATE TABLE "gamePlayers", "analyticsEvents", "friendships", "rankedQueue", "seenClues", "challenge_results", "challenges", "games", "crosswords", "sudokus", "profiles" RESTART IDENTITY CASCADE;');

// --- profiles ---
const NAMES = [
  ['ada','Ada Lovelace','GB'], ['grace','Grace Hopper','US'], ['alan','Alan Turing','GB'],
  ['katherine','Katherine Johnson','US'], ['linus','Linus Torvalds','FI'], ['margaret','Margaret Hamilton','US'],
  ['barbara','Barbara Liskov','US'], ['edsger','Edsger Dijkstra','NL'], ['radia','Radia Perlman','US'],
  ['tim','Tim Berners-Lee','GB'], ['shafi','Shafi Goldwasser','IL'], ['donald','Donald Knuth','US'],
];
const BOTS = [['bot_easy',900],['bot_regular',1150],['bot_hard',1450]];
const profiles = [];
NAMES.forEach(([username, name, country], i) => {
  const id = uuid();
  const elo = 850 + Math.floor(rnd() * 700);
  profiles.push({ id, username, name, elo, type: 'USER' });
  out.push(`INSERT INTO profiles ("id","userId","username","name","email","country","eloRating","ratingDeviation","volatility","eloRatingSudoku","eloRatingWordSearch","eloRatingTrivia","type","createdAt","lastSeenAt") VALUES (${q(id)}, ${q('auth-' + username)}, ${q(username)}, ${q(name)}, ${q(username + '@example.test')}, ${q(country)}, ${elo}, ${60 + Math.floor(rnd()*120)}, 0.06, ${900 + Math.floor(rnd()*600)}, ${900 + Math.floor(rnd()*600)}, ${900 + Math.floor(rnd()*600)}, 'USER', now() - interval '${90 - i * 5} days', now() - interval '${Math.floor(rnd()*72)} hours');`);
});
BOTS.forEach(([username, elo]) => {
  const id = uuid();
  profiles.push({ id, username, name: username, elo, type: 'BOT' });
  out.push(`INSERT INTO profiles ("id","userId","username","name","eloRating","ratingDeviation","volatility","type","createdAt") VALUES (${q(id)}, ${q('auth-' + username)}, ${q(username)}, ${q(username)}, ${elo}, 50, 0.06, 'BOT', now() - interval '120 days');`);
});

// --- crosswords ---
const crosswords = [];
process.stderr.write('generating crosswords');
for (let i = 0; i < 12; i++) {
  const cw = buildCrossword();
  if (!cw) { process.stderr.write('!'); continue; }
  process.stderr.write('.');
  const id = uuid();
  const difficulty = 1 + Math.floor(rnd() * 5);
  crosswords.push({ id, difficulty });
  out.push(`INSERT INTO crosswords ("id","size","difficulty","isPublished","source","category","puzzle","solution","clues","usedWords","createdAt") VALUES (${q(id)}, 5, ${difficulty}, ${i < 10 ? 'true' : 'false'}, ${i % 3 === 0 ? "'aicross'" : "'wizium'"}, ${q(pick(CATEGORIES))}::"CrosswordCategory", ${arr2d(cw.puzzle)}, ${arr2d(cw.solution)}, ${jsonb(cw.clues)}, ${arr1d(cw.usedWords)}, now() - interval '${60 - i * 4} days');`);
}
process.stderr.write('\n');

// --- games + players ---
const humans = profiles.filter(p => p.type === 'USER');
const bots = profiles.filter(p => p.type === 'BOT');
const GAME_TYPES = ['SOLO','FRIENDLY','RANKED','RANKED_BOT'];
const gameIds = [];
for (let i = 0; i < 40; i++) {
  const id = uuid();
  gameIds.push(id);
  const gameType = pick(GAME_TYPES);
  const cw = pick(crosswords);
  const solo = gameType === 'SOLO';
  const p1 = pick(humans);
  let p2 = gameType === 'RANKED_BOT' ? pick(bots) : pick(humans.filter(p => p.id !== p1.id));
  const players = solo ? [p1] : [p1, p2];
  const roll = rnd();
  const playState = roll < 0.7 ? 'COMPLETED' : roll < 0.85 ? 'PLAYING' : roll < 0.95 ? 'WAITING_FOR_OPPONENT' : 'ABORTED';
  const done = playState === 'COMPLETED';
  const winner = done && !solo ? pick(players) : null;
  const ageHours = Math.floor(rnd() * 24 * 45);
  out.push(`INSERT INTO games ("id","crosswordsId","gameType","playState","gameDurationInSeconds","gameVariant","difficulty","createdAt","startedAt","winnerId") VALUES (${q(id)}, ${q(cw.id)}, ${q(gameType)}::"GameType", ${q(playState)}::"PlayState", ${pick([120,180,300])}, 'CROSSWORD', ${q(pick(['EASY','REGULAR','HARD']))}, now() - interval '${ageHours} hours', ${playState === 'WAITING_FOR_OPPONENT' ? 'NULL' : `now() - interval '${ageHours} hours'`}, ${winner ? q(winner.id) : 'NULL'});`);
  for (const p of players) {
    const score = playState === 'WAITING_FOR_OPPONENT' ? 0 : Math.floor(rnd() * (winner && winner.id === p.id ? 25 : 18));
    out.push(`INSERT INTO "gamePlayers" ("gamesId","profilesId","score") VALUES (${q(id)}, ${q(p.id)}, ${score});`);
  }
}

// --- friendships ---
const seenPair = new Set();
for (let i = 0; i < 18; i++) {
  const a = pick(humans), b = pick(humans.filter(p => p.id !== a.id));
  const key = [a.id, b.id].sort().join('|');
  if (seenPair.has(key)) continue;
  seenPair.add(key);
  out.push(`INSERT INTO friendships ("requesterId","addresseeId","status","createdAt") VALUES (${q(a.id)}, ${q(b.id)}, ${q(rnd() < 0.75 ? 'ACCEPTED' : 'PENDING')}, now() - interval '${Math.floor(rnd()*30)} days') ON CONFLICT DO NOTHING;`);
}

// --- ranked queue ---
for (const p of shuffled(humans).slice(0, 4)) {
  out.push(`INSERT INTO "rankedQueue" ("profilesId","rating","gameVariant","difficulty","joinedAt","lastSeenAt") VALUES (${q(p.id)}, ${p.elo}, 'CROSSWORD', ${q(pick(['EASY','REGULAR','HARD']))}, now() - interval '${Math.floor(rnd()*120)} seconds', now()) ON CONFLICT DO NOTHING;`);
}

// --- analytics events ---
const EVENTS = ['app_open','game_started','game_completed','clue_revealed','share_tapped','push_opened'];
for (let i = 0; i < 120; i++) {
  const p = pick(humans);
  const platform = pick(['ios','android']);
  out.push(`INSERT INTO "analyticsEvents" ("profilesId","name","properties","platform","createdAt") VALUES (${q(p.id)}, ${q(pick(EVENTS))}, ${jsonb({ version: pick(['1.4.0','1.5.0','1.5.1']) })}, ${q(platform)}, now() - interval '${Math.floor(rnd()*24*30)} hours');`);
}

out.push('COMMIT;');
fs.writeFileSync(`${SP}/seed-data.sql`, out.join('\n') + '\n');
console.log(`wrote ${out.length} statements; ${crosswords.length} crosswords, ${profiles.length} profiles`);
