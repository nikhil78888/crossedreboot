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
  const [onAdClose, setOnAdClose] = useState<"SOLO" | "FRIENDLY" | "">("");
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

  useEffect(() => {
    if (isClosed) {
      switch (onAdClose) {
        case "SOLO":
          playSolo();
          break;
        case "FRIENDLY":
          playFriendly();
          break;
        default:
          break;
      }
    }
  }, [isClosed, onAdClose, playFriendly, playSolo]);

  return (
    <View className="flex-row items-center space-x-2">
      <View className="flex-1">
        <TouchableOpacity
          onPress={() => {
            router.push("/ranked-lobby");
          }}
          className="h-[130] w-full max-w-[121] bg-crossed-green-50"
        >
          <Image
            source={images.card_ellipsis}
            className="absolute bottom-0 right-0 aspect-square w-3/5"
          />
          <Text className="ml-2.5 mt-2.5 font-[latoLight] text-xl text-crossed-black-700">
            Play{"\n"}Ranked
          </Text>
          <Image
            source={images.ranked}
            className="absolute bottom-2 right-1 aspect-square h-10"
          />
        </TouchableOpacity>
      </View>
      <View className="flex-1">
        <TouchableOpacity
          onPress={() => {
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
          className="h-[130] w-full max-w-[121] bg-crossed-green-50"
        >
          <Image
            source={images.card_ellipsis}
            className="absolute bottom-0 right-0 aspect-square w-3/5"
          />
          <Text className="ml-2.5 mt-2.5 font-[latoLight] text-xl text-crossed-black-700">
            With{"\n"}Your{"\n"}Friend
          </Text>
          <Image
            source={images.friend}
            className="absolute bottom-2 right-1 h-[35] w-[50.83]"
          />
        </TouchableOpacity>
      </View>
      <View className="flex-1">
        <TouchableOpacity
          onPress={() => {
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
          className="h-[130] w-full max-w-[121] bg-crossed-green-50"
        >
          <Image
            source={images.card_ellipsis}
            className="absolute bottom-0 right-0 aspect-square w-3/5"
          />
          <Text className="ml-2.5 mt-2.5 font-[latoLight] text-xl text-crossed-black-700">
            Practice{"\n"}Mode
          </Text>
          <Image
            source={images.solo}
            className="absolute bottom-2 right-2 h-10 w-9"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};
