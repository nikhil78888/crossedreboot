import express, { Router } from "express";
import { supabase } from "../lib/supabase";
import { Game, duelMeta, bossNameFor, STORY_MAX_LEVEL } from "types-and-validators";
import { finalizeGame } from "./game.service";
import { getProfileIdByUid } from "../friends/friends.service";

export const gameRouter: Router = express.Router();

// Every Story Mode opponent name. Story reuses the daily-duel pipeline (a FRIENDLY
// game with a null-challenger boss), so the daily-rank board must exclude these or
// a Story game masquerades as "today's duel".
const STORY_BOSS_NAMES: Set<string> = new Set(
  Array.from({ length: STORY_MAX_LEVEL }, (_, i) => bossNameFor(i + 1))
);

// Today's Daily Duel definition — the single source of truth. The client sends
// its local calendar day and gets back the canonical meta (variant, opponent,
// time-to-beat). Because every app version fetches the duel from here instead of
// computing it locally, no build can diverge and fork the leaderboard. The meta
// is a pure function of the day (shared package), so this is cheap and stateless.
gameRouter.get("/daily-duel-meta", (req, res) => {
  try {
    const dayParam = typeof req.query.day === "string" ? req.query.day : undefined;
    // Only accept a well-formed YYYY-MM-DD; otherwise fall back to server "today".
    const day = dayParam && /^\d{4}-\d{2}-\d{2}$/.test(dayParam) ? dayParam : undefined;
    res.send(duelMeta(day));
  } catch (error) {
    console.log({ dailyDuelMetaError: error });
    res.status(500).send();
  }
});

// Daily-duel leaderboard: the caller's rank + percentile among everyone who
// played the SAME daily duel. Grouped by the deterministic puzzle key
// (variant + opponent + time-to-beat), so two players on the same day's duel are
// compared regardless of timezone. Computed on the fly from the duel games
// (system challenges: __challenge.challengerId == null) — no separate table.
gameRouter.get("/daily-rank", async (req, res) => {
  try {
    const myId = await getProfileIdByUid(req.decodedFirebaseToken.uid);
    if (!myId) {
      res.send({ played: false });
      return;
    }
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: games } = await supabase
      .from("games")
      .select(
        "id, gameVariant, gameState, createdAt, players:profiles!gamePlayers(id,type,username,avatar)"
      )
      .eq("gameType", "FRIENDLY")
      .gte("createdAt", since);

    const isTest = (u?: string | null) => {
      const n = (u || "").toLowerCase();
      return !n || /^player\./.test(n) || ["nigelman", "leomans"].includes(n);
    };

    type Entry = {
      key: string;
      profileId: string;
      username: string | null;
      avatar: string | null;
      seconds: number;
    };
    const entries: Entry[] = [];
    // The caller's MOST RECENT duel (finished or not) — anchors the board to
    // TODAY's puzzle, not their fastest-ever in the window (which was showing a
    // stale yesterday result when today's solve hadn't registered).
    let myLatest: { createdAt: string; key: string; seconds: number | null } | null =
      null;
    for (const g of (games ?? []) as unknown as {
      createdAt: string;
      gameVariant: string;
      gameState: Record<string, unknown> | null;
      players: {
        id: string;
        type: string;
        username: string | null;
        avatar: string | null;
      }[];
    }[]) {
      const ch = (g.gameState as Record<string, unknown> | null)?.[
        "__challenge"
      ] as
        | { challengerId?: string | null; name?: string | null; seconds?: number }
        | undefined;
      // Daily duel = system challenge (challengerId null) with a CAST opponent
      // name. Exclude the reengagement "the record" challenge (also challengerId
      // null) so it doesn't create its own bogus one-person board.
      if (!ch || ch.challengerId != null || !ch.name || ch.name === "the record")
        continue;
      // Story Mode also uses a null-challenger FRIENDLY game (opponent = a boss,
      // variants incl. Wordsy/Categories). Exclude it so a Story game can't be
      // mistaken for today's duel (which was returning played:false / an empty
      // board when the caller's most recent such game was a Story level).
      if (
        g.gameVariant === "WORDSY" ||
        g.gameVariant === "CATEGORIES" ||
        STORY_BOSS_NAMES.has(ch.name)
      ) {
        continue;
      }
      const human = (g.players ?? []).find((p) => p.type !== "BOT");
      if (!human) continue; // keep test accounts here; filtered from the list below
      // Group by variant + opponent only — NOT time-to-beat. The client-side duel
      // ease means ch.seconds now differs between app builds on the SAME day, which
      // was splitting one day's players onto separate boards. Ranking still uses
      // the actual solve time; the opponent name already separates days.
      const key = `${g.gameVariant}|${ch.name}`;
      const solved = (
        g.gameState as Record<string, { solvedInSeconds?: number }> | null
      )?.[human.id]?.solvedInSeconds;
      const secs = solved != null && solved > 0 ? Math.round(solved) : null;
      if (human.id === myId && (!myLatest || g.createdAt > myLatest.createdAt)) {
        myLatest = { createdAt: g.createdAt, key, seconds: secs };
      }
      if (secs == null) continue; // didn't finish → not a ranked entry
      entries.push({
        key,
        profileId: human.id,
        username: human.username,
        avatar: human.avatar,
        seconds: secs,
      });
    }

    // No completed duel today → prompt them to finish it (don't show yesterday).
    if (!myLatest || myLatest.seconds == null) {
      res.send({ played: false });
      return;
    }
    const myKey = myLatest.key;
    const mySeconds = myLatest.seconds;

    // Best time per player on TODAY's puzzle, sorted fastest first. Other test
    // accounts are hidden from the board; the caller always sees themselves.
    const bestByPlayer = new Map<string, Entry>();
    for (const e of entries) {
      if (e.key !== myKey) continue;
      if (isTest(e.username) && e.profileId !== myId) continue;
      const cur = bestByPlayer.get(e.profileId);
      if (!cur || e.seconds < cur.seconds) bestByPlayer.set(e.profileId, e);
    }
    const sorted = [...bestByPlayer.values()].sort(
      (a, b) => a.seconds - b.seconds
    );
    // Competition ranking: equal times share a rank.
    let rank = 0;
    let lastSec: number | null = null;
    const list = sorted.map((e, i) => {
      if (lastSec == null || e.seconds !== lastSec) {
        rank = i + 1;
        lastSec = e.seconds;
      }
      return {
        profileId: e.profileId,
        username: e.username,
        avatar: e.avatar,
        seconds: e.seconds,
        rank,
        isYou: e.profileId === myId,
      };
    });
    const meRow = list.find((r) => r.isYou);
    const total = list.length;
    const myRank = meRow?.rank ?? null;
    const percentile = myRank ? Math.max(1, Math.round((100 * myRank) / total)) : null;
    const beatPct =
      myRank && total > 1
        ? Math.round((100 * (total - myRank)) / (total - 1))
        : 100;

    // Award a Daily Duel medal for a top-10% finish (idempotent — one per day).
    // percentile <= 10 inherently requires a real field (rank 1 needs >= 10
    // finishers), so tiny boards can't mint medals. Keyed by the UTC date of the
    // caller's duel. Non-blocking: a medal write must never fail the rank read.
    if (percentile != null && percentile <= 10 && myRank != null) {
      const periodKey = myLatest.createdAt.slice(0, 10);
      try {
        await (
          supabase as unknown as {
            from: (t: "medals") => {
              upsert: (
                v: Record<string, unknown>,
                o: { onConflict: string; ignoreDuplicates: boolean }
              ) => Promise<{ error: unknown }>;
            };
          }
        )
          .from("medals")
          .upsert(
            {
              profileId: myId,
              type: "DAILY_DUEL",
              periodKey,
              rank: myRank,
              total,
              percentile,
            },
            { onConflict: "profileId,type,periodKey", ignoreDuplicates: true }
          );
      } catch (medalErr) {
        console.log({ dailyMedalError: medalErr });
      }
    }

    res.send({
      played: true,
      yourSeconds: meRow?.seconds ?? null,
      rank: myRank,
      total,
      percentile,
      beatPct,
      entries: list.slice(0, 100),
    });
  } catch (error) {
    console.log({ dailyRankError: error });
    res.status(500).send();
  }
});

gameRouter.post("/finish-game", async (req, res) => {
  const { gameId } = req.body;
  const firebaseUid = req.decodedFirebaseToken.uid;
  const { data: games } = await supabase
    .from("games")
    .select("*, players:profiles!gamePlayers(*)")
    .eq("id", gameId)
    .returns<Game[]>();

  if (!games?.length) {
    res.status(400).send("Game not found");
    return;
  }
  const [game] = games;
  // Only a participant may finalize a game (closes the IDOR where any caller
  // could finalize any PLAYING game).
  if (!game.players?.some((p) => p.userId === firebaseUid)) {
    res.status(403).send({ message: "not a participant in this game" });
    return;
  }
  if (game.playState !== "PLAYING") {
    res.status(400).send({ message: "cannot end a game that is not playing" });
    return;
  }
  await finalizeGame(gameId);
  res.send(200);
});

gameRouter.post("/forfeit-game", async (req, res) => {
  const { gameId } = req.body;
  const firebaseUid = req.decodedFirebaseToken.uid;
  const { data: games } = await supabase
    .from("games")
    .select("*, players:profiles!gamePlayers(*)")
    .eq("id", gameId)
    .returns<Game[]>();

  if (!games?.length) {
    res.status(400).send("Game not found");
    return;
  }
  const [game] = games;
  // Only a participant may forfeit (finish-game already checks this). Without
  // it, anyone who learned a gameId could end a stranger's live match — the
  // forfeiter lookup returned undefined and it fell through to normal scoring,
  // freezing both players at their partial scores and applying full ratings.
  const forfeiter = game.players?.find((p) => p.userId === firebaseUid);
  if (!forfeiter) {
    res.status(403).send({ message: "not a participant in this game" });
    return;
  }
  if (game.playState !== "PLAYING") {
    res.status(400).send({ message: "cannot end a game that is not playing" });
    return;
  }
  await finalizeGame(gameId, { forfeitProfileId: forfeiter?.id });
  res.send(200);
});
