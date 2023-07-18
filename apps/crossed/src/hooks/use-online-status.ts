import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useMyProfile } from "./use-my-profile";

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
