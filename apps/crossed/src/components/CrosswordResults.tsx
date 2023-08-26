import { Image } from "expo-image";
import { ScrollView, Text, View } from "react-native";
import { images } from "../lib/images";
import { useRouter } from "expo-router";
import { calculateScore, useGame } from "../hooks/use-game";
import { classNames } from "../lib/utils";
import { ShareAppButton } from "./ShareAppButton";
import { useMyProfile } from "../hooks/use-my-profile";
import { NewGameButtons } from "./NewGameButtons";
import { Button } from "./Button";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { mobileConfig } from "../mobile-config";
import { useSubscriptionInfo } from "../hooks/use-subscription-info";

export const FriendlyGameResult = ({ gameId }: { gameId: string }) => {
  const router = useRouter();
  const { myProfile } = useMyProfile();
  const { currentSubscription } = useSubscriptionInfo();
  const { game, opponentUsername } = useGame({ gameId });
  if (!myProfile || !game) {
    return null;
  }
  const myPoints =
    game.scores.find((s) => s.profilesId === myProfile.id)?.score || 0;
  const opponent = game.players.find((p) => p.id !== myProfile.id);
  const opponentUid = opponent?.id as string;
  const opponentPoints =
    game.scores.find((s) => s.profilesId === opponent?.id)?.score || 0;

  const result =
    myPoints === 100
      ? "PERFECT_SCORE"
      : myPoints > opponentPoints
      ? "WON"
      : "LOST";

  return (
    <ScrollView
      className="flex-1 px-5 bg-white"
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 60 }}
    >
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
          <Text
            className={classNames(
              "text-center text-3xl",
              result === "PERFECT_SCORE" ? "text-crossed-green-700" : "",
              result === "WON" ? "text-crossed-yellow-400" : "",
              result === "LOST" ? "text-crossed-red-400" : ""
            )}
            style={{ fontFamily: "bitterBold" }}
          >
            My Rating: {myProfile.eloRating}
          </Text>
          <Text
            className={classNames(
              "text-center text-3xl",
              result === "PERFECT_SCORE" ? "text-crossed-green-700" : "",
              result === "WON" ? "text-crossed-yellow-400" : "",
              result === "LOST" ? "text-crossed-red-400" : ""
            )}
            style={{ fontFamily: "bitterBold" }}
          >
            {opponent?.username} Rating: {opponent?.eloRating}
          </Text>
        </View>
      </View>
      <Text
        className="mt-5 text-center text-3xl"
        style={{ fontFamily: "bitterBold" }}
      >
        Checkout the Answers
      </Text>
      <View className="mt-4 flex-row items-center space-x-2">
        <View className="flex-1">
          <Button
            intent={"primary"}
            size={"medium"}
            label={`@${myProfile.username}`}
            onPress={() => {
              router.push(
                `/view-answers?gameId=${gameId}&playerId=${myProfile.id}`
              );
            }}
          />
        </View>
        <View className="flex-1">
          <Button
            intent={"primary"}
            size={"medium"}
            label={`@${opponentUsername}`}
            onPress={() => {
              router.push(
                `/view-answers?gameId=${gameId}&playerId=${opponentUid}`
              );
            }}
          />
        </View>
      </View>
      <View className="mt-4">
        <Button
          intent={"secondary"}
          size={"medium"}
          label="View Crossword Answers"
          onPress={() => router.push(`/view-answers?gameId=${gameId}`)}
        />
      </View>
      <View className="mt-4">
        <Button
          intent={"primary"}
          size={"medium"}
          label="Leave us feedback"
          onPress={() => router.push("/feedback")}
        />
      </View>
      {!currentSubscription && (
        <View className="mt-6 -mx-4">
          <BannerAd
            unitId={mobileConfig.resultsScreenAdId}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          />
        </View>
      )}
      <Text
        className="mt-6 text-xl font-bold"
        style={{ fontFamily: "bitterBold" }}
      >
        Start a New Match
      </Text>
      <View className="mt-2.5">
        <NewGameButtons />
      </View>
      <View className="mt-6">
        <Button
          intent={"secondary"}
          size={"medium"}
          label="Go Home"
          onPress={() => router.push(`/home`)}
        />
      </View>
      <View className="mt-4">
        <ShareAppButton />
      </View>
    </ScrollView>
  );
};

export const SoloGameResult = ({ gameId }: { gameId: string }) => {
  const router = useRouter();
  const { myProfile } = useMyProfile();
  const { currentSubscription } = useSubscriptionInfo();
  const { game } = useGame({ gameId });
  if (!myProfile || !game) {
    return null;
  }
  const solution = game.gameState?.[myProfile.id].solution;
  const correctSolution = game.crossword.solution;
  const points = calculateScore({ solution, correctSolution });
  const result = points === 100 ? "PERFECT_SCORE" : points > 0 ? "WON" : "LOST";
  return (
    <View className="h-full w-full bg-white">
      {!currentSubscription && (
        <View className="mt-6">
          <BannerAd
            unitId={mobileConfig.resultsScreenAdId}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          />
        </View>
      )}
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 12 }}
      >
        <Text className="text-center font-[jost700] text-[28px]">
          {result === "PERFECT_SCORE"
            ? "You aced it!"
            : "Better Luck Next Time"}
        </Text>
        <View className="mt-3 items-center">
          <Image source={images.results_win} className="w-[259px] h-[166px]" />
          <Text
            className={classNames("text-center text-3xl mt-3.5 font-[jost600]")}
            style={{ fontFamily: "bitterBold" }}
          >
            You get {points} Points
          </Text>
        </View>
        <Text className="mt-4 text-center text-[28px] font-[jost800] text-crossed-yellow-300">
          Checkout the Answers
        </Text>
        <View className="mt-5">
          <Button
            intent={"primary"}
            size={"xl"}
            label="View Crossword Answers"
            rounded={"full"}
            onPress={() => {
              router.push(`/view-answers?gameId=${gameId}`);
            }}
          />
        </View>
        <View className="mt-5">
          <Button
            intent={"primary"}
            size={"xl"}
            label="Leave us feedback"
            rounded={"full"}
            mode={"outline"}
            onPress={() => {
              router.push(`/feedback`);
            }}
          />
        </View>
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
        <View className="mt-8">
          <Button
            intent={"primary"}
            size={"xl"}
            label="Go Home"
            rounded={"full"}
            mode={"outline"}
            onPress={() => {
              router.push(`/home`);
            }}
          />
        </View>
        <View className="mt-8">
          <ShareAppButton />
        </View>
      </ScrollView>
    </View>
  );
};
