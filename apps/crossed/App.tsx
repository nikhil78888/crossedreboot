import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { Lato_300Light } from "@expo-google-fonts/lato";
import { Bitter_700Bold } from "@expo-google-fonts/bitter";
import * as Linking from "expo-linking";
import { useCurrentUser } from "./src/hooks/use-current-user";
import { Crossed } from "./src/Crossed";
import { useCurrentGame } from "./src/hooks/use-current-game";
import { useEffect } from "react";
import { gamesCollection } from "./src/firebase-collection";

export default function App() {
  const [fontsLoaded] = useFonts({ Lato_300Light, Bitter_700Bold });
  const { loadingCurrentUser, currentUser } = useCurrentUser();
  const { currentGame } = useCurrentGame();
  const url = Linking.useURL();
  const gameId = url ? Linking.parse(url).queryParams?.gameId : null;

  useEffect(() => {
    const joinGame = async () => {
      const game = await gamesCollection.doc(gameId as string).get();
      const existingPlayers = game.data()?.players;
      if (existingPlayers.length < 2) {
        gamesCollection.doc(gameId as string).update({
          players: [...existingPlayers, currentUser?.uid],
        });
      }
    };
    if (gameId && currentUser) {
      joinGame();
    }
  }, [currentUser, gameId]);

  if (!fontsLoaded || loadingCurrentUser) {
    return null;
  }

  if (gameId && !currentGame) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <Crossed />
    </SafeAreaProvider>
  );
}
