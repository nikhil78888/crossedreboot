import { useEffect } from "react";
import { AppState } from "react-native";
import axios from "axios";
import { useMyProfile } from "./use-my-profile";

// Pings the backend so friends can see when you're online. Fires on mount,
// every 45s while the app is foregrounded, and whenever it returns to the
// foreground.
export const useHeartbeat = () => {
  const { myProfile } = useMyProfile();
  useEffect(() => {
    if (!myProfile) return;
    const ping = () => {
      axios.post("/api/friends/heartbeat").catch(() => {});
    };
    ping();
    const interval = setInterval(() => {
      if (AppState.currentState === "active") ping();
    }, 45000);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") ping();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [myProfile]);
};
