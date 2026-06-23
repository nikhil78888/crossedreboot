import { useEffect, useState } from "react";
import { useMyProfile } from "./use-my-profile";
import { supabase } from "../lib/supabase";

/*
useTournamentAssignment polls for the bracket the matcher just seated the player
into while they wait in the tournament lobby (mirrors useRankedGame). Polling is
deliberate — the same reliability reasoning as ranked matchmaking. Only recent,
active (FILLING/IN_PROGRESS) tournaments are considered, so we never pick up an
old finished bracket.
*/
export const useTournamentAssignment = () => {
  const { myProfile } = useMyProfile();
  const [tournamentId, setTournamentId] = useState<string>();

  useEffect(() => {
    if (!myProfile) return;
    let active = true;

    const check = async () => {
      const since = new Date(Date.now() - 120_000).toISOString();
      const { data } = await supabase
        .from("tournaments")
        .select("id, createdAt, status, tournamentPlayers!inner(profilesId)")
        .in("status", ["FILLING", "IN_PROGRESS"])
        .gte("createdAt", since)
        .filter("tournamentPlayers.profilesId", "eq", myProfile.id)
        .order("createdAt", { ascending: false })
        .limit(1);
      if (active && data && data.length) {
        setTournamentId(data[0].id);
      }
    };

    check();
    const interval = setInterval(check, 2500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [myProfile]);

  return { tournamentId };
};
