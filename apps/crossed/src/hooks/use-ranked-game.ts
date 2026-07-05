import { useEffect, useRef, useState } from "react";
import { useMyProfile } from "./use-my-profile";
import { supabase } from "../lib/supabase";

/*
useRankedGame polls for a freshly-created ranked game the player is in while
they wait in the lobby. Polling (rather than a realtime subscription) is used
deliberately: the matchmaking notification path needs to be reliable even when
realtime delivery is flaky, which is what left players stuck in the lobby.
*/

export const useRankedGame = () => {
  const { myProfile } = useMyProfile();
  const [gameId, setGameId] = useState<string>();
  // Ranked games this player was ALREADY in when the lobby opened. A fresh match
  // is one that appears AFTER this snapshot, so we never route the player back
  // into a stale/abandoned ranked game from a previous (e.g. crashed) session
  // that hasn't been swept yet. Robust against client/server clock skew (no time
  // comparison — we diff by game id).
  const preexistingRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!myProfile) return;
    let active = true;

    const queryPlaying = async () => {
      // Recent still-playing ranked games this player is in (a small cap so a
      // brand-new match is always included).
      const since = new Date(Date.now() - 120_000).toISOString();
      const { data } = await supabase
        .from("games")
        .select("id, createdAt, profiles!gamePlayers!inner(id)")
        .eq("gameType", "RANKED")
        .eq("playState", "PLAYING")
        .gte("createdAt", since)
        .filter("profiles.id", "eq", myProfile.id)
        .order("createdAt", { ascending: false })
        .limit(5);
      return data ?? [];
    };

    const check = async () => {
      const rows = await queryPlaying();
      if (!active) return;
      if (preexistingRef.current == null) {
        // Snapshot games that CLEARLY predate this lobby session (older than a
        // 15s grace) as "not ours to route to". The grace means a match created
        // right as we entered — even a very fast one landing before this first
        // poll — is never mistaken for a stale game and is still routed to.
        const cutoff = Date.now() - 15_000;
        preexistingRef.current = new Set(
          rows
            .filter((r) => new Date(r.createdAt as string).getTime() < cutoff)
            .map((r) => r.id as string)
        );
      }
      const fresh = rows.find(
        (r) => !preexistingRef.current!.has(r.id as string)
      );
      if (fresh) setGameId(fresh.id as string);
    };

    check();
    const interval = setInterval(check, 2500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [myProfile]);

  return {
    gameId,
  };
};
