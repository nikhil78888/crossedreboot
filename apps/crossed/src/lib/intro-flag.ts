// One-shot, session-scoped flag set when a brand-new player taps "Play" on the
// welcome screen. The root auth guard redirects them to /home once their
// anonymous account is created, and /home consumes this flag to launch the
// guided intro race. A module-level flag (not a route param) so it survives that
// redirect without racing the guard.
let pendingIntro = false;

export const setPendingIntro = (v: boolean) => {
  pendingIntro = v;
};

export const consumePendingIntro = () => {
  const v = pendingIntro;
  pendingIntro = false;
  return v;
};

// Read without clearing — lets /home render a spinner (not the dashboard) from
// the very first frame, so the intro doesn't flash the dashboard before the race.
export const peekPendingIntro = () => pendingIntro;

// A challenge id delivered by a Branch deep link before the user has an account
// (new install). /home consumes it after the silent account is created and routes
// straight to the ghost race — the challenge becomes their first experience
// instead of the generic bot intro.
let pendingChallengeId: string | null = null;
export const setPendingChallenge = (id: string | null) => {
  pendingChallengeId = id;
};
export const peekPendingChallenge = () => pendingChallengeId;
export const consumePendingChallenge = () => {
  const v = pendingChallengeId;
  pendingChallengeId = null;
  return v;
};

// A username we auto-assign so a new player can start before naming themselves.
// They rename on the post-race screen. This prefix is also the signal that a
// player is still unnamed (drives the "pick a username" prompt).
export const PLACEHOLDER_PREFIX = "player.";

export const isPlaceholderUsername = (username?: string | null) =>
  !!username && username.startsWith(PLACEHOLDER_PREFIX);

export const makePlaceholderUsername = () =>
  PLACEHOLDER_PREFIX +
  Array.from(
    { length: 7 },
    () => "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)]
  ).join("");
