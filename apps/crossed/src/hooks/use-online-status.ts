import { useCallback } from "react";
import { channel } from "../lib/lobby-channel";
import { useMyProfile } from "./use-my-profile";

/*
useOnlineStatus hook is used to track the status
of a user waiting in the lobby.

It subscribes to a supabase channel "online-status"
and tracks the userId of current user in the channel.

In the backend, this channel is used to find all online
users and create ranked matches.
*/

export const useOnlineStatus = () => {
  const { myProfile } = useMyProfile();

  const leaveLobby = useCallback(async () => {
    try {
      channel.untrack();
    } catch (error) {
      console.info(`Error leaving lobby ${error}`);
    }
  }, []);

  const joinLobby = () => {
    return new Promise<void>((resolve) => {
      if (myProfile) {
        channel.track({
          userId: myProfile.id,
          rating: myProfile.eloRating,
          onlineAt: new Date().toISOString(),
        });
        resolve();
      }
    });
  };

  return {
    leaveLobby,
    joinLobby,
  };
};
