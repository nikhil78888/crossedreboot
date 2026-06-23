// One-time backfill: populate crosswords.usedWords (the distinct answer words in
// each grid) so puzzle selection can space out word repeats per user.
//   node scripts/backfill-used-words.mjs
import fs from "fs";
import path from "path";

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(process.cwd(), ".env"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);
const BASE = env.SUPABASE_URL;
const SR = env.SUPABASE_SERVICE_ROLE_KEY;
const h = { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json" };

// Recover the distinct answer words from a grid (mirrors clue-resolver.ts).
const wordsOf = (puzzle, solution) => {
  const rows = puzzle.length;
  const cols = puzzle[0]?.length ?? 0;
  const out = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (puzzle[r][c] === "#") continue;
      if ((c === 0 || puzzle[r][c - 1] === "#") && c + 1 < cols && puzzle[r][c + 1] !== "#") {
        let w = "", cc = c;
        while (cc < cols && puzzle[r][cc] !== "#") { w += solution[r][cc] ?? ""; cc += 1; }
        if (w.length >= 2) out.push(w.toUpperCase());
      }
      if ((r === 0 || puzzle[r - 1][c] === "#") && r + 1 < rows && puzzle[r + 1][c] !== "#") {
        let w = "", rr = r;
        while (rr < rows && puzzle[rr][c] !== "#") { w += solution[rr][c] ?? ""; rr += 1; }
        if (w.length >= 2) out.push(w.toUpperCase());
      }
    }
  }
  return Array.from(new Set(out));
};

const PAGE = 1000;
const CONCURRENCY = 25;

(async () => {
  let from = 0, patched = 0, scanned = 0;
  for (;;) {
    const res = await fetch(
      `${BASE}/rest/v1/crosswords?select=id,puzzle,solution&order=id&limit=${PAGE}&offset=${from}`,
      { headers: h }
    );
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    scanned += rows.length;

    // Patch in small concurrent batches.
    for (let i = 0; i < rows.length; i += CONCURRENCY) {
      const slice = rows.slice(i, i + CONCURRENCY);
      await Promise.all(
        slice.map(async (row) => {
          if (!Array.isArray(row.puzzle) || !Array.isArray(row.solution)) return;
          const used = wordsOf(row.puzzle, row.solution);
          if (!used.length) return;
          const r = await fetch(`${BASE}/rest/v1/crosswords?id=eq.${row.id}`, {
            method: "PATCH",
            headers: { ...h, Prefer: "return=minimal" },
            body: JSON.stringify({ usedWords: used }),
          });
          if (r.ok) patched += 1;
          else console.error("patch failed", row.id, r.status, await r.text());
        })
      );
    }
    console.log(`scanned ${scanned}, patched ${patched}`);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  console.log(`Done. Backfilled usedWords on ${patched} crosswords.`);
})();
