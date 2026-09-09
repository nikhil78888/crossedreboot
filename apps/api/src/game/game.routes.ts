import express, { Router } from "express";
import { supabase } from "../lib/supabase";
import { Game } from "types-and-validators";
import { finalizeGame } from "./game.service";
import { getProfileIdByUid } from "../friends/friends.service";

export const gameRouter: Router = express.Router();

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
    for (const g of (games ?? []) as unknown as {
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
      if (!ch || ch.challengerId != null || !ch.name) continue; // not a daily duel
      const human = (g.players ?? []).find((p) => p.type !== "BOT");
      if (!human || isTest(human.username)) continue;
      const solved = (
        g.gameState as Record<string, { solvedInSeconds?: number }> | null
      )?.[human.id]?.solvedInSeconds;
      if (solved == null || solved <= 0) continue; // didn't finish
      entries.push({
        key: `${g.gameVariant}|${ch.name}|${ch.seconds}`,
        profileId: human.id,
        username: human.username,
        avatar: human.avatar,
        seconds: Math.round(solved),
      });
    }

    // The caller's own best finished time — anchors which puzzle to rank against.
    const mine = entries
      .filter((e) => e.profileId === myId)
      .sort((a, b) => a.seconds - b.seconds)[0];
    if (!mine) {
      res.send({ played: false });
      return;
    }

    // Best time per player on the SAME puzzle, sorted fastest first.
    const bestByPlayer = new Map<string, Entry>();
    for (const e of entries) {
      if (e.key !== mine.key) continue;
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
