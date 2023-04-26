import useSWR from "swr";
import { gamesCollection } from "../firebase-collection";
import { useCurrentUser } from "./use-current-user";

export const useCurrentGame = () => {
  const { user } = useCurrentUser();
  const {
    data: currentGameId,
    isLoading: loadingCurrentGameId,
    error: loadCurrentGameError,
  } = useSWR(user ? "current-game" : null, async () => {
    const documents = await gamesCollection
      .where("players", "array-contains", user?.uid)
      .get();
    const currentGameDoc = documents.docs.find(
      (d) => d.data().play_state === "PLAYING"
    );
    return currentGameDoc?.id;
  });

  if (loadCurrentGameError) {
    console.error({ loadCurrentGameError });
  }

  return {
    currentGameId,
    loadingCurrentGameId,
  };
};
