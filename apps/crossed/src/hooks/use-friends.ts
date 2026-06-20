import useSWR from "swr";
import axios from "axios";

export type Friend = {
  id: string;
  username: string;
  avatar: string | null;
  eloRating: number;
  online: boolean;
};
export type FriendRequest = {
  id: string;
  username: string;
  avatar: string | null;
  eloRating: number;
};
export type UserResult = {
  id: string;
  username: string;
  avatar: string | null;
  eloRating: number;
  relation: "none" | "pending_out" | "pending_in" | "friends";
};
export type GameInvite = {
  gameId: string;
  from: { id: string; username: string; avatar: string | null } | null;
};

export const useFriends = () => {
  const friends = useSWR<Friend[]>(
    "friends",
    async () => (await axios.get("/api/friends")).data,
    { refreshInterval: 30000 }
  );
  const requests = useSWR<FriendRequest[]>(
    "friend-requests",
    async () => (await axios.get("/api/friends/requests")).data,
    { refreshInterval: 30000 }
  );
  const invites = useSWR<GameInvite[]>(
    "game-invites",
    async () => (await axios.get("/api/friends/game-invites")).data,
    { refreshInterval: 15000 }
  );

  const refreshAll = () => {
    friends.mutate();
    requests.mutate();
    invites.mutate();
  };

  const sendRequest = async (targetId: string) => {
    await axios.post("/api/friends/request", { targetId });
    refreshAll();
  };
  const acceptRequest = async (requesterId: string) => {
    await axios.post("/api/friends/accept", { requesterId });
    refreshAll();
  };
  const declineRequest = async (requesterId: string) => {
    await axios.post("/api/friends/decline", { requesterId });
    requests.mutate();
  };
  const removeFriend = async (friendId: string) => {
    await axios.post("/api/friends/remove", { friendId });
    friends.mutate();
  };
  const inviteToGame = async (friendId: string): Promise<string> => {
    const { data } = await axios.post("/api/friends/invite-game", { friendId });
    return data.gameId;
  };
  const searchUsers = async (q: string): Promise<UserResult[]> => {
    if (!q.trim()) return [];
    const { data } = await axios.get(
      `/api/friends/search?q=${encodeURIComponent(q.trim())}`
    );
    return data;
  };
  const getRecentOpponents = async (): Promise<UserResult[]> =>
    (await axios.get("/api/friends/recent-opponents")).data;

  return {
    friends: friends.data,
    requests: requests.data,
    invites: invites.data,
    isLoading: friends.isLoading,
    refreshAll,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    inviteToGame,
    searchUsers,
    getRecentOpponents,
  };
};
