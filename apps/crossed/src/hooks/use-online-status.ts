import { useEffect } from "react";
import { supabase } from "../lib/supabase";
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

  useEffect(() => {
    if (myProfile) {
      const statusChannel = supabase.channel("online-status");
      statusChannel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await statusChannel.track({
            userId: myProfile.id,
            onlineAt: new Date().toISOString(),
          });
        }
      });

      return () => {
        supabase.removeChannel(statusChannel);
      };
    }
  }, [myProfile]);
};
