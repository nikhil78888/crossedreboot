import { useSyncExternalStore } from "react";

// Tiny global store for the realtime connection status, so the game screen can
// show a "Reconnecting…" banner. Supabase realtime auto-reconnects; we just
// reflect its state to the user (the game itself keeps the last good board
// state through drops — see use-game.ts).
export type ConnStatus = "connected" | "connecting" | "disconnected";

let current: ConnStatus = "connected";
const listeners = new Set<() => void>();

export const setConnectionStatus = (s: ConnStatus) => {
  if (s !== current) {
    current = s;
    listeners.forEach((l) => l());
  }
};

export const useConnectionStatus = (): ConnStatus =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => current
  );

// Map a Supabase channel status string to our simplified status.
export const mapChannelStatus = (status: string): ConnStatus => {
  if (status === "SUBSCRIBED") return "connected";
  if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED")
    return "disconnected";
  return "connecting";
};
