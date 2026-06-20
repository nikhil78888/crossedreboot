import { View, Text, ActivityIndicator } from "react-native";
import { useConnectionStatus } from "../lib/connection-status";

// Shows a slim banner when the realtime connection drops, so players understand
// what's happening on bad reception. The board keeps working (last good state
// is preserved) and Supabase auto-reconnects.
export const ConnectionBanner = () => {
  const status = useConnectionStatus();
  if (status === "connected") return null;

  const disconnected = status === "disconnected";
  return (
    <View
      className={`flex-row items-center justify-center py-2 px-3 ${
        disconnected ? "bg-crossed-red-400" : "bg-crossed-yellow-300"
      }`}
    >
      <ActivityIndicator size="small" color={disconnected ? "#ffffff" : "#000000"} />
      <Text
        className={`ml-2 font-[jost600] text-sm ${
          disconnected ? "text-white" : "text-cr-gray-800"
        }`}
      >
        {disconnected ? "Connection lost — reconnecting…" : "Connecting…"}
      </Text>
    </View>
  );
};
