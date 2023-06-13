import { useEffect } from "react";
import { useAuth } from "./use-auth";
import { getSupabase } from "../lib/supabase";

export const useOnlineStatus = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const supabase = getSupabase();
      const statusChannel = supabase.channel("online-status");
      statusChannel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await statusChannel.track({
            userId: user.uid,
            onlineAt: new Date().toISOString(),
          });
        }
      });

      return () => {
        supabase.removeChannel(statusChannel);
      };
    }
  }, [user]);
};
