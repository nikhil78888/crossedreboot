// Rubber-band bot tuning shared by the ranked puzzle components (crossword,
// sudoku). Every game is a close race — the bot tracks a hair ahead of the
// player, capped just short of the finish so completing the grid normally wins.
//
// In a deterministic ~20% slice of games the bot is allowed to WIN, but only at
// the wire: it stays close like always, then the moment the player nears the
// finish (~80% done) it surges to 100% and tries to complete just before them.
// A photo-finish loss, not a runaway.

const BOT_WIN_RATE = 0.2;
const SURGE_AT = 0.8; // player progress at which a win-game bot rushes the finish

// Stable [0,1) hash of the gameId — same result across every re-render/tick of a
// match, so a game is consistently either a "bot can win" game or not.
const hashFrac = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
};

// ~20% of games: the bot is allowed to finish and win (at the wire). Callers AND
// this together — e.g. the guided intro race passes canWin=false so a new
// player always wins game one.
export const botCanWin = (gameId?: string | null): boolean =>
  !!gameId && hashFrac(gameId) < BOT_WIN_RATE;

// True once the player is near done in a win-game: the bot should rush to 100%.
export const botShouldSurge = (canWin: boolean, playerFrac: number): boolean =>
  canWin && playerFrac >= SURGE_AT;

// The bot's target fill fraction this tick. Normally a hair ahead, capped at 0.9
// (finishing beats it). In a win-game, once the player crosses SURGE_AT the cap
// lifts to 1.0 so the bot races to the line.
export const botTargetFrac = (
  canWin: boolean,
  playerFrac: number,
  earlyFloor: number,
  lead: number
): number => {
  if (botShouldSurge(canWin, playerFrac)) return 1;
  return Math.min(0.9, Math.max(earlyFloor, playerFrac + lead));
};
