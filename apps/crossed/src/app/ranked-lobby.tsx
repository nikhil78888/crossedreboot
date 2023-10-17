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
import { avatars } from "../lib/images";
import { useMyProfile } from "../hooks/use-my-profile";
import { Avatar } from "react-native-ui-lib";
import { WaitingSpinner } from "../components/WaitingSpinner";

export default function RankedLobby() {
  const router = useRouter();
  const { myProfile } = useMyProfile();
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

  if (!myProfile) {
    return null;
  }

  const friendlyAvatar = Object.keys(avatars).find(
    (a) => myProfile.avatar !== a
  ) as keyof typeof avatars;

  return (
    <View className="flex-1 bg-white items-center">
      <Text className="mt-7 font-[jost600] text-base text-center">
        We are finding the best player for {"\n"} you to compete with.
      </Text>
      <View className="flex-row items-center">
        <Avatar
          size={60}
          name={myProfile.name || myProfile.username.charAt(0)}
          source={avatars[myProfile.avatar as keyof typeof avatars]}
          imageStyle={{ backgroundColor: "white" }}
        />
        <View
          className="mt-1 h-[180px] w-[180px] border-black/20 rounded-full items-center justify-center"
          style={{ borderWidth: StyleSheet.hairlineWidth }}
        >
          <View className="p-5 bg-gray-100 rounded-full">
            <Text className="font-[jost700] text-[32px]">VS</Text>
          </View>
        </View>
        <Avatar
          size={60}
          source={avatars[friendlyAvatar]}
          imageStyle={{ backgroundColor: "white" }}
        />
      </View>
      <View className="mt-8">
        {secondsToStart > 0 ? (
          <Text className="text-sm font-[jost600]">
            Match starting in {secondsToStart} seconds...
          </Text>
        ) : (
          <View className="flex-row items-center">
            <WaitingSpinner />
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
          size={"lg"}
          onPress={() => {
            trackEvent(events.LEAVE_LOBBY_CLICK);
            router.back();
          }}
        />
      </View>
    </View>
  );
}
