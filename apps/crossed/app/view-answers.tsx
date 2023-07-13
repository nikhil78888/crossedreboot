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
      contentContainerStyle={{ paddingBottom: 60 }}
    >
      <CrosswordGrid gameId={gameId as string} showResults={{ playerId }} />
      <View className="flex-1 px-5">
        {(game.gameType === "FRIENDLY" || game.gameType === "RANKED") &&
          opponent && (
            <View className="mt-6 flex flex-row items-center justify-between space-x-2">
              <View>
                {playerId === myProfile.id ? (
                  <Button
                    intent="primary"
                    size="medium"
                    onPress={() => router.setParams({ playerId: opponent.id })}
                    label={`@${opponent.username}`}
                  />
                ) : (
                  <Button
                    intent="primary"
                    size="medium"
                    onPress={() => router.setParams({ playerId: myProfile.id })}
                    label={`@${myProfile.username}`}
                  />
                )}
              </View>
              <View className="flex-1">
                {playerId ? (
                  <Button
                    intent="secondary"
                    size="medium"
                    onPress={() => router.setParams({ gameId, playerId: "" })}
                    label={"View Crossword Answers"}
                  />
                ) : (
                  <Button
                    intent="primary"
                    size="medium"
                    onPress={() => router.setParams({ playerId: opponent.id })}
                    label={`@${opponent.username}`}
                  />
                )}
              </View>
            </View>
          )}
        <Text className="mt-6 text-xl font-bold">Start a New Match</Text>
        <View className="mt-2.5">
          <NewGameButtons />
        </View>
        <View className="mt-6">
          <Button
            intent="secondary"
            size={"medium"}
            label="Go Home"
            onPress={() => router.push("/home")}
          />
        </View>
      </View>
    </ScrollView>
  );
}
