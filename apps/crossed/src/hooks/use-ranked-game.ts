import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!myProfile) return;
    let active = true;

    const check = async () => {
      // Only look at recent, still-playing ranked games so we never pick up an
      // old finished match.
      const since = new Date(Date.now() - 120_000).toISOString();
      const { data } = await supabase
        .from("games")
        .select("id, createdAt, profiles!gamePlayers!inner(id)")
        .eq("gameType", "RANKED")
        .eq("playState", "PLAYING")
        .gte("createdAt", since)
        .filter("profiles.id", "eq", myProfile.id)
        .order("createdAt", { ascending: false })
        .limit(1);
      if (active && data && data.length) {
        setGameId(data[0].id);
      }
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
