import { ActivityIndicator, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { useEffect } from "react";
import { ShareAppButton } from "../../components/ShareAppButton";
import { useCurrentGame } from "../../hooks/use-current-game";
import { useGame } from "../../hooks/use-game";
import { Button } from "../../components/Button";
import { NewGameButtons } from "../../components/NewGameButtons";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { mobileConfig } from "../../mobile-config";
import { ScrollView } from "react-native-gesture-handler";
import { useSubscriptionInfo } from "../../hooks/use-subscription-info";
import { events, trackEvent } from "../../lib/track-event";

export default function Home() {
  const { currentGameId, loadingCurrentGameId } = useCurrentGame();
  const { game } = useGame({
    gameId: currentGameId,
  });
  const router = useRouter();
  const navigation = useNavigation();
  const { showAds } = useSubscriptionInfo();

  const gamePlayState = game?.playState;

  useEffect(() => {
    if (navigation.isFocused()) {
      // if game exists, redirect to correct game screen
      switch (gamePlayState) {
        case "PLAYING":
          router.push(`/game?gameId=${currentGameId}`);
          break;
        // case "COMPLETED":
        //   router.push(`/game-results?gameId=${currentGameId}`);
        //   break;
        case "WAITING_FOR_OPPONENT":
          router.push(`/invite-friend?gameId=${currentGameId}`);
          break;
        default:
          break;
      }
    }
  }, [currentGameId, gamePlayState, router, navigation]);

  if (loadingCurrentGameId) {
    return (
      <View className="flex-1 items-center justify-center px-4 bg-white">
        <ActivityIndicator />
      </View>
    );
  }

  if (currentGameId && !game) {
    return (
      <View className="flex-1 items-center justify-center px-4 bg-white">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {showAds && (
        <View className="mt-6">
          <BannerAd
            unitId={mobileConfig.homeScreenAdId}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          />
        </View>
      )}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        className="flex-1 bg-white px-4"
      >
        {/* <View className="mt-3 flex-row">
          <View>
            <View className="absolute bottom-0 inset-x-0 h-3.5 bg-crossed-yellow-200" />
            <Text className="font-[jost600] text-xl text-cr-gray-800">
              Start a New Match!
            </Text>
          </View>
        </View> */}
        <View className="mt-2">
          <NewGameButtons />
        </View>
        <View className="mt-5 w-full">
          <ShareAppButton />
        </View>
        <View className="mt-5">
          <Button
            intent={"secondary"}
            label="Feedback"
            size={"base"}
            onPress={() => router.push("/feedback")}
          />
        </View>
        {showAds && (
          <View className="mt-5">
            <Button
              intent={"secondary"}
              label="Remove Ads"
              size={"base"}
              onPress={() => {
                trackEvent(events.FEEDBACK_CLICK);
                router.push("/upgrade-to-pro");
              }}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
