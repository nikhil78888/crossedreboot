// One-off scrub: unpublish already-published crosswords whose clues include a
// clue the generator now rejects — chiefly the generic "un-gettable" name/
// category clues ("Common man's name", "A woman's name", "Name for a dog") and
// broken cross-references ("See 42", "11-Across"). The generator filters these
// at generation time via isBadClue, but puzzles published BEFORE that eval
// existed still carry them, so this cleans the live pool.
//
// It unpublishes the whole puzzle (isPublished=false) — same reversible move as
// audit-puzzles.mjs — rather than rewriting a single clue (which would have to
// be re-resolved against the answer). The generator refills the pool with clean
// puzzles. Nothing is deleted; flip isPublished back to re-publish.
//
// Usage (run from apps/api so .env resolves):
//   node scripts/scrub-bad-clues.mjs            # dry run: report offenders
//   node scripts/scrub-bad-clues.mjs --apply    # unpublish them
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

// The scrub is DELIBERATELY narrower than the generator's isBadClue. The
// generator can afford an over-broad filter — rejecting a candidate clue just
// makes it pick another, so a bare /\b(across|down)\b/ that also trips on good
// prose ("Down in the dumps", "flows down to the sea") costs nothing there. But
// the scrub UNPUBLISHES the whole puzzle, so that same rule would destroy
// hundreds of good puzzles. Here we flag only clues that are genuinely
// un-gettable or broken:
//   1. Generic name/category clues ("A common girl's name") — the user's ask.
//   2. REAL cross-references — always digit-anchored ("See 12", "11-Across",
//      "11d-27a"), never bare "down"/"across" appearing as ordinary words.
const isBadClue = (c) => {
  const t = (c || "").trim();
  return (
    // --- genuine cross-references (all require a digit, so no prose FPs) ---
    /\bsee\s+\d/i.test(t) ||
    /\b\d{1,3}\s*[-–]?\s*(across|down)\b/i.test(t) ||
    /\b\d{1,3}\s*[ad]\b\s*[-–]\s*\d/i.test(t) || // 11d-27a chains
    /\d[ad]\s*[-–]\s*\d/i.test(t) ||
    // --- generic "<person>('s) name" ---
    /\b(man|woman|men|women|boy|girl|guy|lady|male|female|person|baby|kid|pet|dog|cat)'?s?\s+name\b/i.test(
      t
    ) ||
    // "name for a boy/girl/…" and "___ name" category phrasings
    /\bname\s+(for\s+)?(a\s+)?(boy|girl|man|woman|baby|pet|dog|cat|child)\b/i.test(
      t
    ) ||
    /\b(common|popular|typical|old-fashioned|classic)\s+(first\s+|boy'?s?\s+|girl'?s?\s+|male\s+|female\s+)?name\b/i.test(
      t
    ) ||
    /^(a|an|the)\s+(common\s+|popular\s+)?(first\s+)?name\b/i.test(t)
  );
};

// Pull every clue string out of a puzzle's `clues` payload, tolerating both a
// parsed object and a JSON string, and either { Across, Down } or a flat array.
function cluesOf(clues) {
  let c = clues;
  if (typeof c === "string") {
    try {
      c = JSON.parse(c);
    } catch {
      return [];
    }
  }
  if (!c || typeof c !== "object") return [];
  const lists = Array.isArray(c) ? [c] : [c.Across, c.Down, c.across, c.down];
  const out = [];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      const text = typeof entry === "string" ? entry : entry && entry.clue;
      if (typeof text === "string" && text.trim()) out.push(text.trim());
    }
  }
  return out;
}

(async () => {
  console.log("Fetching published puzzles…");
  const rows = await (
    await fetch(
      `${SUPABASE_URL}/rest/v1/crosswords?select=id,size,clues&isPublished=eq.true&limit=20000`,
      { headers }
    )
  ).json();
  if (!Array.isArray(rows)) {
    throw new Error(`unexpected response: ${JSON.stringify(rows).slice(0, 200)}`);
  }
  console.log(`  ${rows.length} published puzzles`);

  const bySize = {};
  const badIds = [];
  const samples = [];
  for (const p of rows) {
    bySize[p.size] ||= { total: 0, bad: 0 };
    bySize[p.size].total++;
    const offending = cluesOf(p.clues).filter(isBadClue);
    if (offending.length > 0) {
      bySize[p.size].bad++;
      badIds.push(p.id);
      if (samples.length < 25)
        samples.push({ id: p.id, clue: offending[0], count: offending.length });
    }
  }

  console.log("\nResults (bad = has ≥1 clue the generator now rejects):");
  for (const s of Object.keys(bySize).sort()) {
    const { total, bad } = bySize[s];
    console.log(`  ${s}x${s}: ${bad}/${total} bad -> would keep ${total - bad}`);
  }

  if (samples.length) {
    console.log("\nSample offenders (first offending clue per puzzle):");
    for (const s of samples)
      console.log(
        `  ${s.id.slice(0, 8)}… "${s.clue}"${s.count > 1 ? ` (+${s.count - 1} more)` : ""}`
      );
  }

  console.log(`\nTotal to unpublish: ${badIds.length}`);
  if (!APPLY) {
    console.log("(dry run — pass --apply to unpublish)");
    return;
  }

  console.log("Unpublishing…");
  for (let i = 0; i < badIds.length; i += 100) {
    const batch = badIds.slice(i, i + 100);
    const inList = batch.map((id) => `"${id}"`).join(",");
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/crosswords?id=in.(${encodeURIComponent(inList)})`,
      {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({ isPublished: false }),
      }
    );
    if (!res.ok) throw new Error(`patch failed ${res.status}: ${await res.text()}`);
    console.log(`  unpublished ${Math.min(i + 100, badIds.length)}/${badIds.length}`);
  }
  console.log("Done.");
})();
