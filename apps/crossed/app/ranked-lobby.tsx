import { LoaderScreen } from "react-native-ui-lib";
import { useOnlineStatus } from "../hooks/use-online-status";
import { useRankedGame } from "../hooks/use-ranked-game";
import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function RankedLobby() {
  const router = useRouter();
  useOnlineStatus();
  const { gameId, startRankedGame } = useRankedGame();

  useEffect(() => {
    startRankedGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (gameId) {
      router.replace(`/game?gameId=${gameId}`);
    }
  }, [gameId, router]);

  return <LoaderScreen message="Waiting for opponent" />;
}
