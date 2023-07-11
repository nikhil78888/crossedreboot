import { supabase } from "../lib/supabase";

export const getUsersInLobby = async (): Promise<string[]> => {
  const statusChannel = supabase.channel("online-status");
  return new Promise((resolve) => {
    statusChannel
      .on("presence", { event: "sync" }, () => {
        const state = statusChannel.presenceState();
        const onlineUsers = Object.values(state).map((s) => {
          console.log(s);
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          return s[0].userId;
        });
        resolve(onlineUsers);
        statusChannel.unsubscribe();
      })
      .subscribe();
  });
};
