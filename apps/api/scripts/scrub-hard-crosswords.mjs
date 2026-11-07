// One-off scrub: unpublish already-published crosswords whose FILL WORDS are
// too obscure for an average player ("the words are the hard part"). Clue tier
// is already eased at serve time (the resolver prefers REGULAR clues) and the
// size weighting favors minis, but the existing pool still contains puzzles
// built on crossword-ese fill (ETUI, OLEO, ORTS, ERNE…) that no clue rescues.
//
// It reads each published crossword's `usedWords` and flags the puzzle if any
// word is genuinely awkward fill. A pure frequency cap was far too blunt (it
// flagged fair words like OAR / ACRE / ADOBE / BERET that just aren't in a
// frequency list), so the signal is: NOT a real dictionary headword AND not a
// common everyday abbreviation — which precisely catches squashed-phrase fill
// (ATAD="a tad", ATALL, INON, ONEND, IMIN, ASIS, SOSO) and obscure junk, while
// keeping every real English word. With --loose it also flags real words rarer
// than a generous frequency cap. Flagged puzzles are
// UNPUBLISHED (isPublished=false) — fully reversible, nothing is deleted; flip
// the flag back to re-publish. The generator refills the pool with easier fill.
//
// DRY RUN BY DEFAULT — it reports what it WOULD unpublish, the distribution by
// size, and sample offending words, so you can sanity-check before applying.
//
// Usage (run from apps/api so .env resolves):
//   node scripts/scrub-hard-crosswords.mjs             # dry run: report only
//   node scripts/scrub-hard-crosswords.mjs --apply     # actually unpublish
//   node scripts/scrub-hard-crosswords.mjs --loose     # stricter easing (flag more)
//
import fs from "fs";
import path from "path";

const envText = fs.readFileSync(path.join(process.cwd(), ".env"), "utf8");
const env = Object.fromEntries(
  envText
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);
const SUPABASE_URL = env.SUPABASE_URL;
const SR = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SR)
  throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env");
const headers = {
  apikey: SR,
  Authorization: `Bearer ${SR}`,
  "Content-Type": "application/json",
};

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const LOOSE = args.includes("--loose"); // flag more aggressively

const FREQ_URL =
  "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt";
const WEBSTER_URL =
  "https://raw.githubusercontent.com/matthewreagan/WebstersEnglishDictionary/master/dictionary_compact.json";

// Everyday abbreviations/slang that aren't dictionary headwords but are fair,
// gettable fill — NOT flagged. (The awkward stuff is squashed phrases and truly
// obscure entries, which this allowlist deliberately leaves out.)
const OK_ABBREV = new Set([
  "ETA", "ICU", "CPR", "URL", "PTA", "PTO", "ATV", "TLC", "DVD", "TV", "SOS",
  "IOU", "OMG", "LOL", "BFF", "BTW", "FYI", "ASAP", "DIY", "FAQ", "CEO", "DNA",
  "RNA", "GPS", "USB", "PDF", "ATM", "FBI", "CIA", "NASA", "ER", "AC", "PC",
  "AM", "PM", "OK", "MVP", "NBA", "NFL", "MLB", "UFO", "RSVP", "AKA", "ETAL",
  "NDA", "POV", "CGI", "TBD", "EOD", "YOLO", "ESP", "HBO", "PBS", "CNN",
]);

// Only used with --loose: also flag real words rarer than a generous cap.
const CAP = { 3: 15000, 4: 20000, 5: 28000, 6: 38000, 7: 46000, 8: 50000 };
const capFor = (len) => CAP[Math.min(8, Math.max(3, len))] ?? 50000;

async function loadFreq() {
  const txt = await (await fetch(FREQ_URL)).text();
  const rank = new Map();
  txt.split("\n").forEach((line, i) => {
    const w = (line.split(" ")[0] || "").trim().toUpperCase();
    if (w && /^[A-Z]+$/.test(w) && !rank.has(w)) rank.set(w, i);
  });
  return rank;
}

async function loadDictWords() {
  const d = await (await fetch(WEBSTER_URL)).json();
  const set = new Set();
  for (const k of Object.keys(d)) {
    const w = k.trim().toUpperCase();
    if (/^[A-Z]+$/.test(w)) set.add(w);
  }
  return set;
}

async function fetchAllPublished() {
  const out = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/crosswords?select=id,size,usedWords&isPublished=eq.true&order=id`,
      { headers: { ...headers, Range: `${from}-${to}` } }
    );
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    out.push(...batch);
    if (batch.length < pageSize) break;
  }
  return out;
}

async function unpublish(ids) {
  // PATCH in chunks via the `in` filter.
  const chunk = 200;
  for (let i = 0; i < ids.length; i += chunk) {
    const slice = ids.slice(i, i + chunk);
    const inList = `(${slice.map((id) => `"${id}"`).join(",")})`;
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/crosswords?id=in.${encodeURIComponent(inList)}`,
      {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({ isPublished: false }),
      }
    );
    if (!res.ok) throw new Error(`PATCH failed: ${res.status} ${await res.text()}`);
  }
}

(async () => {
  console.log(`Loading dictionary + frequency…  (mode: ${LOOSE ? "loose" : "normal"})`);
  const [dictWords, rank] = await Promise.all([loadDictWords(), loadFreq()]);
  const rows = await fetchAllPublished();
  console.log(`Published crosswords: ${rows.length}`);

  const flagged = [];
  const bySizeTotal = {};
  const bySizeFlagged = {};
  const offenderCounts = new Map();

  for (const r of rows) {
    bySizeTotal[r.size] = (bySizeTotal[r.size] || 0) + 1;
    const words = (r.usedWords || []).map((w) => String(w).toUpperCase());
    const bad = [];
    for (const w of words) {
      if (!/^[A-Z]+$/.test(w) || w.length < 3) continue;
      // Primary signal: not a real dictionary word and not a fair everyday
      // abbreviation → squashed-phrase / obscure junk fill.
      const isJunk = !dictWords.has(w) && !OK_ABBREV.has(w);
      // --loose also flags real-but-rare words.
      const rk = rank.get(w);
      const tooRare = LOOSE && (rk === undefined || rk > capFor(w.length));
      if (isJunk || tooRare) bad.push(w);
    }
    if (bad.length) {
      flagged.push(r.id);
      bySizeFlagged[r.size] = (bySizeFlagged[r.size] || 0) + 1;
      for (const w of bad) offenderCounts.set(w, (offenderCounts.get(w) || 0) + 1);
    }
  }

  console.log("\n--- Distribution (published → would-unpublish → would-remain) ---");
  for (const size of Object.keys(bySizeTotal).sort((a, b) => a - b)) {
    const total = bySizeTotal[size] || 0;
    const flag = bySizeFlagged[size] || 0;
    console.log(`  size ${size}: ${total}  →  -${flag}  →  ${total - flag}`);
  }
  console.log(
    `  TOTAL: ${rows.length}  →  -${flagged.length}  →  ${rows.length - flagged.length}`
  );

  const topOffenders = [...offenderCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40);
  console.log("\n--- Top obscure fill words triggering flags ---");
  console.log(topOffenders.map(([w, n]) => `${w}(${n})`).join("  "));

  if (!APPLY) {
    console.log(
      `\nDRY RUN. Would unpublish ${flagged.length} crossword(s). ` +
        `Re-run with --apply to do it (or --loose --apply to ease further).`
    );
    return;
  }
  console.log(`\nUnpublishing ${flagged.length} crossword(s)…`);
  await unpublish(flagged);
  console.log(`Done. Remaining published: ${rows.length - flagged.length}.`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
