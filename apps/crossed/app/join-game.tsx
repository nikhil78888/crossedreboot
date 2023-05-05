import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useGame } from "../hooks/use-game";
import { useCurrentUser } from "../hooks/use-current-user";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import firestore from "@react-native-firebase/firestore";
import { useEffect } from "react";
import { PrimaryButton } from "../components/PrimaryButton";
import { gamesCollection } from "../firebase-collection";
import { Image } from "expo-image";
import { images } from "../images";

export default function JoinGame() {
  const { gameId } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();
  const { user, profile } = useCurrentUser();
  const { game, opponentUsername } = useGame({
    gameId: gameId as string | undefined,
  });

  const gamePlayState = game?.play_state;

  useEffect(() => {
    if (navigation.isFocused()) {
      switch (gamePlayState) {
        case "COMPLETED":
          Alert.alert("The game has ended");
          router.replace("/");
          break;
        case "PLAYING":
          // navigation.navigate("game", { gameId });
          router.replace(`/game?gameId=${gameId}`);
          break;
        default:
          break;
      }
    }
  }, [gameId, gamePlayState, router, navigation]);

  if (!game || !user) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  const startMatch = () => {
    gamesCollection.doc(gameId as string).update({
      play_state: "PLAYING",
      players: [...game.players, user.uid],
      startedAt: firestore.FieldValue.serverTimestamp(),
      player_handles: {
        ...game.player_handles,
        [user.uid]: profile?.username,
      },
    });
  };

  return (
    <Image
      source={images.splash_bg}
      className="flex-1 px-4 items-center justify-center"
    >
      <Text className="text-2xl" style={{ fontFamily: "Bitter_700Bold" }}>
        Friendly Match
      </Text>
      <Text className="mt-2 mb-8" style={{ fontFamily: "Lato_400Regular" }}>
        Play a friendly match with @{opponentUsername}
      </Text>
      <PrimaryButton onPress={startMatch}>
        <View className="flex-1 items-center justify-center px-2">
          <Text
            className="text-white text-lg"
            style={{ fontFamily: "Bitter_700Bold" }}
          >
            Start Match
          </Text>
        </View>
      </PrimaryButton>
    </Image>
  );
}
