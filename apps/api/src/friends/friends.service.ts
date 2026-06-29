import { supabase } from "../lib/supabase";
import { eloColumnFor } from "../rating-fields";

const ONLINE_WINDOW_MS = 2 * 60 * 1000;

const durationForSize = (size: number | null | undefined, base: number) =>
  size && size >= 9 ? 420 : size && size >= 7 ? 300 : base;

export const getProfileIdByUid = async (uid: string) => {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("userId", uid)
    .single();
  return data?.id as string | undefined;
};

type MiniProfile = {
  id: string;
  username: string;
  avatar: string | null;
  eloRating: number;
};

// Tag each profile with my relationship to them, so the UI knows whether to show
// Add / Requested / Accept / Friends.
const annotateRelations = async (myId: string, profs: MiniProfile[]) => {
  if (!profs.length) return [];
  const { data: rels } = await supabase
    .from("friendships")
    .select("*")
    .or(`requesterId.eq.${myId},addresseeId.eq.${myId}`);
  const map = new Map<string, string>();
  for (const r of rels ?? []) {
    const other = r.requesterId === myId ? r.addresseeId : r.requesterId;
    if (r.status === "ACCEPTED") map.set(other, "friends");
    else map.set(other, r.requesterId === myId ? "pending_out" : "pending_in");
  }
  return profs.map((p) => ({ ...p, relation: map.get(p.id) || "none" }));
};

export const listFriends = async (myId: string) => {
  const { data: rows } = await supabase
    .from("friendships")
    .select("*")
    .eq("status", "ACCEPTED")
    .or(`requesterId.eq.${myId},addresseeId.eq.${myId}`);
  const ids = (rows ?? []).map((r) =>
    r.requesterId === myId ? r.addresseeId : r.requesterId
  );
  if (!ids.length) return [];
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, username, avatar, eloRating, lastSeenAt")
    .in("id", ids);
  const now = Date.now();
  return (profs ?? [])
    .map((p) => ({
      id: p.id,
      username: p.username,
      avatar: p.avatar,
      eloRating: p.eloRating,
      online:
        !!p.lastSeenAt &&
        now - new Date(p.lastSeenAt).getTime() < ONLINE_WINDOW_MS,
    }))
    .sort(
      (a, b) =>
        Number(b.online) - Number(a.online) ||
        a.username.localeCompare(b.username)
    );
};

// Friends leaderboard: the caller + their accepted friends, ranked by the
// chosen variant's rating. Shape matches the global leaderboard (eloRating
// aliased) so the client renders it identically.
export const friendsLeaderboard = async (
  myId: string,
  variant: string
) => {
  const ratingCol = eloColumnFor(variant);
  const { data: rows } = await supabase
    .from("friendships")
    .select("requesterId, addresseeId")
    .eq("status", "ACCEPTED")
    .or(`requesterId.eq.${myId},addresseeId.eq.${myId}`);
  const ids = [
    myId,
    ...(rows ?? []).map((r) =>
      r.requesterId === myId ? r.addresseeId : r.requesterId
    ),
  ];
  const { data } = await supabase
    .from("profiles")
    .select(`id, username, country, avatar, eloRating:${ratingCol}`)
    .in("id", ids)
    .order(ratingCol, { ascending: false })
    .limit(100);
  return data ?? [];
};

export const listRequests = async (myId: string) => {
  const { data: rows } = await supabase
    .from("friendships")
    .select("*")
    .eq("addresseeId", myId)
    .eq("status", "PENDING");
  const ids = (rows ?? []).map((r) => r.requesterId);
  if (!ids.length) return [];
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, username, avatar, eloRating")
    .in("id", ids);
  return profs ?? [];
};

export const searchUsers = async (myId: string, q: string) => {
  const term = (q || "").trim();
  if (term.length < 1) return [];
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, username, avatar, eloRating")
    .neq("type", "BOT")
    .neq("id", myId)
    .ilike("username", `%${term}%`)
    .limit(20);
  return annotateRelations(myId, (profs ?? []) as MiniProfile[]);
};

export const recentOpponents = async (myId: string) => {
  const { data: myGames } = await supabase
    .from("gamePlayers")
    .select("gamesId")
    .eq("profilesId", myId)
    .limit(300);
  const gameIds = (myGames ?? []).map((g) => g.gamesId);
  if (!gameIds.length) return [];
  const { data: others } = await supabase
    .from("gamePlayers")
    .select("profilesId")
    .in("gamesId", gameIds)
    .neq("profilesId", myId)
    .limit(500);
  const ids = [...new Set((others ?? []).map((o) => o.profilesId))];
  if (!ids.length) return [];
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, username, avatar, eloRating")
    .in("id", ids)
    .neq("type", "BOT")
    .limit(50);
  return annotateRelations(myId, (profs ?? []) as MiniProfile[]);
};

export const sendRequest = async (myId: string, targetId: string) => {
  if (!targetId || myId === targetId) return;
  const { data: existing } = await supabase
    .from("friendships")
    .select("*")
    .or(
      `and(requesterId.eq.${myId},addresseeId.eq.${targetId}),and(requesterId.eq.${targetId},addresseeId.eq.${myId})`
    );
  const rel = existing?.[0];
  if (rel) {
    if (rel.status === "ACCEPTED") return;
    // they already requested me -> accept it
    if (rel.requesterId === targetId) {
      await supabase
        .from("friendships")
        .update({ status: "ACCEPTED", updatedAt: new Date().toISOString() })
        .eq("id", rel.id);
    }
    return; // my pending request already exists
  }
  await supabase
    .from("friendships")
    .insert({ requesterId: myId, addresseeId: targetId, status: "PENDING" });
};

export const acceptRequest = async (myId: string, requesterId: string) => {
  await supabase
    .from("friendships")
    .update({ status: "ACCEPTED", updatedAt: new Date().toISOString() })
    .eq("requesterId", requesterId)
    .eq("addresseeId", myId)
    .eq("status", "PENDING");
};

export const declineRequest = async (myId: string, requesterId: string) => {
  await supabase
    .from("friendships")
    .delete()
    .eq("requesterId", requesterId)
    .eq("addresseeId", myId)
    .eq("status", "PENDING");
};

export const removeFriend = async (myId: string, friendId: string) => {
  await supabase
    .from("friendships")
    .delete()
    .or(
      `and(requesterId.eq.${myId},addresseeId.eq.${friendId}),and(requesterId.eq.${friendId},addresseeId.eq.${myId})`
    );
};

export const heartbeat = async (myId: string) => {
  await supabase
    .from("profiles")
    .update({ lastSeenAt: new Date().toISOString() })
    .eq("id", myId);
};

// Create a WAITING friendly game inviting a specific friend.
export const inviteToGame = async (myId: string, friendId: string) => {
  const { data: cw } = await supabase.rpc("get_available_crossword", {
    profileid: myId,
  });
  const crossword = cw?.[0];
  if (!crossword) throw new Error("no crossword available");
  const { data: game } = await supabase
    .from("games")
    .insert({
      crosswordsId: crossword.id,
      gameType: "FRIENDLY",
      playState: "WAITING_FOR_OPPONENT",
      gameDurationInSeconds: durationForSize(crossword.size, 180),
      invitedProfileId: friendId,
    })
    .select("*")
    .single();
  if (!game) throw new Error("could not create game");
  await supabase
    .from("gamePlayers")
    .insert({ gamesId: game.id, profilesId: myId });
  return game.id as string;
};

// Friendly games (recent, still waiting) that invited me.
export const listGameInvites = async (myId: string) => {
  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: games } = await supabase
    .from("games")
    .select("id, createdAt, players:profiles!gamePlayers(id, username, avatar)")
    .eq("invitedProfileId", myId)
    .eq("playState", "WAITING_FOR_OPPONENT")
    .gte("createdAt", since)
    .order("createdAt", { ascending: false });
  return (games ?? []).map((g) => ({
    gameId: g.id,
    from: ((g as { players?: unknown[] }).players ?? [])[0] || null,
  }));
};
