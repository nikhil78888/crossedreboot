// Unpublish existing puzzles that contain obscure (non-common) answer words.
// "Too hard" puzzles came from a cryptic-crossword word list full of obscure
// fill; this flags any published puzzle whose answers aren't all common (in the
// frequency list within --maxrank) and unpublishes them.
//
// Usage:
//   node scripts/audit-puzzles.mjs            # dry run: report only
//   node scripts/audit-puzzles.mjs --apply    # unpublish the hard ones
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
const headers = { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json" };

const args = process.argv.slice(2);
const getArg = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const MAX_FREQ_RANK = parseInt(getArg("maxrank", "40000"), 10);
const APPLY = args.includes("--apply");
const FREQ_URL =
  "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt";

async function loadFreq() {
  const txt = await (await fetch(FREQ_URL)).text();
  const rank = new Map();
  txt.split("\n").forEach((line, i) => {
    const w = (line.split(" ")[0] || "").trim().toUpperCase();
    if (w && /^[A-Z]+$/.test(w) && !rank.has(w)) rank.set(w, i);
  });
  return rank;
}

// Pull all answer words (across + down runs of length >= 2) from a solution grid.
function wordsFromSolution(solution) {
  if (!Array.isArray(solution)) return [];
  const rows = solution.length;
  const cellAt = (r, c) => {
    const v = solution[r] && solution[r][c];
    return typeof v === "string" && /^[A-Za-z]$/.test(v) ? v.toUpperCase() : null;
  };
  const cols = Math.max(...solution.map((r) => (Array.isArray(r) ? r.length : 0)));
  const words = [];
  // across
  for (let r = 0; r < rows; r++) {
    let w = "";
    for (let c = 0; c <= cols; c++) {
      const ch = c < cols ? cellAt(r, c) : null;
      if (ch) w += ch;
      else {
        if (w.length >= 2) words.push(w);
        w = "";
      }
    }
  }
  // down
  for (let c = 0; c < cols; c++) {
    let w = "";
    for (let r = 0; r <= rows; r++) {
      const ch = r < rows ? cellAt(r, c) : null;
      if (ch) w += ch;
      else {
        if (w.length >= 2) words.push(w);
        w = "";
      }
    }
  }
  return words;
}

(async () => {
  console.log("Loading frequency list…");
  const rank = await loadFreq();
  const isCommon = (w) => {
    const r = rank.get(w);
    return r !== undefined && r <= MAX_FREQ_RANK;
  };

  console.log("Fetching published puzzles…");
  const rows = await (
    await fetch(
      `${SUPABASE_URL}/rest/v1/crosswords?select=id,size,solution&isPublished=eq.true&limit=5000`,
      { headers }
    )
  ).json();
  console.log(`  ${rows.length} published puzzles`);

  const bySize = {};
  const hardIds = [];
  for (const p of rows) {
    bySize[p.size] ||= { total: 0, hard: 0 };
    bySize[p.size].total++;
    const words = wordsFromSolution(p.solution);
    // 2-letter words can't be in the freq list reliably; only judge >=3.
    const judged = words.filter((w) => w.length >= 3);
    const obscure = judged.filter((w) => !isCommon(w));
    if (obscure.length > 0) {
      bySize[p.size].hard++;
      hardIds.push(p.id);
    }
  }

  console.log("\nResults (hard = has an obscure answer):");
  for (const s of Object.keys(bySize).sort()) {
    const { total, hard } = bySize[s];
    console.log(`  ${s}x${s}: ${hard}/${total} hard -> would keep ${total - hard}`);
  }
  console.log(`\nTotal to unpublish: ${hardIds.length}`);

  if (!APPLY) {
    console.log("(dry run — pass --apply to unpublish)");
    return;
  }

  console.log("Unpublishing…");
  for (let i = 0; i < hardIds.length; i += 100) {
    const batch = hardIds.slice(i, i + 100);
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
    console.log(`  unpublished ${Math.min(i + 100, hardIds.length)}/${hardIds.length}`);
  }
  console.log("Done.");
})();
