import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useLayoutEffect } from "react";
import { Alert, View } from "react-native";
import { useGame } from "../hooks/use-game";
import { CrosswordGrid } from "../components/Crossword";
import { Text } from "react-native";
import { PlayFriendlyButton } from "../components/PlayFriendlyButton";
import { PlaySoloButton } from "../components/PlaySoloButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScrollView, TouchableOpacity } from "react-native-gesture-handler";
import { useMyProfile } from "../hooks/use-my-profile";

export default function ViewAnswers() {
  const { gameId, playerId }: { gameId?: string; playerId?: string } =
    useLocalSearchParams();
  const navigation = useNavigation();
  const router = useRouter();
  const { game, createFriendlyGame, createSoloGame } = useGame({ gameId });
  const { myProfile } = useMyProfile();

  useLayoutEffect(() => {
    if (!playerId) {
      navigation.setOptions({ headerTitle: "Crossword Answers" });
      return;
    }
    const playerProfile = game?.players.find(
      (profile) => profile.id === playerId
    );
    navigation.setOptions({
      headerTitle: `Answers of ${playerProfile?.username}`,
    });
  }, [playerId, navigation, game?.players]);

  if (!game || !myProfile) {
    return null;
  }

  const opponent = game.players.find((p) => p.id !== myProfile.id);

  return (
    <ScrollView className="flex-1 bg-white">
      <CrosswordGrid gameId={gameId as string} showResults={{ playerId }} />
      <View className="flex-1 px-5">
        {game.gameType === "FRIENDLY" && (
          <View className="flex flex-row items-center justify-between space-x-2 mt-6">
            <View>
              {playerId === myProfile.id ? (
                <PrimaryButton
                  onPress={() =>
                    router.replace(
                      `/view-answers?gameId=${gameId}&playerId=${opponent?.id}`
                    )
                  }
                >
                  <View className="px-2 h-full w-full items-center justify-center">
                    <Text
                      className="text-white"
                      style={{ fontFamily: "bitterBold" }}
                    >
                      @{opponent?.username}
                    </Text>
                  </View>
                </PrimaryButton>
              ) : (
                <PrimaryButton
                  onPress={() =>
                    router.replace(
                      `/view-answers?gameId=${gameId}&playerId=${myProfile.id}`
                    )
                  }
                >
                  <View className="px-2 h-full w-full items-center justify-center">
                    <Text
                      className="text-white"
                      style={{ fontFamily: "bitterBold" }}
                    >
                      @{myProfile?.username}
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
                  <Text style={{ fontFamily: "bitterBold" }}>
                    View Crossword Answers
                  </Text>
                </TouchableOpacity>
              ) : (
                <PrimaryButton
                  onPress={() =>
                    router.replace(
                      `/view-answers?gameId=${gameId}&playerId=${opponent?.id}`
                    )
                  }
                >
                  <View className="px-2 h-full w-full items-center justify-center">
                    <Text
                      className="text-white"
                      style={{ fontFamily: "bitterBold" }}
                    >
                      @{opponent?.username}
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
