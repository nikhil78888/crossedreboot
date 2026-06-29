import useSWRSubscription, { SWRSubscriptionOptions } from "swr/subscription";
import useSWRMutation from "swr/mutation";
import useSWR from "swr";
import axios from "axios";
import { supabase } from "../lib/supabase";
import { useMyProfile } from "./use-my-profile";
import { Database } from "types-and-validators";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Tournament = Database["public"]["Tables"]["tournaments"]["Row"];
type TournamentPlayerRow =
  Database["public"]["Tables"]["tournamentPlayers"]["Row"];
export type TournamentMatch =
  Database["public"]["Tables"]["tournamentMatches"]["Row"];
export type TournamentPlayer = TournamentPlayerRow & {
  profile?: Profile;
};

export type TournamentState = {
  tournament: Tournament;
  players: TournamentPlayer[];
  matches: TournamentMatch[];
};

/*
useTournament subscribes to a single tournament (its row, its seated players,
and its bracket matches) and keeps them live via supabase realtime. It also
derives the current playable game for the signed-in player.
*/
export const useTournament = ({ tournamentId }: { tournamentId?: string }) => {
  const { myProfile } = useMyProfile();

  const { data } = useSWRSubscription(
    tournamentId ? ["tournament", tournamentId] : null,
    (key, { next }: SWRSubscriptionOptions<TournamentState, Error>) => {
      const fetchAll = async () => {
        const { data: tournament } = await supabase
          .from("tournaments")
          .select("*")
          .eq("id", tournamentId)
          .single();
        if (!tournament) return;
        const { data: tps } = await supabase
          .from("tournamentPlayers")
          .select("*")
          .eq("tournamentsId", tournamentId);
        const ids = (tps ?? []).map((p) => p.profilesId);
        const { data: profs } = ids.length
          ? await supabase.from("profiles").select("*").in("id", ids)
          : { data: [] as Profile[] };
        const profMap = new Map((profs ?? []).map((p) => [p.id, p]));
        const players: TournamentPlayer[] = (tps ?? []).map((p) => ({
          ...p,
          profile: profMap.get(p.profilesId),
        }));
        const { data: matches } = await supabase
          .from("tournamentMatches")
          .select("*")
          .eq("tournamentsId", tournamentId);
        next(null, { tournament, players, matches: matches ?? [] });
      };

      const channel = supabase
        .channel(`tournament-${tournamentId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tournaments",
            filter: `id=eq.${tournamentId}`,
          },
          fetchAll
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tournamentPlayers",
            filter: `tournamentsId=eq.${tournamentId}`,
          },
          fetchAll
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tournamentMatches",
            filter: `tournamentsId=eq.${tournamentId}`,
          },
          fetchAll
        )
        .subscribe(fetchAll);

      return () => {
        channel.unsubscribe();
      };
    }
  );

  const tournament = data?.tournament;
  const players = data?.players ?? [];
  const matches = data?.matches ?? [];

  const myId = myProfile?.id;
  const mySeat = players.find((p) => p.profilesId === myId);
  const iAmIn = !!mySeat;
  const iAmEliminated = !!mySeat?.eliminated;

  // The match I should be playing right now (live, with a game created).
  const myActiveMatch = matches.find(
    (m) =>
      m.status === "PLAYING" &&
      m.gamesId &&
      (m.playerOneId === myId || m.playerTwoId === myId)
  );
  const myActiveGameId = myActiveMatch?.gamesId ?? undefined;

  const humanCount = players.filter((p) => !p.isBot).length;
  const isChampion = !!tournament?.winnerId && tournament.winnerId === myId;

  const { trigger: joinTournament, isMutating: joiningTournament } =
    useSWRMutation(
      "join-tournament",
      async (
        _key,
        {
          arg,
        }: {
          arg?: {
            variant?: string;
            difficulty?: "REGULAR" | "HARD";
          };
        } = {}
      ) => {
        const { data: res } = await axios.post("/api/tournaments/join", {
          gameVariant: arg?.variant ?? "CROSSWORD",
          difficulty: arg?.difficulty ?? "REGULAR",
        });
        return res?.tournamentId as string | undefined;
      }
    );

  // Whether the signed-in player created this (private) tournament.
  const iAmCreator =
    !!tournament?.createdByProfileId && tournament.createdByProfileId === myId;
  const isPrivate = !!tournament?.isPrivate;

  const createPrivateTournament = async (
    variant: string = "CROSSWORD",
    difficulty: "REGULAR" | "HARD" = "REGULAR"
  ): Promise<string | undefined> => {
    const { data } = await axios.post("/api/tournaments/create-private", {
      gameVariant: variant,
      difficulty,
    });
    return data?.tournamentId as string | undefined;
  };
  const inviteFriends = async (tid: string, friendIds: string[]) => {
    await axios.post(`/api/tournaments/${tid}/invite`, { friendIds });
  };
  const acceptInvite = async (tid: string): Promise<string | undefined> => {
    const { data } = await axios.post(`/api/tournaments/${tid}/accept`);
    return data?.tournamentId as string | undefined;
  };
  const startNow = async (tid: string) => {
    await axios.post(`/api/tournaments/${tid}/start`);
  };

  return {
    tournament,
    players,
    matches,
    iAmIn,
    iAmEliminated,
    iAmCreator,
    isPrivate,
    myActiveGameId,
    humanCount,
    isChampion,
    joinTournament,
    joiningTournament,
    createPrivateTournament,
    inviteFriends,
    acceptInvite,
    startNow,
  };
};

export type TournamentInvite = {
  tournamentId: string;
  gameVariant: string;
  fromUsername: string;
};

// Pending tournament invites for the signed-in player (home banner).
export const useTournamentInvites = () => {
  const { data, mutate } = useSWR<TournamentInvite[]>(
    "tournament-invites",
    async () => (await axios.get("/api/tournaments/invites")).data,
    { refreshInterval: 20000 }
  );
  return {
    tournamentInvites: data ?? [],
    refreshTournamentInvites: mutate,
  };
};
