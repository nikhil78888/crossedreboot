import { useOnlineStatus } from "../hooks/use-online-status";
import { useRankedGame } from "../hooks/use-ranked-game";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import colors from "../lib/colors";
import { Button } from "../components/Button";
import { useGame } from "../hooks/use-game";
import { differenceInSeconds, isAfter } from "date-fns";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { mobileConfig } from "../mobile-config";
import { useSubscriptionInfo } from "../hooks/use-subscription-info";

export default function RankedLobby() {
  const router = useRouter();
  useOnlineStatus();
  const { gameId, startRankedGame } = useRankedGame();
  const { currentSubscription } = useSubscriptionInfo();
  const { game } = useGame({ gameId });
  const [secondsToStart, setSecondsToStart] = useState(0);

  useEffect(() => {
    startRankedGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gameStartingAt = game?.startedAt;
  const playState = game?.playState;

  useEffect(() => {
    if (playState !== "COMPLETED" && gameStartingAt) {
      const interval = setInterval(() => {
        if (isAfter(new Date(`${gameStartingAt}Z`), new Date())) {
          setSecondsToStart(
            differenceInSeconds(new Date(`${gameStartingAt}Z`), new Date())
          );
        } else {
          router.replace(`/game?gameId=${gameId}`);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameId, gameStartingAt, playState, router]);

  return (
    <View className="flex-1 bg-white px-4">
      <View className="mt-4 rounded-sm border border-crossed-green-100 bg-crossed-green-50 p-8 shadow-sm">
        <Text className="text-center font-[bitterBold] text-3xl text-crossed-green-900">
          Play Ranked Match
        </Text>
        <Text className="mt-7 text-center font-[latoLight] text-xl">
          We are finding the best player for you to compete with.
        </Text>
        {game ? (
          <View className="mt-8 items-center">
            <Text>Match starting in {secondsToStart} seconds...</Text>
          </View>
        ) : (
          <View className="mt-8 items-center">
            <ActivityIndicator
              size={"large"}
              color={colors["crossed-green"]["900"]}
            />
            <View className="mt-7">
              <Button
                label="Go Back"
                intent={"secondary"}
                size={"medium"}
                onPress={router.back}
              />
            </View>
          </View>
        )}
      </View>
      {!currentSubscription && (
        <View className="mt-12 -mx-4">
          <BannerAd
            unitId={mobileConfig.inviteFriendScreenAdId}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          />
        </View>
      )}
    </View>
  );
}
