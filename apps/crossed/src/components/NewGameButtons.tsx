import { Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Image } from "expo-image";
import { images } from "../lib/images";
import { useRouter } from "expo-router";
import { useGame } from "../hooks/use-game";
import { useStats } from "../hooks/use-stats";
import { useSubscriptionInfo } from "../hooks/use-subscription-info";
import { useInterstitialAd } from "react-native-google-mobile-ads";
import { useCallback, useEffect, useState } from "react";
import { mobileConfig } from "../mobile-config";
import { events, trackEvent } from "../lib/track-event";

export const NewGameButtons = () => {
  const { currentSubscription } = useSubscriptionInfo();
  const { stats } = useStats();
  const router = useRouter();
  const { isLoaded, isClosed, load, show } = useInterstitialAd(
    mobileConfig.interstitialAdId,
    {
      requestNonPersonalizedAdsOnly: true,
    }
  );
  const [onAdClose, setOnAdClose] = useState<
    "SOLO" | "FRIENDLY" | "RANKED" | ""
  >("");
  const { createFriendlyGame, createSoloGame } = useGame({ gameId: undefined });

  useEffect(() => {
    load();
  }, [load]);

  const playSolo = useCallback(async () => {
    setOnAdClose("");
    const gameId = await createSoloGame();
    router.push(`/game?gameId=${gameId}`);
  }, [createSoloGame, router]);

  const playFriendly = useCallback(async () => {
    setOnAdClose("");
    const gameId = await createFriendlyGame();
    router.push(`/invite-friend?gameId=${gameId}`);
  }, [createFriendlyGame, router]);

  const playRanked = useCallback(() => {
    setOnAdClose("");
    router.push("/ranked-lobby");
  }, [router]);

  useEffect(() => {
    if (isClosed) {
      switch (onAdClose) {
        case "SOLO":
          playSolo();
          break;
        case "FRIENDLY":
          playFriendly();
          break;
        case "RANKED":
          playRanked();
          break;
        default:
          break;
      }
    }
  }, [isClosed, onAdClose, playFriendly, playRanked, playSolo]);

  return (
    <View>
      <TouchableOpacity
        onPress={() => {
          trackEvent(events.START_RANKED_GAME_CLICK);
          if (
            !currentSubscription &&
            stats?.gamesPlayedToday &&
            stats?.gamesPlayedToday > 4 &&
            isLoaded
          ) {
            setOnAdClose("RANKED");
            show();
          } else {
            playRanked();
          }
        }}
        className="bg-crossed-blue-50 h-[175px] rounded-2xl shadow-md"
      >
        <View className="flex-row items-center">
          <Image
            source={images.play_ranked}
            className="h-[119px] w-[126px] ml-[25] my-6"
          />
          <Text className="ml-7 font-[jost600] text-[26px]">Play Ranked</Text>
        </View>
      </TouchableOpacity>
      <View className="flex-row space-x-4 mt-3">
        <View className="flex-1">
          <TouchableOpacity
            onPress={() => {
              trackEvent(events.START_FRIENDLY_GAME_CLICK);
              if (
                !currentSubscription &&
                stats?.gamesPlayedToday &&
                stats?.gamesPlayedToday > 4 &&
                isLoaded
              ) {
                setOnAdClose("FRIENDLY");
                show();
              } else {
                playFriendly();
              }
            }}
            className="bg-crossed-blue-50 h-[175px] w-full rounded-2xl shadow-md items-center"
          >
            <Image
              source={images.play_friendly}
              className="h-[94px] w-[94px] mt-[35px]"
            />
            <Text className="mt-2 font-[jost600] text-base">
              With Your Friend
            </Text>
          </TouchableOpacity>
        </View>
        <View className="flex-1">
          <TouchableOpacity
            onPress={() => {
              trackEvent(events.START_SOLO_GAME_CLICK);
              if (
                !currentSubscription &&
                stats?.gamesPlayedToday &&
                stats?.gamesPlayedToday > 4 &&
                isLoaded
              ) {
                setOnAdClose("SOLO");
                show();
              } else {
                playSolo();
              }
            }}
            className="bg-crossed-blue-50 h-[175px] w-full rounded-2xl shadow-md items-center"
          >
            <Image
              source={images.play_solo}
              className="h-[100px] w-[100px] mt-[25px]"
              contentFit="contain"
            />
            <Text className="mt-2 font-[jost600] text-base">Practice Mode</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
