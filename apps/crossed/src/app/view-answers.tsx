import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useLayoutEffect } from "react";
import { View } from "react-native";
import { useGame } from "../hooks/use-game";
import { CrosswordGrid } from "../components/Crossword";
import { Text } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useMyProfile } from "../hooks/use-my-profile";
import { NewGameButtons } from "../components/NewGameButtons";
import { Button } from "../components/Button";
import { PlayerAnswerButton } from "../components/CrosswordResults";
import { classNames } from "../lib/utils";

export default function ViewAnswers() {
  const { gameId, playerId }: { gameId?: string; playerId?: string } =
    useLocalSearchParams();
  const navigation = useNavigation();
  const router = useRouter();
  const { game } = useGame({ gameId });
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

  if (!gameId || !game || !myProfile) {
    return null;
  }

  const opponent = game.players.find((p) => p.id !== myProfile.id);

  return (
    <ScrollView
      className="flex-1 bg-white"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 60 }}
    >
      <CrosswordGrid gameId={gameId as string} showResults={{ playerId }} />
      <View className="flex-1 px-5">
        {game.gameType !== "SOLO" && (
          <View className="flex-1">
            <View className={classNames("mt-5 flex-row space-x-4")}>
              {playerId !== myProfile.id && (
                <View className="flex-1">
                  <PlayerAnswerButton
                    player={myProfile}
                    game={game}
                    onPress={() => router.setParams({ playerId: myProfile.id })}
                  />
                </View>
              )}
              {playerId !== opponent?.id && (
                <View className="flex-1">
                  {opponent && (
                    <PlayerAnswerButton
                      player={opponent}
                      game={game}
                      onPress={() =>
                        router.setParams({ playerId: opponent.id })
                      }
                    />
                  )}
                </View>
              )}
            </View>
            {playerId && (
              <View className="mt-5">
                <Button
                  intent={"primary"}
                  size={"xl"}
                  label="View Crossword Answers"
                  rounded={"full"}
                  onPress={() => router.setParams({ gameId, playerId: "" })}
                />
              </View>
            )}
          </View>
        )}
        <View className="mt-5 flex-row">
          <View>
            <View className="absolute bottom-0 inset-x-0 h-3.5 bg-crossed-yellow-200" />
            <Text className="font-[jost600] text-xl text-cr-gray-800">
              Start a New Match!
            </Text>
          </View>
        </View>
        <View className="mt-2">
          <NewGameButtons />
        </View>
        <View className="mt-6">
          <Button
            intent="primary"
            mode={"outline"}
            size={"lg"}
            rounded={"full"}
            label="Go Home"
            onPress={() => router.push("/home")}
          />
        </View>
      </View>
    </ScrollView>
  );
}
