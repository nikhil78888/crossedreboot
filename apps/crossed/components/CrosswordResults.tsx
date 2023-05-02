import { Image } from "expo-image";
import { Alert, ScrollView, Text, View } from "react-native";
import Animated, { BounceIn, ZoomOut } from "react-native-reanimated";
import { images } from "../images";
import { TouchableOpacity } from "react-native-gesture-handler";
import { PlayFriendlyButton } from "./PlayFriendlyButton";
import { PlaySoloButton } from "./PlaySoloButton";
import { useRouter } from "expo-router";
import { calculateScore, useGame } from "../hooks/use-game";
import { useCurrentUser } from "../hooks/use-current-user";
import { classNames } from "../utils";

export const CrosswordResults = ({ gameId }: { gameId: string }) => {
  const { game } = useGame({ gameId });

  if (!game) {
    return null;
  }

  if (game.game_type === "SOLO") {
    return <SoloGameResult gameId={gameId} />;
  }

  return <FriendlyGameResult gameId={gameId} />;
};

const FriendlyGameResult = ({ gameId }: { gameId: string }) => {
  const router = useRouter();
  const { user } = useCurrentUser();
  const { createFriendlyGame, createSoloGame, game } = useGame({ gameId });
  if (!user || !game) {
    return null;
  }
  const mySolution = game.game_state?.[user.uid].solution;
  const correctSolution = game.crossword.solution;
  const myPoints = calculateScore({
    solution: mySolution,
    correctSolution,
  });
  const opponentUid = game.players.find((p) => p !== user.uid) as string;
  const opponentSolution = game.game_state?.[opponentUid].solution;
  const opponentPoints = calculateScore({
    solution: opponentSolution,
    correctSolution,
  });

  const result =
    myPoints === 100
      ? "PERFECT_SCORE"
      : myPoints > opponentPoints
      ? "WON"
      : "LOST";

  return (
    <Animated.View
      entering={BounceIn}
      exiting={ZoomOut}
      className="absolute h-full w-full bg-white"
    >
      <View className="h-12 w-full items-center justify-center border-b border-gray-100">
        <Text className="text-3xl" style={{ fontFamily: "Bitter_700Bold" }}>
          Results
        </Text>
      </View>
      <ScrollView className="flex-1 px-5 py-4">
        <View className="bg-crossed-green-50 border border-crossed-green-100 shadow-sm rounded-sm">
          <Image
            source={images.card_ellipsis}
            className="absolute right-0 bottom-0 w-1/2 aspect-square"
          />
          <View className="pt-4 pb-5 px-4">
            <Text
              className={classNames(
                "text-center text-3xl",
                result === "PERFECT_SCORE" ? "text-crossed-green-700" : "",
                result === "WON" ? "text-crossed-yellow-400" : "",
                result === "LOST" ? "text-crossed-red-400" : ""
              )}
              style={{ fontFamily: "Bitter_700Bold" }}
            >
              {result === "PERFECT_SCORE" || result === "WON"
                ? "You are the Winner!"
                : "Better Luck Next Time"}
            </Text>
            <View className="items-center py-4">
              {result === "PERFECT_SCORE" || result === "WON" ? (
                <Image source={images.winner} className="h-24 w-24" />
              ) : (
                <Image source={images.lost} className="h-[100] w-20" />
              )}
            </View>
            <Text
              className={classNames(
                "text-center text-3xl",
                result === "PERFECT_SCORE" ? "text-crossed-green-700" : "",
                result === "WON" ? "text-crossed-yellow-400" : "",
                result === "LOST" ? "text-crossed-red-400" : ""
              )}
              style={{ fontFamily: "Bitter_700Bold" }}
            >
              You got {myPoints} Points
            </Text>
          </View>
        </View>
        <Text
          className="mt-5 text-3xl text-center"
          style={{ fontFamily: "Bitter_700Bold" }}
        >
          Checkout the Answers
        </Text>
        <View className="mt-4">
          <TouchableOpacity
            className="w-full h-10 items-center justify-center bg-neutral-100 border-2 border-crossed-blue-400"
            onPress={() => {}}
          >
            <Text style={{ fontFamily: "Bitter_700Bold" }}>
              View Crossword Answers
            </Text>
          </TouchableOpacity>
        </View>
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
      </ScrollView>
    </Animated.View>
  );
};

const SoloGameResult = ({ gameId }: { gameId: string }) => {
  const router = useRouter();
  const { user } = useCurrentUser();
  const { createFriendlyGame, createSoloGame, game } = useGame({ gameId });
  if (!user || !game) {
    return null;
  }
  const solution = game.game_state?.[user?.uid].solution;
  const correctSolution = game.crossword.solution;
  const points = calculateScore({ solution, correctSolution });
  return (
    <Animated.View
      entering={BounceIn}
      exiting={ZoomOut}
      className="absolute h-full w-full bg-white"
    >
      <View className="h-12 w-full items-center justify-center border-b border-gray-100">
        <Text className="text-3xl" style={{ fontFamily: "Bitter_700Bold" }}>
          Results
        </Text>
      </View>
      <ScrollView className="flex-1 px-5 py-4">
        <View className="bg-crossed-green-50 border border-crossed-green-100 shadow-sm rounded-sm">
          <Image
            source={images.card_ellipsis}
            className="absolute right-0 bottom-0 w-1/2 aspect-square"
          />
          <View className="pt-4 pb-5 px-4">
            <Text
              className="text-center text-crossed-green-700 text-3xl"
              style={{ fontFamily: "Bitter_700Bold" }}
            >
              You are the Winner!
            </Text>
            <View className="items-center py-4">
              <Image source={images.winner} className="h-24 w-24" />
            </View>
            <Text
              className="text-center text-crossed-green-700 text-3xl"
              style={{ fontFamily: "Bitter_700Bold" }}
            >
              You got {points} Points
            </Text>
          </View>
        </View>
        <Text
          className="mt-5 text-3xl text-center"
          style={{ fontFamily: "Bitter_700Bold" }}
        >
          Checkout the Answers
        </Text>
        <View className="mt-4">
          <TouchableOpacity
            className="w-full h-10 items-center justify-center bg-neutral-100 border-2 border-crossed-blue-400"
            onPress={() => {}}
          >
            <Text style={{ fontFamily: "Bitter_700Bold" }}>
              View Crossword Answers
            </Text>
          </TouchableOpacity>
        </View>
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
      </ScrollView>
    </Animated.View>
  );
};
