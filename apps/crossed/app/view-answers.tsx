import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useLayoutEffect } from "react";
import { Alert, View } from "react-native";
import { useGame } from "../hooks/use-game";
import { useCurrentUser } from "../hooks/use-current-user";
import { Crossword } from "../components/Crossword";
import { Text } from "react-native";
import { PlayFriendlyButton } from "../components/PlayFriendlyButton";
import { PlaySoloButton } from "../components/PlaySoloButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScrollView, TouchableOpacity } from "react-native-gesture-handler";

export default function ViewAnswers() {
  const { gameId, playerId }: { gameId?: string; playerId?: string } =
    useLocalSearchParams();
  const navigation = useNavigation();
  const router = useRouter();
  const { game, opponentUsername, createFriendlyGame, createSoloGame } =
    useGame({ gameId });
  const { user, profile } = useCurrentUser();

  useLayoutEffect(() => {
    if (!playerId) {
      navigation.setOptions({ headerTitle: "Crossword Answers" });
      return;
    }
    if (playerId === user?.uid) {
      navigation.setOptions({ headerTitle: `Answers of ${profile?.username}` });
      return;
    }
    navigation.setOptions({ headerTitle: `Answers of ${opponentUsername}` });
  }, [playerId, navigation, user?.uid, opponentUsername, profile?.username]);

  if (!game || !user) {
    return null;
  }

  const opponentUid = game.players.find((p) => p !== user.uid);

  return (
    <ScrollView className="flex-1 bg-white">
      <Crossword gameId={gameId as string} showResults={{ playerId }} />
      <View className="flex-1 px-5">
        {game.game_type === "FRIENDLY" && (
          <View className="flex flex-row items-center justify-between space-x-2 mt-6">
            <View>
              {playerId === user.uid ? (
                <PrimaryButton
                  onPress={() =>
                    router.replace(
                      `/view-answers?gameId=${gameId}&playerId=${opponentUid}`
                    )
                  }
                >
                  <View className="px-2 h-full w-full items-center justify-center">
                    <Text
                      className="text-white"
                      style={{ fontFamily: "Bitter_700Bold" }}
                    >
                      @{opponentUsername}
                    </Text>
                  </View>
                </PrimaryButton>
              ) : (
                <PrimaryButton
                  onPress={() =>
                    router.replace(
                      `/view-answers?gameId=${gameId}&playerId=${user.uid}`
                    )
                  }
                >
                  <View className="px-2 h-full w-full items-center justify-center">
                    <Text
                      className="text-white"
                      style={{ fontFamily: "Bitter_700Bold" }}
                    >
                      @{profile?.username}
                    </Text>
                  </View>
                </PrimaryButton>
              )}
            </View>
            <View className="flex-1">
              {playerId ? (
                <TouchableOpacity
                  className="w-full h-10 items-center justify-center bg-neutral-100 border-2 border-crossed-blue-400"
                  onPress={() => {
                    router.replace(`/view-answers?gameId=${gameId}`);
                  }}
                >
                  <Text style={{ fontFamily: "Bitter_700Bold" }}>
                    View Crossword Answers
                  </Text>
                </TouchableOpacity>
              ) : (
                <PrimaryButton
                  onPress={() =>
                    router.replace(
                      `/view-answers?gameId=${gameId}&playerId=${opponentUid}`
                    )
                  }
                >
                  <View className="px-2 h-full w-full items-center justify-center">
                    <Text
                      className="text-white"
                      style={{ fontFamily: "Bitter_700Bold" }}
                    >
                      @{opponentUsername}
                    </Text>
                  </View>
                </PrimaryButton>
              )}
            </View>
          </View>
        )}
        <Text className="mt-6 font-bold text-xl">Start a New Match</Text>
        <View className="mt-2.5 flex-row justify-between space-x-2">
          <View>
            <PlayFriendlyButton
              onPress={async () => {
                try {
                  const newGameId = await createFriendlyGame();
                  router.replace(`/invite-friend?gameId=${newGameId}`);
                } catch (createFriendlyGameError) {
                  console.error(createFriendlyGameError);
                  Alert.alert(
                    "Error",
                    "Could not start game. Please try again"
                  );
                }
              }}
            />
          </View>
          <View>
            <PlaySoloButton
              onPress={async () => {
                try {
                  const newGameId = await createSoloGame();
                  router.replace(`/game?gameId=${newGameId}`);
                } catch (createSoloGameError) {
                  Alert.alert(
                    "Error",
                    "Could not start game. Please try again"
                  );
                }
              }}
            />
          </View>
          <View className="h-32 flex-1 bg-transparent"></View>
        </View>
      </View>
    </ScrollView>
  );
}
