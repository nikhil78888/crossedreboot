import { useOnlineStatus } from "../hooks/use-online-status";
import { useRankedGame } from "../hooks/use-ranked-game";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../components/Button";
import { useGame } from "../hooks/use-game";
import { differenceInSeconds, isAfter } from "date-fns";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { mobileConfig } from "../mobile-config";
import { useSubscriptionInfo } from "../hooks/use-subscription-info";
import { events, trackEvent } from "../lib/track-event";
import { Image } from "expo-image";
import { images } from "../lib/images";

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
      trackEvent(events.RANKED_MATCH_OPPONENT_FOUND);
      const interval = setInterval(() => {
        if (isAfter(new Date(`${gameStartingAt}Z`), new Date())) {
          const secToStart = differenceInSeconds(
            new Date(`${gameStartingAt}Z`),
            new Date()
          );
          if (secToStart < 6) {
            setSecondsToStart(secToStart);
          }
        } else {
          router.replace(`/game?gameId=${gameId}`);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameId, gameStartingAt, playState, router]);

  return (
    <View className="flex-1 bg-white items-center">
      <Text className="mt-7 font-[jost600] text-base text-center">
        We are finding the best player for {"\n"} you to compete with.
      </Text>
      <View className="flex-row items-center">
        <Image source={images.avatar_dude} className="h-[60px] w-[60px]" />
        <View
          className="mt-1 h-[180px] w-[180px] border-black/20 rounded-full items-center justify-center"
          style={{ borderWidth: StyleSheet.hairlineWidth }}
        >
          <View className="p-5 bg-gray-100 rounded-full">
            <Text className="font-[jost700] text-[32px]">VS</Text>
          </View>
        </View>
        <Image source={images.avatar_dude} className="h-[60px] w-[60px]" />
      </View>
      <View className="mt-8">
        {secondsToStart > 0 ? (
          <Text className="text-sm font-[jost600]">
            Match starting in {secondsToStart} seconds...
          </Text>
        ) : (
          <View className="flex-row items-center">
            <Image source={images.finding} className="h-5 w-5" />
            <Text className="ml-2 text-sm font-[jost600]">
              finding player...
            </Text>
          </View>
        )}
      </View>
      {!currentSubscription && (
        <View className="mt-24 w-full">
          <BannerAd
            unitId={mobileConfig.inviteFriendScreenAdId}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          />
        </View>
      )}
      <View className="absolute bottom-8 inset-x-4">
        <Button
          label="Go back home"
          intent={"secondary"}
          size={"medium"}
          onPress={() => {
            trackEvent(events.LEAVE_LOBBY_CLICK);
            router.back();
          }}
        />
      </View>
    </View>
  );
}
