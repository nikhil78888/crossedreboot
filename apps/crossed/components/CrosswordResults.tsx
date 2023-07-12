import { Image } from "expo-image";
import { Alert, ScrollView, Text, View } from "react-native";
import Animated, { BounceIn, ZoomOut } from "react-native-reanimated";
import { images } from "../lib/images";
import { TouchableOpacity } from "react-native-gesture-handler";
import { PlayFriendlyButton } from "./PlayFriendlyButton";
import { PlaySoloButton } from "./PlaySoloButton";
import { useRouter } from "expo-router";
import { calculateScore, useGame } from "../hooks/use-game";
import { classNames } from "../lib/utils";
import { PrimaryButton } from "./PrimaryButton";
import { ShareAppButton } from "./ShareAppButton";
import { useMyProfile } from "../hooks/use-my-profile";

export const FriendlyGameResult = ({ gameId }: { gameId: string }) => {
  const router = useRouter();
  const { myProfile } = useMyProfile();
  const { createFriendlyGame, createSoloGame, game, opponentUsername } =
    useGame({ gameId });
  if (!myProfile || !game) {
    return null;
  }
  const mySolution = game.gameState?.[myProfile.id].solution;
  const correctSolution = game.crossword.solution;
  const myPoints = calculateScore({
    solution: mySolution,
    correctSolution,
  });
  const opponent = game.players.find((p) => p.id !== myProfile.id);
  const opponentUid = opponent?.id as string;
  const opponentSolution = game.gameState?.[opponentUid].solution;
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
      <ScrollView className="flex-1 px-5 py-4">
        <View className="rounded-sm border border-crossed-green-100 bg-crossed-green-50 shadow-sm">
          <Image
            source={images.card_ellipsis}
            className="absolute bottom-0 right-0 aspect-square w-1/2"
          />
          <View className="px-4 pb-5 pt-4">
            <Text
              className={classNames(
                "text-center text-3xl",
                result === "PERFECT_SCORE" ? "text-crossed-green-700" : "",
                result === "WON" ? "text-crossed-yellow-400" : "",
                result === "LOST" ? "text-crossed-red-400" : ""
              )}
              style={{ fontFamily: "bitterBold" }}
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
              style={{ fontFamily: "bitterBold" }}
            >
              You got {myPoints} Points
            </Text>
          </View>
        </View>
        <Text
          className="mt-5 text-center text-3xl"
          style={{ fontFamily: "bitterBold" }}
        >
          Checkout the Answers
        </Text>
        <View className="mt-4 flex-row items-center justify-between space-x-2">
          <View className="flex-1">
            <PrimaryButton
              onPress={() =>
                router.replace(
                  `/view-answers?gameId=${gameId}&playerId=${myProfile.id}`
                )
              }
            >
              <View className="h-full w-full items-center justify-center px-2">
                <Text
                  className="text-white"
                  style={{ fontFamily: "bitterBold" }}
                >
                  @{myProfile?.username}
                </Text>
              </View>
            </PrimaryButton>
          </View>
          <View className="flex-1">
            <PrimaryButton
              onPress={() =>
                router.replace(
                  `/view-answers?gameId=${gameId}&playerId=${opponentUid}`
                )
              }
            >
              <View className="h-full w-full items-center justify-center px-2">
                <Text
                  className="text-white"
                  style={{ fontFamily: "bitterBold" }}
                >
                  @{opponentUsername}
                </Text>
              </View>
            </PrimaryButton>
          </View>
        </View>
        <View className="mt-4">
          <TouchableOpacity
            className="h-10 w-full items-center justify-center border-2 border-crossed-blue-400 bg-neutral-100"
            onPress={() => {
              router.replace(`/view-answers?gameId=${gameId}`);
            }}
          >
            <Text style={{ fontFamily: "bitterBold" }}>
              View Crossword Answers
            </Text>
          </TouchableOpacity>
        </View>
        <View className="mt-4">
          <TouchableOpacity
            className="h-10 w-full items-center justify-center border-2 border-crossed-blue-400 bg-neutral-100"
            onPress={() => {
              router.push(`/feedback`);
            }}
          >
            <Text style={{ fontFamily: "bitterBold" }}>Leave us feedback</Text>
          </TouchableOpacity>
        </View>
        <Text
          className="mt-6 text-xl font-bold"
          style={{ fontFamily: "bitterBold" }}
        >
          Start a New Match
        </Text>
        <View className="mt-2.5 flex-row justify-between space-x-2">
          <View className="flex-1">
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
          <View className="flex-1">
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
        <View className="mt-8 flex-row items-center space-x-2">
          <View className="flex-1">
            <TouchableOpacity
              className="h-10 w-full items-center justify-center border-2 border-crossed-blue-400 bg-neutral-100"
              onPress={() => {
                router.push("/home");
              }}
            >
              <Text style={{ fontFamily: "bitterBold" }}>Go Home</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View className="mt-4">
          <ShareAppButton />
        </View>
      </ScrollView>
    </Animated.View>
  );
};

export const SoloGameResult = ({ gameId }: { gameId: string }) => {
  const router = useRouter();
  const { myProfile } = useMyProfile();
  const { createFriendlyGame, createSoloGame, game } = useGame({ gameId });
  if (!myProfile || !game) {
    return null;
  }
  const solution = game.gameState?.[myProfile.id].solution;
  const correctSolution = game.crossword.solution;
  const points = calculateScore({ solution, correctSolution });
  const result = points === 100 ? "PERFECT_SCORE" : points > 0 ? "WON" : "LOST";
  return (
    <Animated.View
      entering={BounceIn}
      exiting={ZoomOut}
      className="h-full w-full bg-white"
    >
      <ScrollView className="flex-1 px-5 py-4">
        <View className="rounded-sm border border-crossed-green-100 bg-crossed-green-50 shadow-sm">
          <Image
            source={images.card_ellipsis}
            className="absolute bottom-0 right-0 aspect-square w-1/2"
          />
          <View className="px-4 pb-5 pt-4">
            <Text
              className={classNames(
                "text-center text-3xl",
                result === "PERFECT_SCORE" ? "text-crossed-green-700" : "",
                result === "WON" ? "text-crossed-yellow-400" : "",
                result === "LOST" ? "text-crossed-red-400" : ""
              )}
              style={{ fontFamily: "bitterBold" }}
            >
              {result === "PERFECT_SCORE"
                ? "You aced it!"
                : "Better Luck Next Time"}
            </Text>
            <View className="items-center py-4">
              {result === "PERFECT_SCORE" || result === "WON" ? (
                <Image
                  source={images.winner}
                  className="h-24 w-24"
                  style={result === "WON" ? { tintColor: "#E7B402" } : {}}
                />
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
              style={{ fontFamily: "bitterBold" }}
            >
              You got {points} Points
            </Text>
          </View>
        </View>
        <Text
          className="mt-5 text-center text-3xl"
          style={{ fontFamily: "bitterBold" }}
        >
          Checkout the Answers
        </Text>
        <View className="mt-4">
          <TouchableOpacity
            className="h-10 w-full items-center justify-center border-2 border-crossed-blue-400 bg-neutral-100"
            onPress={() => {
              router.replace(`/view-answers?gameId=${gameId}`);
            }}
          >
            <Text style={{ fontFamily: "bitterBold" }}>
              View Crossword Answers
            </Text>
          </TouchableOpacity>
        </View>
        <View className="mt-4">
          <PrimaryButton
            onPress={() => {
              router.push(`/feedback`);
            }}
          >
            <View className="h-full w-full items-center justify-center">
              <Text className="text-white" style={{ fontFamily: "bitterBold" }}>
                Leave us feedback
              </Text>
            </View>
          </PrimaryButton>
        </View>
        <Text
          className="mt-6 text-xl font-bold"
          style={{ fontFamily: "bitterBold" }}
        >
          Start a New Match
        </Text>
        <View className="mt-2.5 flex-row justify-between space-x-2">
          <View className="flex-1">
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
          <View className="flex-1">
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
        <View className="mt-8 flex-row items-center space-x-2">
          <View className="flex-1">
            <TouchableOpacity
              className="h-10 w-full items-center justify-center border-2 border-crossed-blue-400 bg-neutral-100"
              onPress={() => {
                router.push("/home");
              }}
            >
              <Text style={{ fontFamily: "bitterBold" }}>Go Home</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View className="mt-4">
          <ShareAppButton />
        </View>
      </ScrollView>
    </Animated.View>
  );
};
